"""Experiment tracking API endpoints (Issue #9).

Proxies and indexes MLflow experiment metadata for the MLite platform.
"""

from datetime import UTC, datetime
from typing import Any

from fastapi import APIRouter, Depends, Query

from apps.api.config import Settings
from apps.api.dependencies import get_app_settings

router = APIRouter(prefix="/api/v1/experiments", tags=["Experiments"])


@router.get("/")
async def list_experiments(
    project: str | None = Query(None, description="Filter by project slug"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    """List experiments, optionally filtered by project.

    Returns indexed experiment metadata from MLflow tracking server.
    """
    try:
        from packages.tracking.mlflow_client import MLiteMLflowManager

        manager = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri)
        client = manager.client

        experiments = client.search_experiments(max_results=page_size)
        result = []
        for exp in experiments:
            # Query real runs count for each experiment
            try:
                runs = client.search_runs(experiment_ids=[exp.experiment_id], max_results=100)
                runs_count = len(runs)
            except Exception:
                runs_count = 0

            # Convert creation_time (ms timestamp) to ISO date
            created_iso = None
            if getattr(exp, "creation_time", None):
                created_iso = datetime.fromtimestamp(exp.creation_time / 1000.0, tz=UTC).isoformat()
            else:
                created_iso = datetime.now(UTC).isoformat()

            result.append(
                {
                    "experiment_id": exp.experiment_id,
                    "name": exp.name,
                    "artifact_location": exp.artifact_location,
                    "lifecycle_stage": exp.lifecycle_stage,
                    "tags": dict(exp.tags) if exp.tags else {},
                    "created_at": created_iso,
                    "runs_count": runs_count,
                }
            )

        return {
            "experiments": result,
            "total": len(result),
            "page": page,
            "page_size": page_size,
        }
    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"MLflow tracking server error: {e}",
        )


@router.get("/{experiment_id}/runs")
async def list_runs(
    experiment_id: str,
    max_results: int = Query(50, ge=1, le=500),
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    """List runs for a specific experiment directly from MLflow."""
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
            result.append(
                {
                    "run_id": run.info.run_id,
                    "run_name": run.info.run_name or run.info.run_id[:8],
                    "status": run.info.status,
                    "start_time": run.info.start_time,
                    "end_time": run.info.end_time,
                    "metrics": dict(run.data.metrics) if run.data.metrics else {},
                    "params": dict(run.data.params) if run.data.params else {},
                    "tags": {k: v for k, v in run.data.tags.items() if not k.startswith("mlflow.")} if run.data.tags else {},
                }
            )

        return {"runs": result, "total": len(result)}
    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch runs from MLflow: {e}",
        )


@router.post("/", status_code=201)
async def create_experiment(
    data: dict[str, Any],
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    """Create a new experiment in MLflow."""
    try:
        from packages.tracking.mlflow_client import MLiteMLflowManager
        from fastapi import HTTPException

        name = data.get("name")
        if not name:
            raise HTTPException(status_code=400, detail="Experiment name is required")

        manager = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri)
        experiment_id = manager.get_or_create_experiment(
            experiment_name=name.strip(),
            artifact_location=data.get("artifact_location"),
            tags=data.get("tags"),
        )
        return {
            "experiment_id": experiment_id,
            "name": name.strip(),
            "status": "created",
        }
    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create experiment in MLflow: {e}",
        )


@router.delete("/{experiment_id}", status_code=204)
async def delete_experiment(
    experiment_id: str,
    settings: Settings = Depends(get_app_settings),
) -> None:
    """Delete an experiment in MLflow."""
    try:
        from packages.tracking.mlflow_client import MLiteMLflowManager

        manager = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri)
        manager.client.delete_experiment(experiment_id)
    except Exception as e:
        from fastapi import HTTPException, status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete experiment in MLflow: {e}",
        )
