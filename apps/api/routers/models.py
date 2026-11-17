"""Model Registry API endpoints (Issue #10).

CRUD for registered models, version management, stage promotion, and comparison.
"""

import asyncio
import logging
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from pydantic import BaseModel, Field
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.core.models.audit import AuditAction
from packages.core.models.dataset import Dataset, DatasetVersion
from packages.core.models.deployment import Deployment, DeploymentMetric
from packages.core.models.user import User
from packages.core.security.audit import AuditService
from packages.core.security.dependencies import get_current_user, require_permission
from packages.core.security.rbac import Permission
from packages.core.services.project_service import ProjectService
from packages.registry.service import ModelRegistryService, load_run_metrics

logger = logging.getLogger(__name__)
router = APIRouter(prefix="/api/v1/models", tags=["Models"])


# ── Request schemas ─────────────────────────────────────────


class ModelRegisterRequest(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    run_id: str | None = None
    project_slug: str | None = None
    description: str | None = None
    metrics: dict | None = None
    artifact_path: str | None = None


class PromoteRequest(BaseModel):
    stage: str = Field(..., description="Target stage: CANDIDATE, STAGING, PRODUCTION, ARCHIVED")
    version: int | None = Field(
        None, description="Optional target version when promoting by model ID"
    )


# ── Dependency ──────────────────────────────────────────────


def _get_service(session: AsyncSession = Depends(get_db)) -> ModelRegistryService:
    return ModelRegistryService(session)


async def _tracking_metrics(run_id: str) -> dict:
    try:
        return await load_run_metrics(run_id)
    except Exception as exc:
        logger.warning("Could not read MLflow run %s: %s", run_id, type(exc).__name__)
        raise HTTPException(502, "Could not read the run from MLflow. Check the run and retry.") from exc


# ── Endpoints ───────────────────────────────────────────────


async def _project_id(slug: str | None, service: ModelRegistryService) -> str | None:
    if not slug:
        return None
    project = await ProjectService(service.session).get_by_slug_or_id(slug)
    if project is None:
        raise NotFoundError("Project", slug)
    return project.id


@router.post("/register", status_code=status.HTTP_201_CREATED, dependencies=[Depends(require_permission(Permission.MODEL_REGISTER))])
async def register_model(
    data: ModelRegisterRequest,
    service: ModelRegistryService = Depends(_get_service),
) -> dict[str, Any]:
    """Register a new model or create a new version from an MLflow run."""
    metrics = await _tracking_metrics(data.run_id) if data.run_id else {}
    metrics.update(data.metrics or {})
    version = await service.register_model(
        name=data.name,
        run_id=data.run_id,
        project_id=await _project_id(data.project_slug, service),
        description=data.description,
        metrics=metrics,
        artifact_path=data.artifact_path,
    )
    return {
        "id": version.id,
        "model_id": version.model_id,
        "version": version.version,
        "stage": version.stage.value,
        "mlflow_run_id": version.mlflow_run_id,
        "metrics": version.metrics,
    }


@router.get("/")
async def list_models(
    project: str | None = Query(None, description="Filter by project slug"),
    stage: str | None = Query(None, description="Filter by stage"),
    service: ModelRegistryService = Depends(_get_service),
) -> dict[str, Any]:
    """List all registered models."""
    models = await service.list_models(project_id=await _project_id(project, service))
    ranked_samples = (
        select(
            Deployment.model_name,
            Deployment.model_version,
            DeploymentMetric.latency_p95_ms,
            func.row_number().over(
                partition_by=(Deployment.model_name, Deployment.model_version),
                order_by=(DeploymentMetric.timestamp.desc(), DeploymentMetric.id.desc()),
            ).label("rank"),
        )
        .join(DeploymentMetric, DeploymentMetric.deployment_id == Deployment.id)
        .where(DeploymentMetric.requests_count > 0, DeploymentMetric.latency_p95_ms.is_not(None))
        .subquery()
    )
    samples = await service.session.execute(
        select(ranked_samples.c.model_name, ranked_samples.c.model_version, ranked_samples.c.latency_p95_ms)
        .where(ranked_samples.c.rank == 1)
    )
    latest_latency = {(name, version): latency for name, version, latency in samples}
    result = []
    for m in models:
        # Get latest version info
        versions = await service.get_versions(m.name)
        for v in versions:
            if stage and v.stage.value != stage.upper():
                continue
            metrics = dict(v.metrics or {})
            if (m.name, v.version) in latest_latency:
                metrics["p95_latency_ms"] = latest_latency[m.name, v.version]
            result.append(
                {
                    "name": m.name,
                    "version": v.version,
                    "stage": v.stage.value,
                    "metrics": metrics,
                    "mlflow_run_id": v.mlflow_run_id,
                    "created_at": v.created_at.isoformat() if v.created_at else None,
                }
            )
    return {"models": result, "total": len(result)}


@router.post(
    "/{name}/versions/{version}/sync-metrics",
    dependencies=[Depends(require_permission(Permission.MODEL_REGISTER))],
)
async def sync_model_metrics(
    name: str, version: int, service: ModelRegistryService = Depends(_get_service)
) -> dict[str, Any]:
    record = await service.get_version(name, version)
    if record is None or not record.mlflow_run_id:
        raise NotFoundError("Model version with an MLflow run", f"{name} v{version}")
    record.metrics = {**(record.metrics or {}), **await _tracking_metrics(record.mlflow_run_id)}
    await service.session.flush()
    return {"metrics": record.metrics}


@router.get("/{name}/versions/{version}/validation")
async def validate_registered_model(
    name: str, version: int, service: ModelRegistryService = Depends(_get_service)
) -> dict[str, Any]:
    """Inspect the model manifest and declare whether it carries an input signature."""
    from mlflow.models import get_model_info

    from packages.tracking.mlflow_client import configure_mlflow_environment

    record = await service.get_version(name, version)
    if record is None:
        raise NotFoundError("Model version", f"{name} v{version}")
    uri = record.mlflow_model_uri
    if not uri:
        raise HTTPException(422, "This version has no MLflow model artifact.")

    def inspect() -> dict[str, Any]:
        configure_mlflow_environment()
        info = get_model_info(uri)
        return {"artifact_available": True, "signature": info.signature.to_dict() if info.signature else None}

    try:
        return await asyncio.to_thread(inspect)
    except Exception as exc:
        logger.warning("Artifact validation failed for %s v%s: %s", name, version, type(exc).__name__)
        raise HTTPException(422, "Could not read the MLflow model artifact.") from exc


@router.get("/{name}/versions/{version}/lineage")
async def get_model_lineage(
    name: str, version: int, service: ModelRegistryService = Depends(_get_service)
) -> dict[str, Any]:
    """Resolve a registered version's source run and matching uploaded files."""
    from packages.tracking.mlflow_client import MLiteMLflowManager

    record = await service.get_version(name, version)
    if record is None:
        raise NotFoundError("Model version", f"{name} v{version}")

    def read_run() -> tuple[dict, str]:
        client = MLiteMLflowManager().client
        run = client.get_run(record.mlflow_run_id)
        return dict(run.data.tags), run.info.artifact_uri

    def read_artifacts(uri: str) -> list[str]:
        from mlflow.artifacts import list_artifacts

        return [
            entry.path.rsplit("/", 1)[-1]
            for entry in list_artifacts(artifact_uri=uri)
        ]

    tags, files, artifact_root = {}, None, None
    tracking_available = True
    if record.mlflow_run_id:
        try:
            tags, artifact_root = await asyncio.to_thread(read_run)
        except Exception:
            tracking_available = False
            logger.warning("Could not read tags for run %s", record.mlflow_run_id, exc_info=True)
    if tracking_available and record.mlflow_model_uri:
        try:
            uri = record.mlflow_model_uri
            run_prefix = f"runs:/{record.mlflow_run_id}/"
            if artifact_root and uri.startswith(run_prefix):
                uri = f"{artifact_root.rstrip('/')}/{uri.removeprefix(run_prefix)}"
            files = await asyncio.to_thread(read_artifacts, uri)
        except Exception:
            logger.warning("Could not list artifacts for %s v%s", name, version, exc_info=True)

    checksum = tags.get("mlite.dataset.sha256")
    matches = []
    if checksum:
        rows = await service.session.execute(
            select(Dataset.name, DatasetVersion.version_num)
            .join(Dataset, Dataset.id == DatasetVersion.dataset_id)
            .where(DatasetVersion.hash_sha256 == checksum)
        )
        matches = [{"name": dataset, "version": number} for dataset, number in rows]
    return {
        "run_id": record.mlflow_run_id,
        "metrics": record.metrics or {},
        "git_commit": tags.get("mlite.source.git_commit") or tags.get("mlflow.source.git.commit"),
        "dataset_sha256": checksum,
        "matching_datasets": matches,
        "model_artifact_present": "MLmodel" in files if files is not None else None,
        "dependency_files": [file for file in (files or []) if file in {"requirements.txt", "conda.yaml", "python_env.yaml"}],
        "tracking_available": tracking_available,
    }


@router.get("/{name}/versions")
async def list_versions(
    name: str,
    service: ModelRegistryService = Depends(_get_service),
) -> dict[str, Any]:
    """List all versions of a registered model."""
    versions = await service.get_versions(name)
    if not versions:
        model = await service.get_model_by_name(name)
        if model is None:
            raise NotFoundError("Model", name)

    return {
        "model_name": name,
        "versions": [
            {
                "version": v.version,
                "stage": v.stage.value,
                "metrics": v.metrics,
                "mlflow_run_id": v.mlflow_run_id,
                "artifact_path": v.artifact_path,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            }
            for v in versions
        ],
        "total": len(versions),
    }


@router.post(
    "/{name}/versions/{version}/promote",
    dependencies=[Depends(require_permission(Permission.MODEL_PROMOTE))],
)
async def promote_version(
    name: str,
    version: int,
    data: PromoteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: ModelRegistryService = Depends(_get_service),
) -> dict[str, Any]:
    """Promote a model version to a new stage.

    Promoting to PRODUCTION automatically archives the previous production version.
    """
    from packages.core.models.model_registry import ModelStage

    try:
        target_stage = ModelStage(data.stage.upper())
    except ValueError:
        valid = [s.value for s in ModelStage]
        return {"error": f"Invalid stage. Must be one of: {valid}"}

    if target_stage == ModelStage.PRODUCTION:
        validation = await validate_registered_model(name, version, service)
        if not validation["signature"]:
            raise HTTPException(422, "Log the model with an input signature before promoting to Production.")
    result = await service.promote(name, version, target_stage)
    if result is None:
        raise NotFoundError("Model version", f"{name} v{version}")

    # Audit log
    audit = AuditService(session=db)
    await audit.log(
        action=AuditAction.MODEL_PROMOTE,
        resource_type="model",
        resource_id=result.id,
        resource_name=f"{name}:v{version}",
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else None,
        changes={"target_stage": target_stage.value, "version": version},
    )

    return {
        "model_name": name,
        "version": result.version,
        "stage": result.stage.value,
        "promoted": True,
    }


@router.post(
    "/{model_id}/promote",
    dependencies=[Depends(require_permission(Permission.MODEL_PROMOTE))],
)
async def promote_model_by_id(
    model_id: str,
    data: PromoteRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
    service: ModelRegistryService = Depends(_get_service),
) -> dict[str, Any]:
    """Promote a model version by model ID or name."""
    from packages.core.models.model_registry import ModelStage

    model = await service.get_model(model_id)
    if model is None:
        model = await service.get_model_by_name(model_id)
    if model is None:
        raise NotFoundError("Model", model_id)

    target_version_num = data.version
    if target_version_num is None:
        versions = await service.get_versions(model.name)
        if not versions:
            raise NotFoundError("Model version", f"{model.name} has no versions")
        target_version_num = versions[-1].version

    try:
        target_stage = ModelStage(data.stage.upper())
    except ValueError:
        valid = [s.value for s in ModelStage]
        return {"error": f"Invalid stage. Must be one of: {valid}"}

    if target_stage == ModelStage.PRODUCTION:
        validation = await validate_registered_model(model.name, target_version_num, service)
        if not validation["signature"]:
            raise HTTPException(422, "Log the model with an input signature before promoting to Production.")
    result = await service.promote(model.name, target_version_num, target_stage)
    if result is None:
        raise NotFoundError("Model version", f"{model.name} v{target_version_num}")

    audit = AuditService(session=db)
    await audit.log(
        action=AuditAction.MODEL_PROMOTE,
        resource_type="model",
        resource_id=result.id,
        resource_name=f"{model.name}:v{target_version_num}",
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else None,
        changes={"target_stage": target_stage.value, "version": target_version_num},
    )

    return {
        "model_name": model.name,
        "version": result.version,
        "stage": result.stage.value,
        "promoted": True,
    }


@router.get("/compare")
async def compare_models(
    name: str = Query(..., description="Model name"),
    v1: int = Query(..., description="First version"),
    v2: int = Query(..., description="Second version"),
    service: ModelRegistryService = Depends(_get_service),
) -> dict[str, Any]:
    """Compare metrics between two model versions side by side."""
    return await service.compare_versions(name, v1, v2)
