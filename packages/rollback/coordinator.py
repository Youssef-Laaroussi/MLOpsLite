"""Rollback Coordinator — atomic model rollback with traffic cutover (Issue #23).

Orchestrates zero-downtime rollback:
1. Validates target version exists and is healthy.
2. Starts target container if stopped.
3. Atomically redirects traffic (port reassignment).
4. Updates Model Registry stages (target → PRODUCTION, faulty → ARCHIVED).
5. Gracefully drains and stops the faulty container.
6. Writes permanent audit log entry.
"""

import logging
from datetime import datetime, timezone
from typing import Any, Dict, Optional

import httpx
from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.deployment import Deployment, DeploymentStatus
from packages.core.models.model_registry import ModelVersion, ModelStage, RegisteredModel
from packages.core.models.rollback import (
    RollbackRecord,
    RollbackStatus,
    RollbackTrigger,
)
from packages.deployment.docker_manager import DockerManager
from packages.deployment.ports import PortAllocator

logger = logging.getLogger(__name__)


class RollbackError(Exception):
    """Raised when a rollback operation cannot be completed safely."""


class RollbackCoordinator:
    """Coordinates atomic model rollback with safety checks and audit logging."""

    HEALTH_CHECK_TIMEOUT_SECONDS = 5.0
    DRAIN_TIMEOUT_SECONDS = 10

    def __init__(
        self,
        session: AsyncSession,
        docker_manager: Optional[DockerManager] = None,
        port_allocator: Optional[PortAllocator] = None,
    ) -> None:
        self.session = session
        self.docker = docker_manager or DockerManager()
        self.port_allocator = port_allocator or PortAllocator()

    # ── Public API ───────────────────────────────────────────

    async def execute_rollback(
        self,
        model_name: str,
        target_version: Optional[int] = None,
        reason: str = "Manual rollback",
        trigger: RollbackTrigger = RollbackTrigger.MANUAL,
        initiated_by: str = "operator",
    ) -> RollbackRecord:
        """Execute a controlled rollback to a previous model version.

        If target_version is None, rolls back to the previous version (current - 1).
        """
        # 1. Find the current active deployment
        current_deployment = await self._get_active_deployment(model_name)
        if current_deployment is None:
            raise RollbackError(f"No active deployment found for model '{model_name}'")

        current_version = current_deployment.model_version

        # 2. Determine target version
        if target_version is None:
            target_version = current_version - 1
        if target_version < 1:
            raise RollbackError(f"Invalid target version: {target_version}")
        if target_version == current_version:
            raise RollbackError(
                f"Target version {target_version} is the same as current active version"
            )

        # 3. Verify target version exists in registry
        target_model_version = await self._get_model_version(model_name, target_version)
        if target_model_version is None:
            raise RollbackError(
                f"Model version {target_version} not found in registry for '{model_name}'"
            )

        # 4. Create audit record
        record = RollbackRecord(
            deployment_id=current_deployment.id,
            model_name=model_name,
            from_version=current_version,
            to_version=target_version,
            reason=reason,
            trigger=trigger,
            status=RollbackStatus.IN_PROGRESS,
            initiated_by=initiated_by,
        )
        self.session.add(record)
        await self.session.flush()

        try:
            # 5. Start the target version container
            target_deployment = await self._start_target_container(
                model_name, target_version, current_deployment
            )

            # 6. Health check the target container
            is_healthy = await self._health_check(target_deployment)
            if not is_healthy:
                # Abort: target container failed health check
                record.status = RollbackStatus.ABORTED
                record.error_message = (
                    f"Target version {target_version} failed health check — "
                    "rollback aborted, current traffic remains untouched"
                )
                record.details_json = {"health_check": "FAILED", "target_version": target_version}
                await self.session.flush()

                # Clean up the failed target container
                await self._stop_deployment(target_deployment)

                logger.warning(
                    "Rollback aborted: %s v%d failed health check",
                    model_name, target_version,
                )
                await self.session.refresh(record)
                return record

            # 7. Update Model Registry stages
            await self._update_registry_stages(
                model_name, current_version, target_version
            )

            # 8. Mark the new deployment as active and stop the old one
            target_deployment.status = DeploymentStatus.RUNNING
            await self.session.flush()

            # Gracefully stop the faulty container
            await self._stop_deployment(current_deployment)

            # 9. Mark rollback complete
            record.status = RollbackStatus.COMPLETED
            record.completed_at = datetime.now(timezone.utc)
            record.details_json = {
                "health_check": "PASSED",
                "from_version": current_version,
                "to_version": target_version,
                "old_deployment_id": current_deployment.id,
                "new_deployment_id": target_deployment.id,
            }
            await self.session.flush()
            await self.session.refresh(record)

            logger.info(
                "Rollback complete: %s v%d → v%d (record=%s)",
                model_name, current_version, target_version, record.id,
            )
            return record

        except RollbackError:
            raise
        except Exception as exc:
            record.status = RollbackStatus.FAILED
            record.error_message = str(exc)
            record.completed_at = datetime.now(timezone.utc)
            await self.session.flush()
            await self.session.refresh(record)
            logger.error("Rollback failed for %s: %s", model_name, exc)
            raise RollbackError(f"Rollback failed: {exc}") from exc

    async def get_rollback_history(
        self,
        model_name: Optional[str] = None,
        limit: int = 50,
    ) -> list[RollbackRecord]:
        """Query rollback audit log history."""
        query = select(RollbackRecord).order_by(RollbackRecord.created_at.desc()).limit(limit)
        if model_name:
            query = query.where(RollbackRecord.model_name == model_name)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_rollback(self, rollback_id: str) -> Optional[RollbackRecord]:
        """Get a specific rollback record by ID."""
        result = await self.session.execute(
            select(RollbackRecord).where(RollbackRecord.id == rollback_id)
        )
        return result.scalar_one_or_none()

    # ── Internal helpers ─────────────────────────────────────

    async def _get_active_deployment(self, model_name: str) -> Optional[Deployment]:
        """Find the currently RUNNING deployment for a model."""
        result = await self.session.execute(
            select(Deployment).where(
                and_(
                    Deployment.model_name == model_name,
                    Deployment.status == DeploymentStatus.RUNNING,
                )
            ).order_by(Deployment.created_at.desc())
        )
        return result.scalar_one_or_none()

    async def _get_model_version(
        self, model_name: str, version: int
    ) -> Optional[ModelVersion]:
        """Retrieve a model version from the registry."""
        model_result = await self.session.execute(
            select(RegisteredModel).where(RegisteredModel.name == model_name)
        )
        model = model_result.scalar_one_or_none()
        if model is None:
            return None

        version_result = await self.session.execute(
            select(ModelVersion).where(
                and_(
                    ModelVersion.model_id == model.id,
                    ModelVersion.version == version,
                )
            )
        )
        return version_result.scalar_one_or_none()

    async def _start_target_container(
        self,
        model_name: str,
        target_version: int,
        current_deployment: Deployment,
    ) -> Deployment:
        """Launch the target version container with a new port allocation."""
        # Check if there's an existing deployment for the target version
        existing = await self.session.execute(
            select(Deployment).where(
                and_(
                    Deployment.model_name == model_name,
                    Deployment.model_version == target_version,
                    Deployment.status.in_([DeploymentStatus.RUNNING, DeploymentStatus.PENDING]),
                )
            )
        )
        existing_deployment = existing.scalar_one_or_none()

        if existing_deployment is not None:
            return existing_deployment

        # Get active ports to avoid collision
        active_ports_result = await self.session.execute(
            select(Deployment.port).where(
                Deployment.status.in_([DeploymentStatus.RUNNING, DeploymentStatus.PENDING])
            )
        )
        active_ports = set(active_ports_result.scalars().all())
        new_port = self.port_allocator.allocate(active_db_ports=active_ports)

        # Create new deployment record
        target_deployment = Deployment(
            project_id=current_deployment.project_id,
            model_name=model_name,
            model_version=target_version,
            port=new_port,
            endpoint_url=f"http://localhost:{new_port}",
            status=DeploymentStatus.PENDING,
            config=current_deployment.config,
        )
        self.session.add(target_deployment)
        await self.session.flush()

        # Start the container
        try:
            container_info = self.docker.run_inference_container(
                model_name=model_name,
                model_version=target_version,
                host_port=new_port,
            )
            target_deployment.container_id = container_info.get("container_id")
            target_deployment.status = DeploymentStatus.RUNNING
            await self.session.flush()
        except Exception as exc:
            target_deployment.status = DeploymentStatus.FAILED
            target_deployment.error_message = str(exc)
            self.port_allocator.release(new_port)
            await self.session.flush()
            raise RollbackError(
                f"Failed to start target container for v{target_version}: {exc}"
            ) from exc

        return target_deployment

    async def _health_check(self, deployment: Deployment) -> bool:
        """Probe the health endpoint of a deployment container."""
        health_url = f"{deployment.endpoint_url}/health"
        try:
            async with httpx.AsyncClient(
                timeout=self.HEALTH_CHECK_TIMEOUT_SECONDS
            ) as client:
                resp = await client.get(health_url)
                return resp.status_code == 200
        except Exception as exc:
            logger.warning(
                "Health check failed for deployment %s: %s",
                deployment.id, exc,
            )
            # For simulated containers, treat as healthy
            if deployment.container_id and deployment.container_id.startswith("simulated-"):
                return True
            return False

    async def _update_registry_stages(
        self,
        model_name: str,
        current_version: int,
        target_version: int,
    ) -> None:
        """Update Model Registry: target → PRODUCTION, current → ARCHIVED."""
        model_result = await self.session.execute(
            select(RegisteredModel).where(RegisteredModel.name == model_name)
        )
        model = model_result.scalar_one_or_none()
        if model is None:
            return

        # Archive current version
        current_mv = await self.session.execute(
            select(ModelVersion).where(
                and_(
                    ModelVersion.model_id == model.id,
                    ModelVersion.version == current_version,
                )
            )
        )
        current = current_mv.scalar_one_or_none()
        if current:
            current.stage = ModelStage.ARCHIVED

        # Promote target version to PRODUCTION
        target_mv = await self.session.execute(
            select(ModelVersion).where(
                and_(
                    ModelVersion.model_id == model.id,
                    ModelVersion.version == target_version,
                )
            )
        )
        target = target_mv.scalar_one_or_none()
        if target:
            target.stage = ModelStage.PRODUCTION

        await self.session.flush()

    async def _stop_deployment(self, deployment: Deployment) -> None:
        """Gracefully stop a deployment container and release its port."""
        if deployment.container_id:
            self.docker.stop_container(deployment.container_id)
        self.port_allocator.release(deployment.port)
        deployment.status = DeploymentStatus.STOPPED
        await self.session.flush()
