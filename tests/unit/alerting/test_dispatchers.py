"""Unit tests for Webhook, Slack, Discord, and Email notification dispatchers (Issue #22)."""

import hmac
import hashlib
from datetime import datetime, timezone
import pytest
from unittest.mock import AsyncMock, MagicMock, patch

from packages.core.models.alert import Alert, AlertSeverity, AlertStatus
from packages.alerting.dispatchers.webhook import WebhookDispatcher
from packages.alerting.dispatchers.slack import SlackDispatcher
from packages.alerting.dispatchers.discord import DiscordDispatcher
from packages.alerting.dispatchers.manager import NotificationManager


@pytest.fixture
def sample_alert():
    return Alert(
        id="alert-test-123",
        event_type="DATA_DRIFT",
        severity=AlertSeverity.HIGH,
        title="High Data Drift Detected",
        message="33% of features exhibited significant distribution shift",
        model_name="fraud-detector",
        deployment_id="dep-456",
        status=AlertStatus.OPEN,
        created_at=datetime.now(timezone.utc),
    )


class TestDispatchers:
    """Test individual dispatcher formatters and payload signatures."""

    @pytest.mark.asyncio
    async def test_webhook_dispatcher_with_hmac_signature(self, sample_alert):
        secret = "super_secret_key"
        dispatcher = WebhookDispatcher(endpoint_url="http://example.com/webhook", secret_key=secret)

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_post.return_value = mock_resp

            success = await dispatcher.dispatch(sample_alert)
            assert success is True

            call_kwargs = mock_post.call_args[1]
            headers = call_kwargs["headers"]
            assert "X-MLite-Signature" in headers
            assert headers["X-MLite-Signature"].startswith("sha256=")

    @pytest.mark.asyncio
    async def test_slack_dispatcher_payload_formatting(self, sample_alert):
        dispatcher = SlackDispatcher(webhook_url="https://hooks.slack.com/services/T/B/X")

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 200
            mock_post.return_value = mock_resp

            success = await dispatcher.dispatch(sample_alert)
            assert success is True

            call_kwargs = mock_post.call_args[1]
            payload = call_kwargs["json"]
            assert "attachments" in payload
            attachment = payload["attachments"][0]
            assert "HIGH" in attachment["title"]
            assert attachment["color"] == "#ea580c"  # Orange/red border for HIGH

    @pytest.mark.asyncio
    async def test_discord_dispatcher_embed_payload(self, sample_alert):
        dispatcher = DiscordDispatcher(webhook_url="https://discord.com/api/webhooks/1/2")

        with patch("httpx.AsyncClient.post") as mock_post:
            mock_resp = MagicMock()
            mock_resp.status_code = 204
            mock_post.return_value = mock_resp

            success = await dispatcher.dispatch(sample_alert)
            assert success is True

            call_kwargs = mock_post.call_args[1]
            embeds = call_kwargs["json"]["embeds"]
            assert len(embeds) == 1
            assert "HIGH" in embeds[0]["title"]

    @pytest.mark.asyncio
    async def test_notification_manager_retries_transient_failure(self, sample_alert):
        mock_disp = AsyncMock()
        # First attempt fails, second attempt succeeds
        mock_disp.dispatch.side_effect = [False, True]

        manager = NotificationManager(dispatchers=[mock_disp], max_retries=3, initial_backoff=0.01)
        results = await manager.broadcast_alert(sample_alert)

        assert results == [True]
        assert mock_disp.dispatch.call_count == 2
