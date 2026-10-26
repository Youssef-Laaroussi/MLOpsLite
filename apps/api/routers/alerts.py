"""Alerting, incident management, rules, and webhook channel REST endpoints (Issues #21, #22)."""

from datetime import UTC, datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.alerting.dispatchers.manager import NotificationManager
from packages.alerting.engine import AlertEngine
from packages.alerting.rules import build_dispatcher, evaluate_rules, load_dispatchers
from packages.core.models.alert import (
    Alert,
    AlertRule,
    AlertSeverity,
    AlertStatus,
    NotificationChannel,
)
from packages.core.schemas.alert import (
    AlertCreate,
    AlertListResponse,
    AlertResponse,
    AlertRuleCreate,
    AlertRuleResponse,
    AlertRuleUpdate,
    AlertSummaryResponse,
    NotificationChannelCreate,
    NotificationChannelResponse,
    RuleEvaluationResponse,
)

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])


async def _get_engine(session: AsyncSession = Depends(get_db)) -> AlertEngine:
    dispatchers = await load_dispatchers(session)
    notifier = NotificationManager(dispatchers=dispatchers)
    return AlertEngine(session=session, notification_manager=notifier)


# ── Alerts CRUD & Actions ──────────────────────────────────────────


@router.post("/", response_model=AlertResponse, status_code=status.HTTP_201_CREATED)
async def create_alert(
    payload: AlertCreate,
    engine: AlertEngine = Depends(_get_engine),
) -> Any:
    """Manually trigger or ingest an alert event."""
    alert = await engine.trigger_alert(
        event_type=payload.event_type,
        title=payload.title,
        message=payload.message or payload.description or payload.title,
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
    status: AlertStatus | None = Query(
        None, description="Filter by status (OPEN, ACKNOWLEDGED, RESOLVED)"
    ),
    severity: AlertSeverity | None = Query(
        None, description="Filter by severity (INFO, WARNING, HIGH, CRITICAL)"
    ),
    model_name: str | None = Query(None, description="Filter by model name"),
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


@router.get("/summary", response_model=AlertSummaryResponse)
async def get_alerts_summary(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Compute real KPI metrics: active criticals, warnings, 7d resolved, and MTTR in minutes."""
    # 1. Open critical count
    crit_q = select(func.count(Alert.id)).where(
        Alert.status != AlertStatus.RESOLVED,
        Alert.severity == AlertSeverity.CRITICAL,
    )
    crit_res = await db.execute(crit_q)
    open_critical = crit_res.scalar() or 0

    # 2. Open warning/high count
    warn_q = select(func.count(Alert.id)).where(
        Alert.status != AlertStatus.RESOLVED,
        Alert.severity.in_([AlertSeverity.WARNING, AlertSeverity.HIGH, AlertSeverity.INFO]),
    )
    warn_res = await db.execute(warn_q)
    open_warning = warn_res.scalar() or 0

    # 3. Resolved in last 7 days
    seven_days_ago = datetime.now(UTC) - timedelta(days=7)
    res_7d_q = select(func.count(Alert.id)).where(
        Alert.status == AlertStatus.RESOLVED,
        Alert.resolved_at >= seven_days_ago,
    )
    res_7d_res = await db.execute(res_7d_q)
    resolved_7d = res_7d_res.scalar() or 0

    # 4. Mean Time To Resolve (MTTR) across all resolved alerts
    resolved_alerts_q = select(Alert.created_at, Alert.resolved_at).where(
        Alert.status == AlertStatus.RESOLVED,
        Alert.resolved_at.is_not(None),
    )
    resolved_res = await db.execute(resolved_alerts_q)
    rows = resolved_res.all()
    mttr_minutes: float | None = None
    if rows:
        durations = [
            (resolved_at - created_at).total_seconds() / 60.0
            for created_at, resolved_at in rows
            if resolved_at and created_at and resolved_at >= created_at
        ]
        if durations:
            mttr_minutes = round(sum(durations) / len(durations), 1)

    return AlertSummaryResponse(
        open_critical=open_critical,
        open_warning=open_warning,
        resolved_7d=resolved_7d,
        mttr_minutes=mttr_minutes,
    )


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


# ── Alert Rules ────────────────────────────────────────────────────


@router.get("/rules", response_model=list[AlertRuleResponse])
async def list_alert_rules(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """List all configured persistent alert threshold rules."""
    result = await db.execute(select(AlertRule).order_by(AlertRule.created_at.desc()))
    return list(result.scalars().all())


@router.post("/rules", response_model=AlertRuleResponse, status_code=status.HTTP_201_CREATED)
async def create_alert_rule(
    payload: AlertRuleCreate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Create and persist a new threshold alert rule in PostgreSQL."""
    rule = AlertRule(
        name=payload.name,
        metric=payload.metric,
        operator=payload.operator,
        threshold=payload.threshold,
        model_name=payload.model_name,
        severity=payload.severity,
        enabled=payload.enabled,
    )
    db.add(rule)
    await db.flush()
    await db.refresh(rule)
    return rule


@router.patch("/rules/{rule_id}", response_model=AlertRuleResponse)
async def update_alert_rule(
    rule_id: str,
    payload: AlertRuleUpdate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Enable or disable a threshold alert rule."""
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise NotFoundError("AlertRule", rule_id)
    rule.enabled = payload.enabled
    await db.flush()
    await db.refresh(rule)
    return rule


@router.delete("/rules/{rule_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_alert_rule(
    rule_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a threshold alert rule."""
    result = await db.execute(select(AlertRule).where(AlertRule.id == rule_id))
    rule = result.scalar_one_or_none()
    if not rule:
        raise NotFoundError("AlertRule", rule_id)
    await db.delete(rule)
    await db.flush()


@router.post("/rules/evaluate", response_model=RuleEvaluationResponse)
async def trigger_rule_evaluation(
    db: AsyncSession = Depends(get_db),
    engine: AlertEngine = Depends(_get_engine),
) -> Any:
    """Evaluate active rules against real PostgreSQL metrics."""
    evaluated, triggered = await evaluate_rules(db, engine)
    return {
        "evaluated": evaluated,
        "triggered": triggered,
    }


# ── Notification Channels ──────────────────────────────────────────


@router.get("/channels", response_model=list[NotificationChannelResponse])
async def list_notification_channels(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """List configured outbound webhook notification channels."""
    result = await db.execute(
        select(NotificationChannel).order_by(NotificationChannel.created_at.desc())
    )
    return list(result.scalars().all())


@router.post(
    "/channels", response_model=NotificationChannelResponse, status_code=status.HTTP_201_CREATED
)
async def create_notification_channel(
    payload: NotificationChannelCreate,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Add and persist a new Slack / Discord / Webhook outbound channel."""
    channel = NotificationChannel(
        name=payload.name,
        kind=payload.kind,
        url=str(payload.url),
        enabled=True,
    )
    db.add(channel)
    await db.flush()
    await db.refresh(channel)
    return channel


@router.delete("/channels/{channel_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_notification_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
) -> None:
    """Delete a notification channel."""
    result = await db.execute(
        select(NotificationChannel).where(NotificationChannel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise NotFoundError("NotificationChannel", channel_id)
    await db.delete(channel)
    await db.flush()


@router.post("/channels/{channel_id}/test")
async def test_notification_channel(
    channel_id: str,
    db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    """Dispatch a test synthetic event through the real dispatcher and record the result."""
    result = await db.execute(
        select(NotificationChannel).where(NotificationChannel.id == channel_id)
    )
    channel = result.scalar_one_or_none()
    if not channel:
        raise NotFoundError("NotificationChannel", channel_id)

    dummy_alert = Alert(
        id="test-ping",
        event_type="TEST_PROBE",
        severity=AlertSeverity.INFO,
        title="MLite Notification Probe",
        message=f"Synthetic test event sent to channel '{channel.name}'",
        model_name="mlite-core",
        status=AlertStatus.OPEN,
    )

    dispatcher = build_dispatcher(channel)
    delivered = False
    error_msg: str | None = None
    try:
        delivered = await dispatcher.dispatch(dummy_alert)
    except Exception as exc:
        error_msg = str(exc)

    channel.last_test_at = datetime.now(UTC)
    channel.last_test_ok = delivered
    await db.flush()

    return {
        "channel_id": channel.id,
        "name": channel.name,
        "delivered": delivered,
        "error": error_msg,
    }
