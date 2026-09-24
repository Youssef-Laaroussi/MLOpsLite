"""Alerting and incident management REST endpoints (Issues #21, #22)."""

from typing import Any, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.core.models.alert import AlertSeverity, AlertStatus
from packages.core.schemas.alert import (
    AlertCreate,
    AlertResponse,
    AlertListResponse,
)
from packages.alerting.engine import AlertEngine

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])


def _get_engine(session: AsyncSession = Depends(get_db)) -> AlertEngine:
    return AlertEngine(session)


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    payload: AlertCreate,
    engine: AlertEngine = Depends(_get_engine),
) -> Any:
    """Manually trigger or ingest an alert event."""
    alert = await engine.trigger_alert(
        event_type=payload.event_type,
        title=payload.title,
        message=payload.message,
        severity=payload.severity,
        model_name=payload.model_name,
        deployment_id=payload.deployment_id,
        project_id=payload.project_id,
        details=payload.details_json,
    )
    if alert is None:
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Alert suppressed by active cooldown window",
        )
    return alert


@router.get("/", response_model=AlertListResponse)
async def list_alerts(
    status: Optional[AlertStatus] = Query(None, description="Filter by status (OPEN, ACKNOWLEDGED, RESOLVED)"),
    severity: Optional[AlertSeverity] = Query(None, description="Filter by severity (INFO, WARNING, HIGH, CRITICAL)"),
    model_name: Optional[str] = Query(None, description="Filter by model name"),
    limit: int = Query(50, ge=1, le=200),
    engine: AlertEngine = Depends(_get_engine),
) -> Any:
    """Query recent alerts and incident history."""
    alerts = await engine.list_alerts(
        status=status,
        severity=severity,
        model_name=model_name,
        limit=limit,
    )
    return {
        "alerts": alerts,
        "total": len(alerts),
    }


@router.post("/{alert_id}/acknowledge", response_model=AlertResponse)
async def acknowledge_alert(
    alert_id: str,
    user: str = Query("operator", description="Acknowledged by operator name"),
    engine: AlertEngine = Depends(_get_engine),
) -> Any:
    """Mark an alert as acknowledged."""
    alert = await engine.acknowledge_alert(alert_id, acknowledged_by=user)
    if alert is None:
        raise NotFoundError("Alert", alert_id)
    return alert


@router.post("/{alert_id}/resolve", response_model=AlertResponse)
async def resolve_alert(
    alert_id: str,
    engine: AlertEngine = Depends(_get_engine),
) -> Any:
    """Mark an alert as resolved."""
    alert = await engine.resolve_alert(alert_id)
    if alert is None:
        raise NotFoundError("Alert", alert_id)
    return alert
