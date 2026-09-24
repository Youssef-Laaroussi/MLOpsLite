"""Unit tests for RollbackCoordinator (Issue #23)."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch
from datetime import datetime, timezone

from packages.core.models.deployment import Deployment, DeploymentStatus
from packages.core.models.model_registry import RegisteredModel, ModelVersion, ModelStage
from packages.core.models.rollback import RollbackRecord, RollbackStatus, RollbackTrigger
from packages.rollback.coordinator import RollbackCoordinator, RollbackError
from packages.deployment.docker_manager import DockerManager
from packages.deployment.ports import PortAllocator


@pytest.fixture
def mock_session():
    session = AsyncMock()
    return session


@pytest.fixture
def mock_docker():
    docker_mgr = MagicMock(spec=DockerManager)
    docker_mgr.run_inference_container.return_value = {
        "container_id": "c-rollback-target",
        "name": "mlite-fraud-v1-8101",
        "status": "RUNNING",
        "port": 8101,
        "simulated": True,
    }
    docker_mgr.stop_container.return_value = True
    return docker_mgr


@pytest.fixture
def mock_port_allocator():
    allocator = MagicMock(spec=PortAllocator)
    allocator.allocate.return_value = 8101
    return allocator


@pytest.fixture
def active_deployment():
    """A currently RUNNING deployment (the faulty one)."""
    return Deployment(
        id="dep-current",
        model_name="fraud-detector",
        model_version=2,
        port=8100,
        endpoint_url="http://localhost:8100",
        container_id="c-faulty-v2",
        status=DeploymentStatus.RUNNING,
        project_id="proj-1",
        config={},
    )


@pytest.fixture
def target_model_version():
    """The target model version to roll back to."""
    return ModelVersion(
        id="mv-1",
        model_id="model-1",
        version=1,
        stage=ModelStage.ARCHIVED,
    )


@pytest.fixture
def registered_model():
    return RegisteredModel(
        id="model-1",
        name="fraud-detector",
    )


def _mock_scalar_one_or_none(value):
    """Create a mock execute result that returns scalar_one_or_none."""
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _mock_scalars_all(values):
    """Create a mock execute result that returns scalars().all()."""
    result = MagicMock()
    result.scalars.return_value.all.return_value = values
    return result


@pytest.mark.asyncio
class TestRollbackCoordinator:
    """Test the rollback coordinator orchestration."""

    async def test_rollback_no_active_deployment_raises_error(
        self, mock_session, mock_docker, mock_port_allocator
    ):
        """Rollback should fail if no active deployment exists."""
        mock_session.execute.return_value = _mock_scalar_one_or_none(None)

        coordinator = RollbackCoordinator(
            session=mock_session,
            docker_manager=mock_docker,
            port_allocator=mock_port_allocator,
        )

        with pytest.raises(RollbackError, match="No active deployment found"):
            await coordinator.execute_rollback(
                model_name="nonexistent-model",
                target_version=1,
                reason="test",
            )

    async def test_rollback_same_version_raises_error(
        self,
        mock_session,
        mock_docker,
        mock_port_allocator,
        active_deployment,
    ):
        """Cannot roll back to the same version as currently active."""
        # First call: _get_active_deployment returns the current deployment
        mock_session.execute.return_value = _mock_scalar_one_or_none(active_deployment)

        coordinator = RollbackCoordinator(
            session=mock_session,
            docker_manager=mock_docker,
            port_allocator=mock_port_allocator,
        )

        with pytest.raises(RollbackError, match="same as current active version"):
            await coordinator.execute_rollback(
                model_name="fraud-detector",
                target_version=2,  # Same as current
                reason="test",
            )

    async def test_rollback_invalid_version_raises_error(
        self,
        mock_session,
        mock_docker,
        mock_port_allocator,
        active_deployment,
    ):
        """Cannot roll back to version 0 or negative."""
        # Override: model_version=1, so target_version=0
        active_deployment.model_version = 1
        mock_session.execute.return_value = _mock_scalar_one_or_none(active_deployment)

        coordinator = RollbackCoordinator(
            session=mock_session,
            docker_manager=mock_docker,
            port_allocator=mock_port_allocator,
        )

        with pytest.raises(RollbackError, match="Invalid target version"):
            await coordinator.execute_rollback(
                model_name="fraud-detector",
                target_version=None,  # Will compute 1-1=0
                reason="test",
            )

    async def test_rollback_target_version_not_in_registry(
        self,
        mock_session,
        mock_docker,
        mock_port_allocator,
        active_deployment,
    ):
        """Rollback should fail if target version doesn't exist in registry."""
        call_count = 0

        def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # _get_active_deployment
                return _mock_scalar_one_or_none(active_deployment)
            elif call_count == 2:
                # _get_model_version: get RegisteredModel
                return _mock_scalar_one_or_none(None)
            return _mock_scalar_one_or_none(None)

        mock_session.execute.side_effect = side_effect

        coordinator = RollbackCoordinator(
            session=mock_session,
            docker_manager=mock_docker,
            port_allocator=mock_port_allocator,
        )

        with pytest.raises(RollbackError, match="not found in registry"):
            await coordinator.execute_rollback(
                model_name="fraud-detector",
                target_version=1,
                reason="test",
            )

    async def test_rollback_aborts_when_health_check_fails(
        self,
        mock_session,
        mock_docker,
        mock_port_allocator,
        active_deployment,
        target_model_version,
        registered_model,
    ):
        """Rollback should be aborted if target container fails health check."""
        call_count = 0

        target_deployment = Deployment(
            id="dep-target",
            model_name="fraud-detector",
            model_version=1,
            port=8101,
            endpoint_url="http://localhost:8101",
            container_id="c-target-v1",
            status=DeploymentStatus.RUNNING,
        )

        def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return _mock_scalar_one_or_none(active_deployment)
            elif call_count == 2:
                return _mock_scalar_one_or_none(registered_model)
            elif call_count == 3:
                return _mock_scalar_one_or_none(target_model_version)
            elif call_count == 4:
                # existing deployment check
                return _mock_scalar_one_or_none(None)
            elif call_count == 5:
                # active ports
                return _mock_scalars_all([8100])
            return _mock_scalar_one_or_none(None)

        mock_session.execute.side_effect = side_effect

        coordinator = RollbackCoordinator(
            session=mock_session,
            docker_manager=mock_docker,
            port_allocator=mock_port_allocator,
        )

        # Make health check fail by mocking _health_check
        coordinator._health_check = AsyncMock(return_value=False)

        record = await coordinator.execute_rollback(
            model_name="fraud-detector",
            target_version=1,
            reason="Test health check failure",
        )

        assert record.status == RollbackStatus.ABORTED
        assert "failed health check" in record.error_message

    async def test_get_rollback_history(self, mock_session):
        """Test querying rollback audit log."""
        records = [
            RollbackRecord(
                id="rb-1",
                model_name="fraud-detector",
                from_version=2,
                to_version=1,
                reason="emergency",
                status=RollbackStatus.COMPLETED,
            ),
        ]
        mock_session.execute.return_value = _mock_scalars_all(records)

        coordinator = RollbackCoordinator(session=mock_session)
        history = await coordinator.get_rollback_history(model_name="fraud-detector")

        assert len(history) == 1
        assert history[0].model_name == "fraud-detector"

    async def test_get_rollback_by_id(self, mock_session):
        """Test fetching a specific rollback record."""
        record = RollbackRecord(
            id="rb-1",
            model_name="test",
            from_version=2,
            to_version=1,
            status=RollbackStatus.COMPLETED,
        )
        mock_session.execute.return_value = _mock_scalar_one_or_none(record)

        coordinator = RollbackCoordinator(session=mock_session)
        result = await coordinator.get_rollback("rb-1")

        assert result is not None
        assert result.id == "rb-1"

    async def test_get_nonexistent_rollback_returns_none(self, mock_session):
        """Test fetching a non-existent rollback returns None."""
        mock_session.execute.return_value = _mock_scalar_one_or_none(None)

        coordinator = RollbackCoordinator(session=mock_session)
        result = await coordinator.get_rollback("nonexistent")

        assert result is None
