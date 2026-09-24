"""Integration test for model rollback (Issue #23).

Tests launching v1 and v2, executing rollback to v1, and asserting
the deployment state reflects the rolled-back version as active.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from packages.core.models.deployment import Deployment, DeploymentStatus
from packages.core.models.model_registry import RegisteredModel, ModelVersion, ModelStage
from packages.core.models.rollback import RollbackStatus, RollbackTrigger
from packages.rollback.coordinator import RollbackCoordinator, RollbackError
from packages.deployment.docker_manager import DockerManager
from packages.deployment.ports import PortAllocator


def _mock_scalar_one_or_none(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _mock_scalars_all(values):
    result = MagicMock()
    result.scalars.return_value.all.return_value = values
    return result


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def mock_docker():
    docker_mgr = MagicMock(spec=DockerManager)
    docker_mgr.run_inference_container.return_value = {
        "container_id": "simulated-mlite-fraud-v1-8101",
        "name": "mlite-fraud-v1-8101",
        "status": "RUNNING",
        "port": 8101,
        "simulated": True,
    }
    docker_mgr.stop_container.return_value = True
    return docker_mgr


@pytest.fixture
def model_v1():
    return ModelVersion(
        id="mv-1", model_id="model-1", version=1,
        stage=ModelStage.ARCHIVED,
    )


@pytest.fixture
def model_v2():
    return ModelVersion(
        id="mv-2", model_id="model-1", version=2,
        stage=ModelStage.PRODUCTION,
    )


@pytest.fixture
def registered_model():
    return RegisteredModel(id="model-1", name="fraud-detector")


@pytest.fixture
def deployment_v2():
    return Deployment(
        id="dep-v2",
        model_name="fraud-detector",
        model_version=2,
        port=8100,
        endpoint_url="http://localhost:8100",
        container_id="simulated-mlite-fraud-v2-8100",
        status=DeploymentStatus.RUNNING,
        project_id="proj-1",
        config={"gpu": False},
    )


@pytest.mark.asyncio
class TestRollbackIntegration:
    """Integration-level tests for the full rollback workflow."""

    async def test_rollback_v2_to_v1_succeeds(
        self,
        mock_session,
        mock_docker,
        deployment_v2,
        registered_model,
        model_v1,
        model_v2,
    ):
        """Launching v1 and v2, rolling back to v1 should succeed."""
        call_count = 0

        def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                # _get_active_deployment: returns v2
                return _mock_scalar_one_or_none(deployment_v2)
            elif call_count == 2:
                # _get_model_version → registered model lookup
                return _mock_scalar_one_or_none(registered_model)
            elif call_count == 3:
                # _get_model_version → version lookup
                return _mock_scalar_one_or_none(model_v1)
            elif call_count == 4:
                # _start_target_container → check existing deployment
                return _mock_scalar_one_or_none(None)
            elif call_count == 5:
                # _start_target_container → active ports
                return _mock_scalars_all([8100])
            elif call_count == 6:
                # _update_registry_stages → get model
                return _mock_scalar_one_or_none(registered_model)
            elif call_count == 7:
                # _update_registry_stages → get current version
                return _mock_scalar_one_or_none(model_v2)
            elif call_count == 8:
                # _update_registry_stages → get target version
                return _mock_scalar_one_or_none(model_v1)
            return _mock_scalar_one_or_none(None)

        mock_session.execute.side_effect = side_effect

        port_allocator = MagicMock(spec=PortAllocator)
        port_allocator.allocate.return_value = 8101

        coordinator = RollbackCoordinator(
            session=mock_session,
            docker_manager=mock_docker,
            port_allocator=port_allocator,
        )

        # Mock health check to return True (simulated container)
        coordinator._health_check = AsyncMock(return_value=True)

        record = await coordinator.execute_rollback(
            model_name="fraud-detector",
            target_version=1,
            reason="v2 showed erratic behavior",
            trigger=RollbackTrigger.MANUAL,
            initiated_by="test-user",
        )

        # Assertions
        assert record.status == RollbackStatus.COMPLETED
        assert record.model_name == "fraud-detector"
        assert record.from_version == 2
        assert record.to_version == 1
        assert record.completed_at is not None

        # Verify model_v2 was archived
        assert model_v2.stage == ModelStage.ARCHIVED

        # Verify model_v1 was promoted to PRODUCTION
        assert model_v1.stage == ModelStage.PRODUCTION

        # Verify old deployment was stopped
        assert deployment_v2.status == DeploymentStatus.STOPPED

        # Verify Docker was called to start new container and stop old
        mock_docker.run_inference_container.assert_called_once()
        mock_docker.stop_container.assert_called_once_with(deployment_v2.container_id)

    async def test_rollback_aborts_on_unhealthy_target(
        self,
        mock_session,
        mock_docker,
        deployment_v2,
        registered_model,
        model_v1,
    ):
        """Rollback should abort if the target container fails health checks."""
        call_count = 0

        def side_effect(*args, **kwargs):
            nonlocal call_count
            call_count += 1
            if call_count == 1:
                return _mock_scalar_one_or_none(deployment_v2)
            elif call_count == 2:
                return _mock_scalar_one_or_none(registered_model)
            elif call_count == 3:
                return _mock_scalar_one_or_none(model_v1)
            elif call_count == 4:
                return _mock_scalar_one_or_none(None)
            elif call_count == 5:
                return _mock_scalars_all([8100])
            return _mock_scalar_one_or_none(None)

        mock_session.execute.side_effect = side_effect

        port_allocator = MagicMock(spec=PortAllocator)
        port_allocator.allocate.return_value = 8101

        coordinator = RollbackCoordinator(
            session=mock_session,
            docker_manager=mock_docker,
            port_allocator=port_allocator,
        )

        # Mock health check to return False
        coordinator._health_check = AsyncMock(return_value=False)

        record = await coordinator.execute_rollback(
            model_name="fraud-detector",
            target_version=1,
            reason="Test unhealthy target",
        )

        # Rollback should be aborted
        assert record.status == RollbackStatus.ABORTED
        assert "failed health check" in record.error_message

        # Original deployment should remain RUNNING (untouched)
        assert deployment_v2.status == DeploymentStatus.RUNNING
