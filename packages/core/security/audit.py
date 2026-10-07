"""Audit logging service — append-only event recorder (Issue #27).

Records all state-altering operations with user identity, IP address,
timestamps, and before/after metadata diffs.
"""

import logging
from datetime import datetime
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.audit import AuditAction, AuditLog

logger = logging.getLogger(__name__)


class AuditService:
    """Append-only audit log recorder and query service."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def log(
        self,
        action: AuditAction,
        resource_type: str,
        resource_id: str | None = None,
        resource_name: str | None = None,
        user_id: str | None = None,
        user_email: str | None = None,
        ip_address: str | None = None,
        changes: dict[str, Any] | None = None,
        details: dict[str, Any] | None = None,
    ) -> AuditLog:
        """Write an immutable audit log entry.

        This method is designed to never fail silently — if the write
        fails, it logs the error but does not raise to avoid disrupting
        the primary operation.
        """
        try:
            entry = AuditLog(
                user_id=user_id,
                user_email=user_email,
                ip_address=ip_address,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                resource_name=resource_name,
                changes_json=changes if changes is not None else details,
            )
            self.session.add(entry)
            await self.session.flush()
            await self.session.refresh(entry)
            return entry
        except Exception as exc:
            logger.error(
                "Failed to write audit log: action=%s resource=%s error=%s",
                action.value,
                resource_type,
                exc,
            )
            raise

    async def query(
        self,
        action: AuditAction | None = None,
        resource_type: str | None = None,
        resource_id: str | None = None,
        user_id: str | None = None,
        from_date: datetime | None = None,
        to_date: datetime | None = None,
        limit: int = 50,
    ) -> list[AuditLog]:
        """Query audit log entries with optional filters."""
        query = select(AuditLog).order_by(AuditLog.timestamp.desc()).limit(limit)

        if action:
            query = query.where(AuditLog.action == action)
        if resource_type:
            query = query.where(AuditLog.resource_type == resource_type)
        if resource_id:
            query = query.where(AuditLog.resource_id == resource_id)
        if user_id:
            query = query.where(AuditLog.user_id == user_id)
        if from_date:
            query = query.where(AuditLog.timestamp >= from_date)
        if to_date:
            query = query.where(AuditLog.timestamp <= to_date)

        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_entry(self, entry_id: str) -> AuditLog | None:
        """Fetch a specific audit log entry."""
        result = await self.session.execute(select(AuditLog).where(AuditLog.id == entry_id))
        return result.scalar_one_or_none()
