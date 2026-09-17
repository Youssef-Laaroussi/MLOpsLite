"""Deployment management REST endpoints (Issues #11, #13).

CRUD, lifecycle control, and real-time health monitoring for container deployments.
"""

from typing import Any, Optional

import httpx
from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.core.models.deployment import DeploymentStatus
from packages.core.schemas.deployment import (
    DeploymentCreate,
    DeploymentResponse,
    DeploymentListResponse,
    DeploymentMetricResponse,
)
from packages.deployment.service import DeploymentService

router = APIRouter(prefix="/api/v1/deployments", tags=["Deployments"])


def _get_service(session: AsyncSession = Depends(get_db)) -> DeploymentService:
    return DeploymentService(session)


@router.post("/", response_model=DeploymentResponse, status_code=status.HTTP_201_CREATED)
async def create_deployment(
    payload: DeploymentCreate,
    service: DeploymentService = Depends(_get_service),
) -> Any:
    """Deploy a registered model version into an isolated inference container."""
    deployment = await service.deploy_model(
        model_name=payload.model_name,
        model_version=payload.model_version,
        requested_port=payload.port,
        project_id=payload.project_id,
        config=payload.config,
    )
    return deployment


@router.get("/", response_model=DeploymentListResponse)
async def list_deployments(
    project_id: Optional[str] = Query(None, description="Filter by project ID"),
    status: Optional[DeploymentStatus] = Query(None, description="Filter by status"),
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


@router.post("/{deployment_id}/stop", response_model=DeploymentResponse)
async def stop_deployment(
    deployment_id: str,
    service: DeploymentService = Depends(_get_service),
) -> Any:
    """Halt and remove the deployment container, releasing its allocated port."""
    deployment = await service.stop_deployment(deployment_id)
    if deployment is None:
        raise NotFoundError("Deployment", deployment_id)
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

    # Attempt HTTP probe to container's health endpoint
    health_url = f"{deployment.endpoint_url}/health"
    try:
        async with httpx.AsyncClient(timeout=2.0) as client:
            resp = await client.get(health_url)
            return {
                "deployment_id": deployment_id,
                "status": "healthy" if resp.status_code == 200 else "degraded",
                "healthy": resp.status_code == 200,
                "http_status": resp.status_code,
                "response": resp.json() if resp.headers.get("content-type", "").startswith("application/json") else resp.text,
            }
    except Exception as exc:
        return {
            "deployment_id": deployment_id,
            "status": "unreachable",
            "healthy": False,
            "error": str(exc),
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
