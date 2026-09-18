"""Global Pytest fixtures and mock dependencies for MLite test suite (Issue #28).

Provides isolated in-memory fixtures for:
- Database sessions (mocked AsyncSession & async SQLite)
- Object storage (MinIO StorageClient mock)
- Experiment tracking (MLflow client mock)
- Container execution (DockerManager mock)
- FastAPI application & AsyncClient
- Domain model instances (User, Project, RegisteredModel, Deployment)
"""

import asyncio
from datetime import datetime, timezone
from typing import AsyncGenerator
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import create_app
from packages.core.models.project import Project, ProjectStatus
from packages.core.models.model_registry import RegisteredModel, ModelVersion, ModelStage
from packages.core.models.deployment import Deployment, DeploymentStatus
from packages.core.models.user import User, UserRole, ApiKey
from packages.core.models.audit import AuditLog, AuditAction
from packages.core.storage.client import StorageClient
from packages.deployment.docker_manager import DockerManager


# ── Event Loop Fixture ──────────────────────────────────────────


@pytest.fixture(scope="session")
def event_loop():
    """Create a session-wide event loop."""
    loop = asyncio.new_event_loop()
    yield loop
    loop.close()


# ── Mock Storage Client Fixture ─────────────────────────────────


@pytest.fixture
def mock_storage_client() -> MagicMock:
    """Mock MinIO / S3 StorageClient for isolated testing without network."""
    client = MagicMock(spec=StorageClient)
    client.bucket_exists.return_value = True
    client.create_bucket.return_value = True
    client.upload_file.return_value = "s3://mlite-datasets/test.csv"
    client.download_file.return_value = b"col1,col2\n1,2\n3,4\n"
    client.delete_file.return_value = True
    client.list_objects.return_value = ["test.csv", "train.csv"]
    client.generate_presigned_url.return_value = "http://mock-minio:9000/mlite-datasets/test.csv?token=xyz"
    return client


# ── Mock Database Session Fixture ───────────────────────────────


@pytest.fixture
def mock_session() -> AsyncMock:
    """Mock AsyncSession for unit testing service layers."""
    session = AsyncMock()
    session.add = MagicMock()
    session.flush = AsyncMock()
    session.commit = AsyncMock()
    session.rollback = AsyncMock()
    session.refresh = AsyncMock()
    session.execute = AsyncMock()
    return session


# ── Mock MLflow Tracking Client Fixture ─────────────────────────


@pytest.fixture
def mock_mlflow_client() -> MagicMock:
    """Mock MLflow tracking client."""
    client = MagicMock()
    client.create_experiment.return_value = "exp-101"
    client.get_experiment_by_name.return_value = None

    mock_run = MagicMock()
    mock_run.info.run_id = "run-202"
    mock_run.info.experiment_id = "exp-101"
    mock_run.info.status = "FINISHED"
    mock_run.data.metrics = {"accuracy": 0.94, "loss": 0.12}
    mock_run.data.params = {"learning_rate": "0.01", "epochs": "10"}
    client.create_run.return_value = mock_run
    client.get_run.return_value = mock_run

    return client


# ── Mock Docker Daemon / DockerManager Fixture ───────────────────


@pytest.fixture
def mock_docker_manager() -> MagicMock:
    """Mock DockerManager for container lifecycle operations."""
    mgr = MagicMock(spec=DockerManager)
    mgr.run_inference_container.return_value = {
        "container_id": "simulated-container-uuid",
        "name": "mlite-model-test-8100",
        "status": "RUNNING",
        "port": 8100,
        "simulated": True,
    }
    mgr.stop_container.return_value = True
    mgr.is_container_healthy.return_value = True
    mgr.list_managed_containers.return_value = []
    return mgr


# ── FastAPI App & AsyncClient Fixtures ──────────────────────────


@pytest.fixture
def app():
    """Create a configured FastAPI application instance."""
    return create_app()


@pytest.fixture
async def async_client(app) -> AsyncGenerator[AsyncClient, None]:
    """AsyncClient bound to the test FastAPI app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        yield client


# ── Domain Model Fixtures ───────────────────────────────────────


@pytest.fixture
def sample_user() -> User:
    """Sample DEVELOPER user."""
    return User(
        id="usr-dev-1",
        username="developer_dan",
        email="dan@mlite.local",
        hashed_password="$2b$12$mockhashedpasswordmockhashedpasswordmockhash",
        full_name="Dan Developer",
        role=UserRole.DEVELOPER,
        is_active=True,
    )


@pytest.fixture
def sample_admin() -> User:
    """Sample ADMIN user."""
    return User(
        id="usr-admin-1",
        username="admin_alice",
        email="alice@mlite.local",
        hashed_password="$2b$12$mockhashedpasswordmockhashedpasswordmockhash",
        full_name="Alice Admin",
        role=UserRole.ADMIN,
        is_active=True,
    )


@pytest.fixture
def sample_maintainer() -> User:
    """Sample MAINTAINER user."""
    return User(
        id="usr-maint-1",
        username="maintainer_mike",
        email="mike@mlite.local",
        hashed_password="$2b$12$mockhashedpasswordmockhashedpasswordmockhash",
        full_name="Mike Maintainer",
        role=UserRole.MAINTAINER,
        is_active=True,
    )


@pytest.fixture
def sample_viewer() -> User:
    """Sample VIEWER user."""
    return User(
        id="usr-view-1",
        username="viewer_val",
        email="val@mlite.local",
        hashed_password="$2b$12$mockhashedpasswordmockhashedpasswordmockhash",
        full_name="Val Viewer",
        role=UserRole.VIEWER,
        is_active=True,
    )


@pytest.fixture
def sample_project() -> Project:
    """Sample Project entity."""
    return Project(
        id="proj-1",
        name="Fraud Detection",
        slug="fraud-detection",
        description="Detect fraudulent payment transactions",
        status=ProjectStatus.ACTIVE,
    )


@pytest.fixture
def sample_registered_model(sample_project) -> RegisteredModel:
    """Sample RegisteredModel entity."""
    return RegisteredModel(
        id="model-1",
        project_id=sample_project.id,
        name="fraud-xgboost",
        description="XGBoost classifier for transaction risk scoring",
    )


@pytest.fixture
def sample_model_version(sample_registered_model) -> ModelVersion:
    """Sample ModelVersion entity in PRODUCTION."""
    return ModelVersion(
        id="mv-1",
        model_id=sample_registered_model.id,
        version=1,
        stage=ModelStage.PRODUCTION,
        mlflow_run_id="run-mlflow-1",
        artifact_path="s3://mlflow-artifacts/models/fraud-xgboost/1",
        metrics={"accuracy": 0.952, "f1_score": 0.921, "latency_ms": 12.4},
    )


@pytest.fixture
def sample_deployment(sample_model_version) -> Deployment:
    """Sample RUNNING Deployment entity."""
    return Deployment(
        id="dep-1",
        project_id="proj-1",
        model_name="fraud-xgboost",
        model_version=1,
        port=8100,
        status=DeploymentStatus.RUNNING,
        container_id="sim-container-8100",
        endpoint_url="http://localhost:8100/predict",
    )
