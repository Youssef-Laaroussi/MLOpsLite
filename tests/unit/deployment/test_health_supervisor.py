"""Unit tests for DeploymentSupervisor health probing and crash detection (Issue #13)."""

import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from packages.core.models.deployment import Deployment, DeploymentStatus
from packages.deployment.supervisor import DeploymentSupervisor
from packages.deployment.docker_manager import DockerManager


@pytest.fixture
def mock_session():
    session = AsyncMock()
    return session


@pytest.fixture
def mock_docker():
    docker_mgr = MagicMock(spec=DockerManager)
    docker_mgr.get_container_status.return_value = {
        "status": "RUNNING",
        "exit_code": 0,
        "error": None,
    }
    docker_mgr.get_container_stats.return_value = {
        "cpu_percent": 15.4,
        "memory_mb": 256.0,
        "memory_limit_mb": 1024.0,
    }
    return docker_mgr


@pytest.mark.asyncio
class TestDeploymentSupervisor:
    """Test health monitoring, crash detection, and metric collection."""

    async def test_probe_healthy_deployment(self, mock_session, mock_docker):
        dep = Deployment(
            id="dep-123",
            model_name="fraud-detector",
            model_version=1,
            port=8100,
            endpoint_url="http://localhost:8100",
            status=DeploymentStatus.RUNNING,
            container_id="c-active-123",
        )

        supervisor = DeploymentSupervisor(session=mock_session, docker_manager=mock_docker)

        # Mock successful HTTP probe
        with patch("httpx.AsyncClient.get") as mock_get:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_get.return_value = mock_resp

            report = await supervisor.probe_deployment(dep)

            assert report["deployment_id"] == "dep-123"
            assert report["healthy"] is True
            assert report["status"] == "RUNNING"
            assert report["metrics"]["cpu_percent"] == 15.4
            assert report["metrics"]["memory_mb"] == 256.0
            mock_session.add.assert_called_once()  # Metric record added

    async def test_probe_crashed_container_transitions_to_failed(self, mock_session, mock_docker):
        dep = Deployment(
            id="dep-crash",
            model_name="fraud-detector",
            model_version=1,
            port=8100,
            endpoint_url="http://localhost:8100",
            status=DeploymentStatus.RUNNING,
            container_id="c-dead-123",
        )

        # Container crashed with exit code 137 (OOM killed)
        mock_docker.get_container_status.return_value = {
            "status": "FAILED",
            "exit_code": 137,
            "error": "OOMKilled: container exceeded 1g memory limit",
        }

        supervisor = DeploymentSupervisor(session=mock_session, docker_manager=mock_docker)

        report = await supervisor.probe_deployment(dep)

        assert report["healthy"] is False
        assert report["status"] == "FAILED"
        assert dep.status == DeploymentStatus.FAILED
        assert "OOMKilled" in dep.error_message
        mock_session.flush.assert_called()

    async def test_probe_unresponsive_http_flags_unhealthy(self, mock_session, mock_docker):
        dep = Deployment(
            id="dep-hung",
            model_name="fraud-detector",
            model_version=1,
            port=8100,
            endpoint_url="http://localhost:8100",
            status=DeploymentStatus.RUNNING,
            container_id="c-alive-123",
        )

        supervisor = DeploymentSupervisor(session=mock_session, docker_manager=mock_docker)

        # HTTP request times out
        with patch("httpx.AsyncClient.get", side_effect=Exception("Connection timed out")):
            report = await supervisor.probe_deployment(dep)

            assert report["healthy"] is False
            assert "Connection timed out" in report["error"]
            # Metric recorded with error_count = 1
            mock_session.add.assert_called_once()
