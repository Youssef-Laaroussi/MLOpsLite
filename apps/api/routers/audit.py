"""Audit log REST endpoints (Issue #27).

Provides:
- GET /api/v1/audit/logs — Query immutable audit logs with filtering
- GET /api/v1/audit/logs/{id} — Fetch single audit log entry
- Rejection of PUT/DELETE to enforce append-only immutability
"""

from datetime import datetime
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.core.models.audit import AuditAction
from packages.core.schemas.security import (
    AuditLogResponse,
    AuditLogListResponse,
)
from packages.core.security.audit import AuditService
from packages.core.security.dependencies import require_permission
from packages.core.security.rbac import Permission

router = APIRouter(prefix="/api/v1/audit", tags=["Audit Logs"])


@router.get(
    "/logs",
    response_model=AuditLogListResponse,
    dependencies=[Depends(require_permission(Permission.AUDIT_VIEW))],
)
async def list_audit_logs(
    action: Optional[AuditAction] = Query(None, description="Filter by action"),
    resource_type: Optional[str] = Query(None, description="Filter by resource type"),
    resource_id: Optional[str] = Query(None, description="Filter by resource ID"),
    user_id: Optional[str] = Query(None, description="Filter by user ID"),
    from_date: Optional[datetime] = Query(None, description="Filter logs starting from this timestamp"),
    to_date: Optional[datetime] = Query(None, description="Filter logs up to this timestamp"),
    limit: int = Query(50, ge=1, le=500, description="Max entries to return"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Query immutable audit log entries with optional filters."""
    service = AuditService(session=db)
    logs = await service.query(
        action=action,
        resource_type=resource_type,
        resource_id=resource_id,
        user_id=user_id,
        from_date=from_date,
        to_date=to_date,
        limit=limit,
    )
    return {"logs": logs, "total": len(logs)}


@router.get(
    "/logs/{entry_id}",
    response_model=AuditLogResponse,
    dependencies=[Depends(require_permission(Permission.AUDIT_VIEW))],
)
async def get_audit_log(
    entry_id: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Retrieve a single audit log entry by ID."""
    service = AuditService(session=db)
    entry = await service.get_entry(entry_id)
    if entry is None:
        raise NotFoundError("AuditLog", entry_id)
    return entry


@router.delete("/logs/{entry_id}", status_code=status.HTTP_405_METHOD_NOT_ALLOWED)
async def delete_audit_log(entry_id: str) -> None:
    """Audit logs are strictly append-only and immutable. Deletion is prohibited."""
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Audit logs are append-only and immutable. Deletion is strictly prohibited.",
    )


@router.put("/logs/{entry_id}", status_code=status.HTTP_405_METHOD_NOT_ALLOWED)
async def update_audit_log(entry_id: str) -> None:
    """Audit logs are strictly append-only and immutable. Modification is prohibited."""
    raise HTTPException(
        status_code=status.HTTP_405_METHOD_NOT_ALLOWED,
        detail="Audit logs are append-only and immutable. Modification is strictly prohibited.",
    )
