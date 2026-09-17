"""Model Registry API endpoints (Issue #10).

CRUD for registered models, version management, stage promotion, and comparison.
"""

from typing import Any

from fastapi import APIRouter, Depends, Query, status
from pydantic import BaseModel, Field
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.registry.service import ModelRegistryService

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


# ── Dependency ──────────────────────────────────────────────


def _get_service(session: AsyncSession = Depends(get_db)) -> ModelRegistryService:
    return ModelRegistryService(session)


# ── Endpoints ───────────────────────────────────────────────


@router.post("/register", status_code=status.HTTP_201_CREATED)
async def register_model(
    data: ModelRegisterRequest,
    service: ModelRegistryService = Depends(_get_service),
) -> dict[str, Any]:
    """Register a new model or create a new version from an MLflow run."""
    version = await service.register_model(
        name=data.name,
        run_id=data.run_id,
        description=data.description,
        metrics=data.metrics,
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
    models = await service.list_models()
    result = []
    for m in models:
        # Get latest version info
        versions = await service.get_versions(m.name)
        for v in versions:
            if stage and v.stage.value != stage.upper():
                continue
            result.append({
                "name": m.name,
                "version": v.version,
                "stage": v.stage.value,
                "metrics": v.metrics,
                "mlflow_run_id": v.mlflow_run_id,
                "created_at": v.created_at.isoformat() if v.created_at else None,
            })
    return {"models": result, "total": len(result)}


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


@router.post("/{name}/versions/{version}/promote")
async def promote_version(
    name: str,
    version: int,
    data: PromoteRequest,
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

    result = await service.promote(name, version, target_stage)
    if result is None:
        raise NotFoundError("Model version", f"{name} v{version}")

    return {
        "model_name": name,
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
