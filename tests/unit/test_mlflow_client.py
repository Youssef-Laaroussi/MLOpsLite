"""Unit tests for MLflow client wrapper and environment configuration."""

import os
from unittest.mock import MagicMock, patch

from packages.tracking.mlflow_client import (
    MLiteMLflowManager,
    configure_mlflow_environment,
    get_mlflow_tracking_uri,
)


def test_get_mlflow_tracking_uri_default() -> None:
    """Verify default tracking URI when env var is not set."""
    with patch.dict(os.environ, {}, clear=True):
        assert get_mlflow_tracking_uri() == "http://localhost:5000"


def test_get_mlflow_tracking_uri_from_env() -> None:
    """Verify tracking URI reads from MLFLOW_TRACKING_URI."""
    with patch.dict(os.environ, {"MLFLOW_TRACKING_URI": "http://remote-mlflow:5000"}):
        assert get_mlflow_tracking_uri() == "http://remote-mlflow:5000"


def test_configure_mlflow_environment() -> None:
    """Verify S3 environment variables are injected properly for MinIO."""
    with patch.dict(os.environ, {}, clear=True):
        uri = configure_mlflow_environment(
            tracking_uri="http://localhost:5000",
            s3_endpoint="http://localhost:9000",
            aws_access_key="test_user",
            aws_secret_key="test_pass",
        )
        assert uri == "http://localhost:5000"
        assert os.environ["MLFLOW_S3_ENDPOINT_URL"] == "http://localhost:9000"
        assert os.environ["AWS_ACCESS_KEY_ID"] == "test_user"
        assert os.environ["AWS_SECRET_ACCESS_KEY"] == "test_pass"
        assert os.environ["MLFLOW_S3_IGNORE_TLS"] == "true"


@patch("packages.tracking.mlflow_client.MlflowClient")
def test_get_or_create_experiment_existing(mock_client_cls: MagicMock) -> None:
    """Verify returning existing experiment ID if found."""
    mock_client = MagicMock()
    existing_exp = MagicMock()
    existing_exp.experiment_id = "42"
    mock_client.get_experiment_by_name.return_value = existing_exp
    mock_client_cls.return_value = mock_client

    manager = MLiteMLflowManager("http://localhost:5000")
    exp_id = manager.get_or_create_experiment("fraud-detection")

    assert exp_id == "42"
    mock_client.create_experiment.assert_not_called()


@patch("packages.tracking.mlflow_client.MlflowClient")
def test_get_or_create_experiment_new(mock_client_cls: MagicMock) -> None:
    """Verify creating new experiment with MinIO artifact path if not found."""
    mock_client = MagicMock()
    mock_client.get_experiment_by_name.return_value = None
    mock_client.create_experiment.return_value = "101"
    mock_client_cls.return_value = mock_client

    manager = MLiteMLflowManager("http://localhost:5000")
    exp_id = manager.get_or_create_experiment("demand-forecasting")

    assert exp_id == "101"
    mock_client.create_experiment.assert_called_once_with(
        name="demand-forecasting",
        artifact_location="s3://mlflow-artifacts/demand-forecasting",
        tags={"platform": "mlite"},
    )


@patch("packages.tracking.mlflow_client.MlflowClient")
def test_check_health(mock_client_cls: MagicMock) -> None:
    """Verify health check probe returns True on success and False on exception."""
    mock_client = MagicMock()
    mock_client.search_experiments.return_value = []
    mock_client_cls.return_value = mock_client

    manager = MLiteMLflowManager("http://localhost:5000")
    assert manager.check_health() is True

    # Simulate network failure
    mock_client.search_experiments.side_effect = Exception("Connection refused")
    assert manager.check_health() is False
