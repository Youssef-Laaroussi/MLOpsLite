"""Unit tests for DeploymentService lifecycle operations (Issue #11)."""

import pytest
from unittest.mock import AsyncMock, MagicMock

from packages.core.models.deployment import Deployment, DeploymentStatus
from packages.deployment.service import DeploymentService
from packages.deployment.ports import PortAllocator
from packages.deployment.docker_manager import DockerManager


@pytest.fixture
def mock_session():
    session = AsyncMock()
    return session


@pytest.fixture
def mock_docker():
    docker_mgr = MagicMock(spec=DockerManager)
    docker_mgr.run_inference_container.return_value = {
        "container_id": "c-123456789",
        "name": "mlite-churn-v1-8100",
        "status": "RUNNING",
        "port": 8100,
        "simulated": False,
    }
    docker_mgr.stop_container.return_value = True
    return docker_mgr


@pytest.mark.asyncio
class TestDeploymentService:
    """Test DeploymentService orchestration."""

    async def test_deploy_model_success(self, mock_session, mock_docker):
        # Mock active db ports check to return empty set
        exec_result = MagicMock()
        exec_result.scalars.return_value.all.return_value = []
        mock_session.execute.return_value = exec_result

        port_allocator = PortAllocator(start_port=8100, end_port=8110)
        service = DeploymentService(
            session=mock_session,
            port_allocator=port_allocator,
            docker_manager=mock_docker,
        )

        deployment = await service.deploy_model(
            model_name="churn-predictor",
            model_version=1,
            project_id="proj-abc",
        )

        assert deployment.model_name == "churn-predictor"
        assert deployment.model_version == 1
        assert deployment.port == 8100
        assert deployment.endpoint_url == "http://localhost:8100"
        assert deployment.status == DeploymentStatus.RUNNING
        assert deployment.container_id == "c-123456789"
        mock_docker.run_inference_container.assert_called_once()

    async def test_deploy_model_failure_marks_failed(self, mock_session, mock_docker):
        exec_result = MagicMock()
        exec_result.scalars.return_value.all.return_value = []
        mock_session.execute.return_value = exec_result

        mock_docker.run_inference_container.side_effect = RuntimeError("Docker out of memory")

        port_allocator = PortAllocator(start_port=8100, end_port=8110)
        service = DeploymentService(
            session=mock_session,
            port_allocator=port_allocator,
            docker_manager=mock_docker,
        )

        deployment = await service.deploy_model(
            model_name="churn-predictor",
            model_version=1,
        )

        assert deployment.status == DeploymentStatus.FAILED
        assert "Docker out of memory" in deployment.error_message
        # Port should be released on failure
        assert 8100 not in port_allocator.reserved_ports

    async def test_stop_deployment(self, mock_session, mock_docker):
        existing = Deployment(
            id="dep-1",
            model_name="churn-predictor",
            model_version=1,
            port=8100,
            container_id="c-123456789",
            status=DeploymentStatus.RUNNING,
            endpoint_url="http://localhost:8100",
        )
        service = DeploymentService(session=mock_session, docker_manager=mock_docker)
        service.get_deployment = AsyncMock(return_value=existing)

        stopped = await service.stop_deployment("dep-1")
        assert stopped is not None
        assert stopped.status == DeploymentStatus.STOPPED
        mock_docker.stop_container.assert_called_once_with("c-123456789")
