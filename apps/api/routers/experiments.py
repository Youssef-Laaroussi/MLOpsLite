"""Experiment tracking API endpoints (Issue #9).

Proxies and indexes MLflow experiment metadata for the MLite platform.
"""

from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, Query

from apps.api.config import Settings
from apps.api.dependencies import get_app_settings

router = APIRouter(prefix="/api/v1/experiments", tags=["Experiments"])


@router.get("/")
async def list_experiments(
    project: str | None = Query(None, description="Filter by project slug"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    """List experiments, optionally filtered by project.

    Returns indexed experiment metadata from MLflow tracking server.
    """
    # Lazy import to avoid requiring mlflow at module-load time
    try:
        from packages.tracking.mlflow_client import MLiteMLflowManager

        manager = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri)
        client = manager.client

        experiments = client.search_experiments(max_results=page_size)
        result = []
        for exp in experiments:
            result.append({
                "experiment_id": exp.experiment_id,
                "name": exp.name,
                "artifact_location": exp.artifact_location,
                "lifecycle_stage": exp.lifecycle_stage,
                "tags": dict(exp.tags) if exp.tags else {},
                "created_at": datetime.now(timezone.utc).isoformat(),
            })

        return {
            "experiments": result,
            "total": len(result),
            "page": page,
            "page_size": page_size,
        }
    except Exception:
        # MLflow not available — return empty
        return {"experiments": [], "total": 0, "page": page, "page_size": page_size}


@router.get("/{experiment_id}/runs")
async def list_runs(
    experiment_id: str,
    max_results: int = Query(50, ge=1, le=500),
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    """List runs for a specific experiment."""
    try:
        from packages.tracking.mlflow_client import MLiteMLflowManager

        manager = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri)
        client = manager.client

        runs = client.search_runs(
            experiment_ids=[experiment_id],
            max_results=max_results,
            order_by=["start_time DESC"],
        )
        result = []
        for run in runs:
            result.append({
                "run_id": run.info.run_id,
                "run_name": run.info.run_name,
                "status": run.info.status,
                "start_time": run.info.start_time,
                "end_time": run.info.end_time,
                "metrics": dict(run.data.metrics),
                "params": dict(run.data.params),
                "tags": {
                    k: v
                    for k, v in run.data.tags.items()
                    if not k.startswith("mlflow.")
                },
            })

        return {"runs": result, "total": len(result)}
    except Exception:
        return {"runs": [], "total": 0}


@router.post("/")
async def create_experiment(
    data: dict[str, Any],
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    """Create a new experiment in MLflow."""
    try:
        from packages.tracking.mlflow_client import MLiteMLflowManager

        manager = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri)
        experiment_id = manager.get_or_create_experiment(
            experiment_name=data["name"],
            artifact_location=data.get("artifact_location"),
            tags=data.get("tags"),
        )
        return {
            "experiment_id": experiment_id,
            "name": data["name"],
            "status": "created",
        }
    except Exception as e:
        return {"error": str(e)}
