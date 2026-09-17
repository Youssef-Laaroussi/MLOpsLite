"""Unit tests for AlertEngine threshold evaluation, cooldown, and lifecycle states (Issue #21)."""

from datetime import datetime, timezone, timedelta
import pytest
from unittest.mock import AsyncMock, MagicMock

from packages.core.models.alert import Alert, AlertSeverity, AlertStatus
from packages.alerting.engine import AlertEngine
from packages.alerting.dispatchers.manager import NotificationManager


class TestAlertEngine:
    """Test alert creation, cooldown suppression, acknowledgement, and resolution."""

    @pytest.mark.asyncio
    async def test_trigger_alert_creates_and_broadcasts(self):
        session = AsyncMock()
        notifier = MagicMock(spec=NotificationManager)
        notifier.broadcast_alert = AsyncMock(return_value=[True])

        engine = AlertEngine(session=session, notification_manager=notifier)
        engine.is_in_cooldown = AsyncMock(return_value=False)

        alert = await engine.trigger_alert(
            event_type="DATA_DRIFT",
            title="High data drift detected",
            message="Feature 'transaction_amount' shifted significantly",
            severity=AlertSeverity.HIGH,
            model_name="fraud-detector",
        )

        assert alert is not None
        assert alert.event_type == "DATA_DRIFT"
        assert alert.severity == AlertSeverity.HIGH
        assert alert.status == AlertStatus.OPEN
        session.add.assert_called_once()
        notifier.broadcast_alert.assert_called_once()

    @pytest.mark.asyncio
    async def test_cooldown_suppresses_duplicate_alert(self):
        session = AsyncMock()
        notifier = MagicMock(spec=NotificationManager)

        engine = AlertEngine(session=session, notification_manager=notifier)
        engine.is_in_cooldown = AsyncMock(return_value=True)  # Already fired recently

        alert = await engine.trigger_alert(
            event_type="DATA_DRIFT",
            title="High data drift detected",
            message="Feature shifted",
            severity=AlertSeverity.HIGH,
            model_name="fraud-detector",
        )

        assert alert is None
        session.add.assert_not_called()

    @pytest.mark.asyncio
    async def test_acknowledge_and_resolve_lifecycle(self):
        session = AsyncMock()
        existing_alert = Alert(
            id="al-123",
            event_type="CONTAINER_CRASH",
            title="Container crashed",
            message="Exited with code 137",
            status=AlertStatus.OPEN,
        )

        engine = AlertEngine(session=session)
        engine.get_alert = AsyncMock(return_value=existing_alert)

        # Acknowledge
        acked = await engine.acknowledge_alert("al-123", acknowledged_by="alice")
        assert acked.status == AlertStatus.ACKNOWLEDGED
        assert acked.acknowledged_by == "alice"

        # Resolve
        resolved = await engine.resolve_alert("al-123")
        assert resolved.status == AlertStatus.RESOLVED
        assert resolved.resolved_at is not None
