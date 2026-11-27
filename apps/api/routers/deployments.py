"""Deployment management REST endpoints (Issues #11, #13).

CRUD, lifecycle control, and real-time health monitoring for container deployments.
"""

from typing import Any

import httpx
from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.core.models.audit import AuditAction
from packages.core.models.deployment import DeploymentStatus
from packages.core.models.user import User
from packages.core.schemas.deployment import (
    DeploymentCreate,
    DeploymentFeedbackCreate,
    DeploymentListResponse,
    DeploymentMetricResponse,
    DeploymentResponse,
)
from packages.core.security.audit import AuditService
from packages.core.security.dependencies import get_current_user, require_permission
from packages.core.security.rbac import Permission
from packages.deployment.server.schemas import PredictionRequest
from packages.deployment.service import DeploymentService
from packages.deployment.serving_auth import serving_headers

router = APIRouter(prefix="/api/v1/deployments", tags=["Deployments"])


def _get_service(session: AsyncSession = Depends(get_db)) -> DeploymentService:
    return DeploymentService(session)


@router.post(
    "/",
    response_model=DeploymentResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_permission(Permission.DEPLOYMENT_CREATE))],
)
async def create_deployment(
    payload: DeploymentCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: DeploymentService = Depends(_get_service),
) -> Any:
    """Deploy a registered model version into an isolated inference container."""
    try:
        deployment = await service.deploy_model(
            model_name=payload.model_name,
            model_version=payload.model_version,
            requested_port=payload.port,
            project_id=payload.project_id,
            config=payload.config,
        )
    except ValueError as exc:
        raise HTTPException(422, str(exc)) from exc

    audit = AuditService(session=db)
    await audit.log(
        action=AuditAction.DEPLOYMENT_CREATE,
        resource_type="deployment",
        resource_id=deployment.id,
        resource_name=f"{payload.model_name}:v{payload.model_version}",
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else None,
        changes={
            "model_name": payload.model_name,
            "model_version": payload.model_version,
            "port": deployment.port,
        },
    )

    return deployment


@router.get("/", response_model=DeploymentListResponse)
async def list_deployments(
    project_id: str | None = Query(None, description="Filter by project ID"),
    status: DeploymentStatus | None = Query(None, description="Filter by status"),
    service: DeploymentService = Depends(_get_service),
) -> Any:
    """List all deployed model containers."""
    deployments = await service.list_deployments(project_id=project_id, status=status)
    return {
        "deployments": deployments,
        "total": len(deployments),
    }


@router.get("/{deployment_id}", response_model=DeploymentResponse)
async def get_deployment(
    deployment_id: str,
    service: DeploymentService = Depends(_get_service),
) -> Any:
    """Get metadata and current status of a specific deployment."""
    deployment = await service.get_deployment(deployment_id)
    if deployment is None:
        raise NotFoundError("Deployment", deployment_id)
    return deployment


@router.post(
    "/{deployment_id}/stop",
    response_model=DeploymentResponse,
    dependencies=[Depends(require_permission(Permission.DEPLOYMENT_STOP))],
)
async def stop_deployment(
    deployment_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: DeploymentService = Depends(_get_service),
) -> Any:
    """Halt and remove the deployment container, releasing its allocated port."""
    deployment = await service.stop_deployment(deployment_id)
    if deployment is None:
        raise NotFoundError("Deployment", deployment_id)

    audit = AuditService(session=db)
    await audit.log(
        action=AuditAction.DEPLOYMENT_STOP,
        resource_type="deployment",
        resource_id=deployment.id,
        resource_name=f"{deployment.model_name}:v{deployment.model_version}",
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else None,
        changes={"status": "STOPPED"},
    )

    return deployment


@router.get("/{deployment_id}/health")
async def check_deployment_health(
    deployment_id: str,
    service: DeploymentService = Depends(_get_service),
) -> dict[str, Any]:
    """Probe the live health endpoint of the deployed container."""
    deployment = await service.get_deployment(deployment_id)
    if deployment is None:
        raise NotFoundError("Deployment", deployment_id)

    if deployment.status != DeploymentStatus.RUNNING:
        return {
            "deployment_id": deployment_id,
            "status": deployment.status.value,
            "healthy": False,
            "detail": f"Container status is {deployment.status.value}",
        }

    # Attempt HTTP probe: try endpoint_url, and if in Docker container fallback to host.docker.internal or container name
    urls_to_try = [f"{deployment.endpoint_url}/health"]
    if deployment.container_id:
        # If in docker, localhost:port refers to the api container itself; try container port 8000 directly via container name or host.docker.internal
        urls_to_try.append(f"http://host.docker.internal:{deployment.port}/health")
        try:
            c_name = f"mlite-{deployment.model_name}-v{deployment.model_version}-{deployment.port}"
            urls_to_try.append(f"http://{c_name}:8000/health")
        except Exception:
            pass

    last_error = None
    for health_url in urls_to_try:
        try:
            async with httpx.AsyncClient(timeout=2.0) as client:
                resp = await client.get(health_url)
                return {
                    "deployment_id": deployment_id,
                    "status": "healthy" if resp.status_code == 200 else "degraded",
                    "healthy": resp.status_code == 200,
                    "http_status": resp.status_code,
                    "response": resp.json()
                    if resp.headers.get("content-type", "").startswith("application/json")
                    else resp.text,
                }
        except Exception as exc:
            last_error = exc

    return {
        "deployment_id": deployment_id,
        "status": "unreachable",
        "healthy": False,
        "error": str(last_error),
    }


@router.get("/{deployment_id}/metrics", response_model=list[DeploymentMetricResponse])
async def get_deployment_metrics(
    deployment_id: str,
    limit: int = Query(50, ge=1, le=500),
    service: DeploymentService = Depends(_get_service),
) -> Any:
    """Fetch historical CPU, memory, and latency metrics for the deployment."""
    deployment = await service.get_deployment(deployment_id)
    if deployment is None:
        raise NotFoundError("Deployment", deployment_id)

    metrics = await service.get_metrics(deployment_id, limit=limit)
    return metrics


async def _proxy_inference(deployment_id, service, path, payload=None):
    deployment = await service.get_deployment(deployment_id)
    if deployment is None:
        raise NotFoundError("Deployment", deployment_id)
    if deployment.status != DeploymentStatus.RUNNING:
        raise HTTPException(409, "This deployment is not running.")
    name = f"mlite-{deployment.model_name}-v{deployment.model_version}-{deployment.port}"
    try:
        async with httpx.AsyncClient(timeout=30) as client:
            response = await client.request(
                "POST" if payload is not None else "GET", f"http://{name}:8000/{path}",
                json=payload, headers=serving_headers(deployment.config),
            )
        from fastapi.responses import JSONResponse
        return JSONResponse(response.json(), status_code=response.status_code)
    except (httpx.HTTPError, ValueError) as exc:
        raise HTTPException(502, "The inference container could not be reached.") from exc


@router.post("/{deployment_id}/predict")
async def predict_owned_deployment(deployment_id: str, payload: PredictionRequest,
                                   service: DeploymentService = Depends(_get_service)):
    return await _proxy_inference(deployment_id, service, "predict", payload.model_dump(exclude_none=True))


@router.get("/{deployment_id}/metadata")
async def owned_deployment_metadata(deployment_id: str, service: DeploymentService = Depends(_get_service)):
    return await _proxy_inference(deployment_id, service, "metadata")


@router.get("/{deployment_id}/ready")
async def owned_deployment_readiness(deployment_id: str, service: DeploymentService = Depends(_get_service)):
    return await _proxy_inference(deployment_id, service, "ready")


@router.post("/{deployment_id}/feedback", status_code=status.HTTP_201_CREATED)
async def ingest_prediction_feedback(
    deployment_id: str,
    payload: DeploymentFeedbackCreate,
    db: AsyncSession = Depends(get_db),
    service: DeploymentService = Depends(_get_service),
) -> dict[str, Any]:
    """Ingest delayed ground-truth feedback for a prediction (Issue #20)."""
    from packages.monitoring.model_monitor import ModelPerformanceMonitor

    deployment = await service.get_deployment(deployment_id)
    if deployment is None:
        raise NotFoundError("Deployment", deployment_id)

    monitor = ModelPerformanceMonitor(session=db)
    feedback = await monitor.ingest_feedback(
        deployment_id=deployment_id,
        prediction_id=payload.prediction_id,
        ground_truth=payload.ground_truth,
        predicted_value=payload.predicted_value,
        latency_ms=payload.latency_ms,
    )
    # Persist measured performance once enough real labelled predictions exist.
    # Previously feedback was stored but never reached the dashboard's history.
    from packages.core.models.monitoring import PredictionFeedback
    from packages.registry.service import ModelRegistryService

    history = (await db.execute(select(PredictionFeedback).where(
        PredictionFeedback.deployment_id == deployment_id,
    ).order_by(PredictionFeedback.created_at.desc()).limit(1000))).scalars().all()
    pairs = [item for item in history if item.ground_truth is not None and item.predicted_value is not None]
    if len(pairs) >= 5:
        registered = await ModelRegistryService(db).get_version(deployment.model_name, deployment.model_version)
        baseline = dict(registered.metrics or {}) if registered else {}
        if "f1_score" in baseline and "f1" not in baseline:
            baseline["f1"] = baseline["f1_score"]
        try:
            task_type = monitor.resolve_task_type((deployment.config or {}).get("task_type"), baseline)
            await monitor.record_performance_snapshot(
                model_name=deployment.model_name, deployment_id=deployment_id,
                task_type=task_type,
                y_true=[item.ground_truth for item in pairs],
                y_pred=[item.predicted_value for item in pairs], baseline_metrics=baseline,
            )
        except (ValueError, TypeError) as exc:
            raise HTTPException(422, "Feedback labels are incompatible with this model's task and existing labels.") from exc
    return {
        "id": feedback.id,
        "deployment_id": deployment_id,
        "prediction_id": feedback.prediction_id,
        "status": "ingested",
    }
