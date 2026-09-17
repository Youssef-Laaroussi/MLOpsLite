"""Deployment service — orchestrates container creation, port management, and database persistence."""

import logging
from typing import Any, Dict, List, Optional, Set

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.deployment import (
    Deployment,
    DeploymentMetric,
    DeploymentStatus,
)
from packages.deployment.docker_manager import DockerManager
from packages.deployment.ports import PortAllocator

logger = logging.getLogger(__name__)


class DeploymentService:
    """Business logic for model deployment lifecycle."""

    def __init__(
        self,
        session: AsyncSession,
        port_allocator: Optional[PortAllocator] = None,
        docker_manager: Optional[DockerManager] = None,
    ) -> None:
        self.session = session
        self.port_allocator = port_allocator or PortAllocator()
        self.docker_manager = docker_manager or DockerManager()

    async def _get_active_ports(self) -> Set[int]:
        """Fetch all ports currently used by active (RUNNING/PENDING) deployments."""
        result = await self.session.execute(
            select(Deployment.port).where(
                Deployment.status.in_([DeploymentStatus.RUNNING, DeploymentStatus.PENDING])
            )
        )
        return set(result.scalars().all())

    async def deploy_model(
        self,
        model_name: str,
        model_version: int,
        requested_port: Optional[int] = None,
        project_id: Optional[str] = None,
        config: Optional[Dict[str, Any]] = None,
    ) -> Deployment:
        """Allocate port, start inference container, and record deployment in database."""
        active_ports = await self._get_active_ports()
        allocated_port = self.port_allocator.allocate(
            requested_port=requested_port, active_db_ports=active_ports
        )

        endpoint_url = f"http://localhost:{allocated_port}"

        deployment = Deployment(
            project_id=project_id,
            model_name=model_name,
            model_version=model_version,
            port=allocated_port,
            endpoint_url=endpoint_url,
            status=DeploymentStatus.PENDING,
            config=config or {},
        )
        self.session.add(deployment)
        await self.session.flush()

        try:
            container_info = self.docker_manager.run_inference_container(
                model_name=model_name,
                model_version=model_version,
                host_port=allocated_port,
            )
            deployment.container_id = container_info.get("container_id")
            deployment.status = DeploymentStatus.RUNNING
            await self.session.flush()
            await self.session.refresh(deployment)
            return deployment
        except Exception as e:
            logger.error("Deployment failed for %s v%s: %s", model_name, model_version, e)
            deployment.status = DeploymentStatus.FAILED
            deployment.error_message = str(e)
            self.port_allocator.release(allocated_port)
            await self.session.flush()
            await self.session.refresh(deployment)
            return deployment

    async def stop_deployment(self, deployment_id: str) -> Optional[Deployment]:
        """Stop container and mark deployment status as STOPPED."""
        deployment = await self.get_deployment(deployment_id)
        if deployment is None:
            return None

        if deployment.container_id:
            self.docker_manager.stop_container(deployment.container_id)

        self.port_allocator.release(deployment.port)
        deployment.status = DeploymentStatus.STOPPED
        await self.session.flush()
        await self.session.refresh(deployment)
        return deployment

    async def get_deployment(self, deployment_id: str) -> Optional[Deployment]:
        """Retrieve deployment by UUID."""
        result = await self.session.execute(
            select(Deployment).where(Deployment.id == deployment_id)
        )
        return result.scalar_one_or_none()

    async def list_deployments(
        self,
        project_id: Optional[str] = None,
        status: Optional[DeploymentStatus] = None,
    ) -> List[Deployment]:
        """List deployments with optional filtering."""
        query = select(Deployment).order_by(Deployment.created_at.desc())
        if project_id:
            query = query.where(Deployment.project_id == project_id)
        if status:
            query = query.where(Deployment.status == status)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def record_metrics(
        self,
        deployment_id: str,
        cpu_percent: float,
        memory_mb: float,
        memory_limit_mb: float,
        requests_count: int = 0,
        error_count: int = 0,
        latency_p50_ms: Optional[float] = None,
        latency_p95_ms: Optional[float] = None,
    ) -> DeploymentMetric:
        """Store historical resource and request metric snapshot."""
        metric = DeploymentMetric(
            deployment_id=deployment_id,
            cpu_percent=cpu_percent,
            memory_mb=memory_mb,
            memory_limit_mb=memory_limit_mb,
            requests_count=requests_count,
            error_count=error_count,
            latency_p50_ms=latency_p50_ms,
            latency_p95_ms=latency_p95_ms,
        )
        self.session.add(metric)
        await self.session.flush()
        await self.session.refresh(metric)
        return metric

    async def get_metrics(
        self,
        deployment_id: str,
        limit: int = 50,
    ) -> List[DeploymentMetric]:
        """Fetch latest metrics for a given deployment."""
        query = (
            select(DeploymentMetric)
            .where(DeploymentMetric.deployment_id == deployment_id)
            .order_by(DeploymentMetric.timestamp.desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())
