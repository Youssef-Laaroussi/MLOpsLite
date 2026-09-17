"""Docker container lifecycle and resource metrics manager.

Interacts with the local Docker daemon to orchestrate model serving containers
and collect live resource utilization metrics (CPU, Memory, I/O).
"""

import logging
from typing import Any, Dict, Optional

logger = logging.getLogger(__name__)

try:
    import docker
    from docker.errors import DockerException, NotFound, APIError
    _DOCKER_AVAILABLE = True
except ImportError:
    docker = None  # type: ignore
    DockerException = Exception  # type: ignore
    NotFound = Exception  # type: ignore
    APIError = Exception  # type: ignore
    _DOCKER_AVAILABLE = False


class DockerManager:
    """Manages Docker inference containers via the Docker SDK."""

    DEFAULT_IMAGE = "mlite/serving:latest"

    def __init__(self, client: Any = None) -> None:
        self._client = client
        self._initialized = False

    @property
    def client(self) -> Any:
        """Lazily initialize the Docker client."""
        if self._client is None and _DOCKER_AVAILABLE:
            try:
                self._client = docker.from_env()
                self._initialized = True
            except DockerException as e:
                logger.warning("Docker daemon is not reachable: %s", e)
                self._client = None
        return self._client

    @property
    def is_available(self) -> bool:
        """Check whether the Docker engine is installed and responsive."""
        if not _DOCKER_AVAILABLE:
            return False
        try:
            return self.client is not None and self.client.ping()
        except Exception:
            return False

    def run_inference_container(
        self,
        model_name: str,
        model_version: int,
        host_port: int,
        image: str = DEFAULT_IMAGE,
        environment: Optional[Dict[str, str]] = None,
        memory_limit: str = "1g",
        cpu_limit: float = 1.0,
    ) -> Dict[str, Any]:
        """Launch an inference container bound to host_port."""
        container_name = f"mlite-{model_name}-v{model_version}-{host_port}"
        env = environment or {}
        env.update({
            "MODEL_NAME": model_name,
            "MODEL_VERSION": str(model_version),
            "PORT": "8000",
        })

        if not self.is_available:
            # Simulated run for offline/testing environments
            logger.info("Docker daemon unavailable; generating mock container info for %s", container_name)
            return {
                "container_id": f"simulated-{container_name}",
                "name": container_name,
                "status": "RUNNING",
                "port": host_port,
                "simulated": True,
            }

        try:
            # Clean up existing container with same name if any
            try:
                old_c = self.client.containers.get(container_name)
                old_c.stop(timeout=2)
                old_c.remove()
            except Exception:
                pass

            container = self.client.containers.run(
                image=image,
                name=container_name,
                detach=True,
                ports={"8000/tcp": host_port},
                environment=env,
                mem_limit=memory_limit,
                nano_cpus=int(cpu_limit * 1e9),
                restart_policy={"Name": "on-failure", "MaximumRetryCount": 3},
            )
            return {
                "container_id": container.id,
                "name": container.name,
                "status": "RUNNING",
                "port": host_port,
                "simulated": False,
            }
        except Exception as e:
            logger.error("Failed to run container %s: %s", container_name, e)
            raise RuntimeError(f"Docker container launch failed: {e}") from e

    def stop_container(self, container_id: str) -> bool:
        """Stop and remove a running container."""
        if not self.is_available:
            logger.info("Simulated stop of container %s", container_id)
            return True

        try:
            container = self.client.containers.get(container_id)
            container.stop(timeout=5)
            container.remove()
            return True
        except Exception as e:
            logger.warning("Error stopping container %s: %s", container_id, e)
            return False

    def get_container_status(self, container_id: str) -> Dict[str, Any]:
        """Inspect container state and exit code."""
        if not self.is_available:
            return {
                "container_id": container_id,
                "status": "RUNNING",
                "exit_code": 0,
                "error": None,
                "simulated": True,
            }

        try:
            container = self.client.containers.get(container_id)
            state = container.attrs.get("State", {})
            return {
                "container_id": container.id,
                "status": "RUNNING" if state.get("Running") else ("STOPPED" if state.get("ExitCode") == 0 else "FAILED"),
                "exit_code": state.get("ExitCode"),
                "error": state.get("Error"),
                "started_at": state.get("StartedAt"),
                "simulated": False,
            }
        except Exception as e:
            return {
                "container_id": container_id,
                "status": "STOPPED",
                "exit_code": -1,
                "error": str(e),
                "simulated": False,
            }

    def get_container_stats(self, container_id: str) -> Dict[str, float]:
        """Collect live CPU % and Memory MB usage from Docker stats."""
        if not self.is_available:
            return {
                "cpu_percent": 2.5,
                "memory_mb": 128.0,
                "memory_limit_mb": 1024.0,
                "simulated": True,
            }

        try:
            container = self.client.containers.get(container_id)
            stats = container.stats(stream=False)

            # CPU percentage calculation
            cpu_stats = stats.get("cpu_stats", {})
            precpu_stats = stats.get("precpu_stats", {})

            cpu_delta = (
                cpu_stats.get("cpu_usage", {}).get("total_usage", 0)
                - precpu_stats.get("cpu_usage", {}).get("total_usage", 0)
            )
            system_delta = (
                cpu_stats.get("system_cpu_usage", 0)
                - precpu_stats.get("system_cpu_usage", 0)
            )
            num_cpus = cpu_stats.get("online_cpus", 1) or 1

            cpu_percent = 0.0
            if system_delta > 0 and cpu_delta > 0:
                cpu_percent = (cpu_delta / system_delta) * num_cpus * 100.0

            # Memory calculation
            mem_stats = stats.get("memory_stats", {})
            usage_bytes = mem_stats.get("usage", 0)
            limit_bytes = mem_stats.get("limit", 1)

            return {
                "cpu_percent": round(cpu_percent, 2),
                "memory_mb": round(usage_bytes / (1024 * 1024), 2),
                "memory_limit_mb": round(limit_bytes / (1024 * 1024), 2),
                "simulated": False,
            }
        except Exception as e:
            logger.warning("Failed to get stats for container %s: %s", container_id, e)
            return {
                "cpu_percent": 0.0,
                "memory_mb": 0.0,
                "memory_limit_mb": 0.0,
                "simulated": False,
            }
