"""Alert engine for threshold evaluation, deduplication, cooldown, and notification dispatch."""

from datetime import datetime, timezone, timedelta
import logging
from typing import Any, Dict, List, Optional

from sqlalchemy import select, and_
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.alert import Alert, AlertSeverity, AlertStatus
from packages.alerting.dispatchers.manager import NotificationManager

logger = logging.getLogger(__name__)


class AlertEngine:
    """Evaluates incoming monitoring events, enforces cooldowns, and dispatches notifications."""

    DEFAULT_COOLDOWN_SECONDS = 3600  # 1 hour

    def __init__(
        self,
        session: AsyncSession,
        notification_manager: Optional[NotificationManager] = None,
        cooldown_seconds: int = DEFAULT_COOLDOWN_SECONDS,
    ) -> None:
        self.session = session
        self.notifier = notification_manager or NotificationManager()
        self.cooldown_seconds = cooldown_seconds

    async def is_in_cooldown(
        self,
        event_type: str,
        model_name: Optional[str] = None,
        deployment_id: Optional[str] = None,
    ) -> bool:
        """Check if an identical alert was recently created within the cooldown window."""
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=self.cooldown_seconds)

        conditions = [
            Alert.event_type == event_type,
            Alert.created_at >= cutoff,
            Alert.status != AlertStatus.RESOLVED,
        ]
        if model_name:
            conditions.append(Alert.model_name == model_name)
        if deployment_id:
            conditions.append(Alert.deployment_id == deployment_id)

        query = select(Alert).where(and_(*conditions))
        result = await self.session.execute(query)
        recent_alert = result.scalar_one_or_none()
        return recent_alert is not None

    async def trigger_alert(
        self,
        event_type: str,
        title: str,
        message: str,
        severity: AlertSeverity = AlertSeverity.WARNING,
        model_name: Optional[str] = None,
        deployment_id: Optional[str] = None,
        project_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None,
    ) -> Optional[Alert]:
        """Evaluate cooldown, persist alert, and broadcast to notification channels."""
        # 1. Cooldown / deduplication check
        if await self.is_in_cooldown(event_type, model_name, deployment_id):
            logger.info("Alert suppressed by cooldown: %s for model=%s", event_type, model_name)
            return None

        # 2. Persist to DB
        alert = Alert(
            project_id=project_id,
            model_name=model_name,
            deployment_id=deployment_id,
            event_type=event_type,
            severity=severity,
            title=title,
            message=message,
            details_json=details,
            status=AlertStatus.OPEN,
        )
        self.session.add(alert)
        await self.session.flush()
        await self.session.refresh(alert)

        # 3. Broadcast to external channels asynchronously
        try:
            await self.notifier.broadcast_alert(alert)
        except Exception as exc:
            logger.warning("Notification broadcast failed: %s", exc)

        return alert

    async def acknowledge_alert(self, alert_id: str, acknowledged_by: str = "operator") -> Optional[Alert]:
        """Transition alert status to ACKNOWLEDGED."""
        alert = await self.get_alert(alert_id)
        if alert is None:
            return None

        alert.status = AlertStatus.ACKNOWLEDGED
        alert.acknowledged_by = acknowledged_by
        await self.session.flush()
        await self.session.refresh(alert)
        return alert

    async def resolve_alert(self, alert_id: str) -> Optional[Alert]:
        """Transition alert status to RESOLVED."""
        alert = await self.get_alert(alert_id)
        if alert is None:
            return None

        alert.status = AlertStatus.RESOLVED
        alert.resolved_at = datetime.now(timezone.utc)
        await self.session.flush()
        await self.session.refresh(alert)
        return alert

    async def get_alert(self, alert_id: str) -> Optional[Alert]:
        """Fetch alert by UUID."""
        query = select(Alert).where(Alert.id == alert_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def list_alerts(
        self,
        status: Optional[AlertStatus] = None,
        severity: Optional[AlertSeverity] = None,
        model_name: Optional[str] = None,
        limit: int = 50,
    ) -> List[Alert]:
        """Query alert history ordered by creation time descending."""
        query = select(Alert).order_by(Alert.created_at.desc()).limit(limit)
        if status:
            query = query.where(Alert.status == status)
        if severity:
            query = query.where(Alert.severity == severity)
        if model_name:
            query = query.where(Alert.model_name == model_name)

        result = await self.session.execute(query)
        return list(result.scalars().all())
