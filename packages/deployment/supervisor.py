"""Deployment supervisor — automated health monitoring, crash detection, and resource telemetry."""

import logging
from typing import Any, Dict, List, Optional

import httpx
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.deployment import (
    Deployment,
    DeploymentMetric,
    DeploymentStatus,
)
from packages.deployment.docker_manager import DockerManager

logger = logging.getLogger(__name__)


class DeploymentSupervisor:
    """Supervises running inference containers and tracks health & resource metrics."""

    def __init__(
        self,
        session: AsyncSession,
        docker_manager: Optional[DockerManager] = None,
        http_timeout: float = 3.0,
    ) -> None:
        self.session = session
        self.docker_manager = docker_manager or DockerManager()
        self.http_timeout = http_timeout

    async def probe_deployment(self, deployment: Deployment) -> Dict[str, Any]:
        """Check container status, perform HTTP health probe, and collect resource metrics."""
        result: Dict[str, Any] = {
            "deployment_id": deployment.id,
            "status": deployment.status.value,
            "healthy": False,
            "error": None,
        }

        # 1. Inspect Docker container state
        if deployment.container_id:
            c_state = self.docker_manager.get_container_status(deployment.container_id)
            if c_state.get("status") in ("STOPPED", "FAILED") and deployment.status == DeploymentStatus.RUNNING:
                exit_code = c_state.get("exit_code")
                error = c_state.get("error") or f"Container exited with code {exit_code}"
                deployment.status = DeploymentStatus.FAILED
                deployment.error_message = error
                await self.session.flush()
                result["status"] = DeploymentStatus.FAILED.value
                result["error"] = error
                return result

        # 2. HTTP Health Probe
        health_url = f"{deployment.endpoint_url}/health"
        http_ok = False
        try:
            async with httpx.AsyncClient(timeout=self.http_timeout) as client:
                resp = await client.get(health_url)
                if resp.status_code == 200:
                    http_ok = True
                else:
                    result["error"] = f"Health endpoint returned status {resp.status_code}"
        except Exception as exc:
            result["error"] = f"Health probe connection failed: {exc}"

        result["healthy"] = http_ok

        # 3. Collect resource statistics
        stats = {"cpu_percent": 0.0, "memory_mb": 0.0, "memory_limit_mb": 0.0}
        if deployment.container_id and deployment.status == DeploymentStatus.RUNNING:
            stats = self.docker_manager.get_container_stats(deployment.container_id)

        # 4. Record metrics in DB
        metric = DeploymentMetric(
            deployment_id=deployment.id,
            cpu_percent=stats.get("cpu_percent", 0.0),
            memory_mb=stats.get("memory_mb", 0.0),
            memory_limit_mb=stats.get("memory_limit_mb", 0.0),
            requests_count=0,
            error_count=0 if http_ok else 1,
            latency_p50_ms=None,
            latency_p95_ms=None,
        )
        self.session.add(metric)
        await self.session.flush()

        result["metrics"] = stats
        return result

    async def poll_all_active_deployments(self) -> List[Dict[str, Any]]:
        """Probe all currently active deployments and record metric telemetry."""
        query = select(Deployment).where(
            Deployment.status == DeploymentStatus.RUNNING
        )
        result = await self.session.execute(query)
        active_deployments = list(result.scalars().all())

        reports = []
        for dep in active_deployments:
            try:
                report = await self.probe_deployment(dep)
                reports.append(report)
            except Exception as e:
                logger.error("Supervisor failed to probe deployment %s: %s", dep.id, e)
                reports.append({
                    "deployment_id": dep.id,
                    "status": dep.status.value,
                    "healthy": False,
                    "error": str(e),
                })

        return reports
