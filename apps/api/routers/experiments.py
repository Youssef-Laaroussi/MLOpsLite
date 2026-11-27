"""Experiment tracking API endpoints (Issue #9).

Proxies and indexes MLflow experiment metadata for the MLite platform.
"""

from datetime import UTC, datetime
from math import isfinite
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.config import Settings
from apps.api.dependencies import get_app_settings, get_db
from apps.api.errors import NotFoundError
from packages.core.models.user import User
from packages.core.models.workspace import WorkspaceExperiment
from packages.core.security.dependencies import get_current_user
from packages.tracking.workspace import authorize_experiment, owned_project, visible_experiments

router = APIRouter(prefix="/api/v1/experiments", tags=["Experiments"])


async def require_experiment_access(
    experiment_id: str,
    settings: Settings = Depends(get_app_settings),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
):
    from packages.tracking.mlflow_client import MLiteMLflowManager
    client = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri).client
    return await authorize_experiment(client, db, user.id, experiment_id)



@router.get("/")
async def list_experiments(
    project: str | None = Query(None, description="Filter by project slug"),
    page: int = Query(1, ge=1),
    page_size: int = Query(50, ge=1, le=100),
    settings: Settings = Depends(get_app_settings),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """List experiments, optionally filtered by project.

    Returns indexed experiment metadata from MLflow tracking server.
    """
    try:
        from packages.tracking.mlflow_client import MLiteMLflowManager

        manager = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri)
        client = manager.client

        visible = await visible_experiments(client, db, user.id, project)
        total = len(visible)
        experiments = visible[(page - 1) * page_size:page * page_size]
        result = []
        for exp, ownership in experiments:
            # Query real runs count for each experiment
            try:
                runs = client.search_runs(experiment_ids=[exp.experiment_id], max_results=100)
                runs_count = len(runs) if not runs.token else None
            except Exception:
                runs_count = None

            # Convert creation_time (ms timestamp) to ISO date
            created_iso = None
            if getattr(exp, "creation_time", None):
                created_iso = datetime.fromtimestamp(exp.creation_time / 1000.0, tz=UTC).isoformat()

            result.append(
                {
                    "experiment_id": exp.experiment_id,
                    "name": ownership.name,
                    "artifact_location": exp.artifact_location,
                    "lifecycle_stage": exp.lifecycle_stage,
                    "tags": dict(exp.tags) if exp.tags else {},
                    "created_at": created_iso,
                    "runs_count": runs_count,
                }
            )

        return {
            "experiments": result,
            "total": total,
            "page": page,
            "page_size": page_size,
        }
    except (HTTPException, NotFoundError):
        raise
    except Exception as e:
        from fastapi import status
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"MLflow tracking server error: {e}",
        )


@router.get("/{experiment_id}/runs", dependencies=[Depends(require_experiment_access)])
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
    except (HTTPException, NotFoundError):
        raise
    except Exception as e:
        from fastapi import status
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"Failed to fetch runs from MLflow: {e}",
        )


@router.get("/{experiment_id}/runs/{run_id}/metric-history", dependencies=[Depends(require_experiment_access)])
def get_run_metric_history(
    experiment_id: str,
    run_id: str,
    metric: str = Query(min_length=1),
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    """Return the latest recorded value at each step for one run metric."""
    from mlflow.exceptions import MlflowException

    from packages.tracking.mlflow_client import MLiteMLflowManager

    try:
        client = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri).client
        run = client.get_run(run_id)
        if run.info.experiment_id != experiment_id:
            raise HTTPException(status_code=404, detail="Run not found in this experiment.")
        records = client.get_metric_history(run_id, metric)
    except MlflowException as exc:
        if exc.error_code == "RESOURCE_DOES_NOT_EXIST":
            raise HTTPException(status_code=404, detail="Run or metric not found.") from exc
        raise HTTPException(status_code=502, detail="Could not load metric history from MLflow.") from exc

    values = {}
    for record in sorted(records, key=lambda item: item.timestamp):
        if isfinite(record.value):
            values[record.step] = record.value
    return {"points": [{"step": step, "value": values[step]} for step in sorted(values)]}


@router.get("/{experiment_id}/runs/{run_id}/artifacts", dependencies=[Depends(require_experiment_access)])
async def list_run_artifacts(
    experiment_id: str,
    run_id: str,
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    """List the root artifacts for a run in the requested experiment."""
    from mlflow.exceptions import MlflowException

    from packages.tracking.mlflow_client import MLiteMLflowManager

    try:
        client = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri).client
        run = client.get_run(run_id)
        if run.info.experiment_id != experiment_id:
            raise HTTPException(status_code=404, detail="Run not found in this experiment.")
        artifacts = client.list_artifacts(run.info.run_id)
    except MlflowException as exc:
        if exc.error_code == "RESOURCE_DOES_NOT_EXIST":
            raise HTTPException(status_code=404, detail="Run not found.") from exc
        raise HTTPException(status_code=502, detail="Could not load run artifacts from MLflow.") from exc

    return {"artifacts": [
        {"path": item.path, "is_dir": item.is_dir, "size": item.file_size}
        for item in artifacts
    ]}


@router.get("/{experiment_id}/runs/{run_id}/artifacts/download", dependencies=[Depends(require_experiment_access)])
def download_run_artifact(
    experiment_id: str,
    run_id: str,
    path: str = Query(min_length=1),
    settings: Settings = Depends(get_app_settings),
):
    """Download a run artifact, packaging directories as ZIP files."""
    import shutil
    import tempfile
    from pathlib import Path, PurePosixPath

    from fastapi.responses import FileResponse
    from mlflow.exceptions import MlflowException
    from starlette.background import BackgroundTask

    from packages.tracking.mlflow_client import MLiteMLflowManager

    artifact_path = PurePosixPath(path)
    if (
        artifact_path.is_absolute() or ".." in artifact_path.parts
        or "\\" in path or artifact_path == PurePosixPath(".")
    ):
        raise HTTPException(status_code=400, detail="Invalid artifact path.")

    workspace = tempfile.mkdtemp(prefix="mlite-artifact-")
    try:
        client = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri).client
        run = client.get_run(run_id)
        if run.info.experiment_id != experiment_id:
            raise HTTPException(status_code=404, detail="Run not found in this experiment.")
        downloaded = Path(client.download_artifacts(run_id, path, workspace)).resolve()
        if (
            downloaded == Path(workspace).resolve()
            or not downloaded.is_relative_to(Path(workspace).resolve())
        ):
            raise HTTPException(status_code=502, detail="Invalid artifact download location.")
        filename = artifact_path.name
        if downloaded.is_dir():
            # Keep the archive outside the downloaded folder to avoid including itself.
            archive = shutil.make_archive(
                str(Path(workspace) / "download"), "zip",
                root_dir=downloaded.parent, base_dir=downloaded.name,
            )
            downloaded = Path(archive)
            filename += ".zip"
        return FileResponse(
            downloaded, filename=filename,
            background=BackgroundTask(shutil.rmtree, workspace, ignore_errors=True),
        )
    except Exception as exc:
        shutil.rmtree(workspace, ignore_errors=True)
        if isinstance(exc, HTTPException):
            raise
        if isinstance(exc, MlflowException) and exc.error_code == "RESOURCE_DOES_NOT_EXIST":
            raise HTTPException(status_code=404, detail="Artifact not found.") from exc
        raise HTTPException(status_code=502, detail="Could not download artifact from MLflow.") from exc


@router.post("/", status_code=201)
async def create_experiment(
    data: dict[str, Any],
    settings: Settings = Depends(get_app_settings),
    db: AsyncSession = Depends(get_db),
    user: User = Depends(get_current_user),
) -> dict[str, Any]:
    """Create a new experiment in MLflow."""
    try:
        from packages.tracking.mlflow_client import MLiteMLflowManager

        name = data.get("name")
        if not name:
            raise HTTPException(status_code=400, detail="Experiment name is required")

        if not isinstance(name, str) or not 1 <= len(name.strip()) <= 200:
            raise HTTPException(422, "Choose an experiment name of 1 to 200 characters.")
        if data.get("artifact_location"):
            raise HTTPException(422, "Artifact locations are managed by this installation.")
        tags = dict(data.get("tags") or {})
        project = await owned_project(db, data.get("project") or tags.get("mlite.project"))
        tags["mlite.owner_id"] = user.id
        if project:
            tags["mlite.project"] = project.slug
        manager = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri)
        experiment_id = manager.get_or_create_experiment(
            experiment_name=f"mlite-{user.id}-{name.strip()}",
            tags=tags,
        )
        record = await db.get(WorkspaceExperiment, str(experiment_id))
        if record is None:
            db.add(WorkspaceExperiment(experiment_id=str(experiment_id), owner_id=user.id,
                                      project_id=project.id if project else None, name=name.strip()))
            await db.flush()
        return {
            "experiment_id": experiment_id,
            "name": name.strip(),
            "status": "created",
        }
    except (HTTPException, NotFoundError):
        raise
    except Exception as e:
        from fastapi import status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to create experiment in MLflow: {e}",
        )


@router.delete("/{experiment_id}", status_code=204, dependencies=[Depends(require_experiment_access)])
async def delete_experiment(
    experiment_id: str,
    settings: Settings = Depends(get_app_settings),
) -> None:
    """Delete an experiment in MLflow."""
    try:
        from packages.tracking.mlflow_client import MLiteMLflowManager

        manager = MLiteMLflowManager(tracking_uri=settings.mlflow_tracking_uri)
        manager.client.delete_experiment(experiment_id)
    except (HTTPException, NotFoundError):
        raise
    except Exception as e:
        from fastapi import status
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Failed to delete experiment in MLflow: {e}",
        )
