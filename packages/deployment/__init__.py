"""MLite Model Deployment package."""

from packages.deployment.docker_manager import DockerManager
from packages.deployment.ports import PortAllocationError, PortAllocator

__all__ = [
    "PortAllocator",
    "PortAllocationError",
    "DockerManager",
    "DeploymentService",
    "DeploymentSupervisor",
]


def __getattr__(name: str):
    if name == "DeploymentService":
        from packages.deployment.service import DeploymentService
        return DeploymentService
    if name == "DeploymentSupervisor":
        from packages.deployment.supervisor import DeploymentSupervisor
        return DeploymentSupervisor
    raise AttributeError(f"module {__name__!r} has no attribute {name!r}")
