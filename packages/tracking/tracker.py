"""MLite experiment tracking wrapper — context manager and decorator.

Provides a high-level `start_run()` context manager that wraps MLflow
while automatically collecting metadata (Git SHA, Python version, OS, etc.).
"""

import os
import platform
import subprocess
import time
from contextlib import contextmanager
from datetime import datetime, timezone
from pathlib import Path
from typing import Any, Generator

import mlflow
from mlflow.tracking import MlflowClient

from packages.tracking.mlflow_client import configure_mlflow_environment


def _get_git_sha() -> str | None:
    """Get current git commit SHA, or None if not in a git repo."""
    try:
        result = subprocess.run(
            ["git", "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
            timeout=5,
        )
        return result.stdout.strip()
    except Exception:
        return None


def _is_git_dirty() -> bool:
    """Check if the git working tree has uncommitted changes."""
    try:
        result = subprocess.run(
            ["git", "status", "--porcelain"],
            capture_output=True,
            text=True,
            check=True,
            timeout=5,
        )
        return len(result.stdout.strip()) > 0
    except Exception:
        return False


def _collect_environment_metadata() -> dict[str, str]:
    """Collect automatic metadata about the execution environment."""
    meta: dict[str, str] = {
        "python_version": platform.python_version(),
        "os_platform": platform.platform(),
        "os_name": os.name,
        "hostname": platform.node(),
        "mlite_version": "0.1.0",
    }

    git_sha = _get_git_sha()
    if git_sha:
        meta["git_commit"] = git_sha
        meta["git_dirty"] = str(_is_git_dirty())

    return meta


class MLiteRun:
    """Wrapper around an active MLflow run with convenience methods."""

    def __init__(self, run: mlflow.ActiveRun, client: MlflowClient) -> None:
        self._run = run
        self._client = client
        self._start_time = time.monotonic()

    @property
    def run_id(self) -> str:
        return self._run.info.run_id

    @property
    def experiment_id(self) -> str:
        return self._run.info.experiment_id

    def log_param(self, key: str, value: Any) -> None:
        """Log a single parameter."""
        mlflow.log_param(key, value)

    def log_params(self, params: dict[str, Any]) -> None:
        """Log multiple parameters at once."""
        mlflow.log_params(params)

    def log_metric(self, key: str, value: float, step: int | None = None) -> None:
        """Log a single metric, optionally at a specific step."""
        mlflow.log_metric(key, value, step=step)

    def log_metrics(self, metrics: dict[str, float], step: int | None = None) -> None:
        """Log multiple metrics at once."""
        mlflow.log_metrics(metrics, step=step)

    def log_artifact(self, local_path: str | Path, artifact_path: str | None = None) -> None:
        """Log a local file or directory as an artifact."""
        mlflow.log_artifact(str(local_path), artifact_path)

    def set_tag(self, key: str, value: str) -> None:
        """Set a tag on the active run."""
        mlflow.set_tag(key, value)

    def get_elapsed_seconds(self) -> float:
        """Return elapsed time since run started."""
        return time.monotonic() - self._start_time


@contextmanager
def start_run(
    experiment_name: str | None = None,
    run_name: str | None = None,
    project_slug: str | None = None,
    tags: dict[str, str] | None = None,
    tracking_uri: str | None = None,
) -> Generator[MLiteRun, None, None]:
    """Context manager for instrumented ML training runs.

    Usage::

        from packages.tracking.tracker import start_run

        with start_run(experiment_name="iris-classifier") as run:
            run.log_params({"n_estimators": 100, "max_depth": 5})
            # ... training code ...
            run.log_metrics({"accuracy": 0.95, "f1": 0.93})
    """
    # Configure MLflow environment
    configure_mlflow_environment(tracking_uri=tracking_uri)

    # Set experiment
    if experiment_name:
        mlflow.set_experiment(experiment_name)

    # Collect environment metadata
    env_meta = _collect_environment_metadata()

    # Merge user tags with auto-collected metadata
    all_tags = {**env_meta}
    if project_slug:
        all_tags["mlite.project"] = project_slug
    if tags:
        all_tags.update(tags)

    start_time = datetime.now(timezone.utc)

    with mlflow.start_run(run_name=run_name, tags=all_tags) as active_run:
        client = MlflowClient()
        run_wrapper = MLiteRun(active_run, client)

        # Log start time as a param
        run_wrapper.log_param("mlite.start_time", start_time.isoformat())

        try:
            yield run_wrapper

            # Log success metadata
            elapsed = run_wrapper.get_elapsed_seconds()
            run_wrapper.log_metric("mlite.duration_seconds", elapsed)
            run_wrapper.set_tag("mlite.status", "completed")

        except Exception:
            run_wrapper.set_tag("mlite.status", "failed")
            raise
