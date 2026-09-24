"""MLflow tracking client wrapper, environment configuration, and experiment helpers."""

import os
from typing import Any
import mlflow
from mlflow.tracking import MlflowClient


def get_mlflow_tracking_uri() -> str:
    """Retrieve MLflow tracking URI from environment or default to local compose."""
    return os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")


def configure_mlflow_environment(
    tracking_uri: str | None = None,
    s3_endpoint: str | None = None,
    aws_access_key: str | None = None,
    aws_secret_key: str | None = None,
) -> str:
    """Configure MLflow client environment variables for S3/MinIO artifact storage."""
    uri = tracking_uri or get_mlflow_tracking_uri()
    mlflow.set_tracking_uri(uri)

    # Set S3/MinIO endpoint and credentials if not already present
    os.environ.setdefault(
        "MLFLOW_S3_ENDPOINT_URL",
        s3_endpoint or os.getenv("MINIO_ENDPOINT", "http://localhost:9000"),
    )
    os.environ.setdefault(
        "AWS_ACCESS_KEY_ID",
        aws_access_key or os.getenv("MINIO_ROOT_USER", "mlite_minio_admin"),
    )
    os.environ.setdefault(
        "AWS_SECRET_ACCESS_KEY",
        aws_secret_key or os.getenv("MINIO_ROOT_PASSWORD", "mlite_minio_password"),
    )
    os.environ.setdefault("AWS_DEFAULT_REGION", "us-east-1")
    os.environ.setdefault("MLFLOW_S3_IGNORE_TLS", "true")
    os.environ.setdefault("MLFLOW_HTTP_REQUEST_TIMEOUT", "1")
    os.environ.setdefault("MLFLOW_HTTP_REQUEST_MAX_RETRIES", "0")

    return uri


class MLiteMLflowManager:
    """Manager for MLflow experiment lifecycle and run instrumentation."""

    def __init__(self, tracking_uri: str | None = None) -> None:
        self.tracking_uri = configure_mlflow_environment(tracking_uri)
        self.client = MlflowClient(tracking_uri=self.tracking_uri)

    def get_or_create_experiment(
        self,
        experiment_name: str,
        artifact_location: str | None = None,
        tags: dict[str, Any] | None = None,
    ) -> str:
        """Retrieve existing experiment ID or create a new one with MinIO artifact path."""
        existing = self.client.get_experiment_by_name(experiment_name)
        if existing is not None:
            return str(existing.experiment_id)

        # Default artifact location in MinIO
        location = artifact_location or f"s3://mlflow-artifacts/{experiment_name}"
        experiment_id = self.client.create_experiment(
            name=experiment_name,
            artifact_location=location,
            tags=tags or {"platform": "mlite"},
        )
        return str(experiment_id)

    def check_health(self) -> bool:
        """Check whether the MLflow tracking server is reachable."""
        try:
            # Listing experiments serves as an active connectivity probe
            self.client.search_experiments(max_results=1)
            return True
        except Exception:
            return False
