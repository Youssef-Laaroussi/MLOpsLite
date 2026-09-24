"""Slack Incoming Webhook alert dispatcher using Block Kit formatting."""

import logging
from typing import Optional

import httpx

from packages.alerting.dispatchers.base import BaseDispatcher
from packages.core.models.alert import Alert

logger = logging.getLogger(__name__)


class SlackDispatcher(BaseDispatcher):
    """Formats and posts alerts to Slack incoming webhook channels."""

    SEVERITY_COLORS = {
        "INFO": "#0284c7",
        "WARNING": "#f59e0b",
        "HIGH": "#ea580c",
        "CRITICAL": "#dc2626",
    }

    def __init__(self, webhook_url: str, timeout: float = 5.0) -> None:
        self.webhook_url = webhook_url
        self.timeout = timeout

    async def dispatch(self, alert: Alert) -> bool:
        """Format alert as Slack attachment with color-coded border."""
        color = self.SEVERITY_COLORS.get(alert.severity.value, "#64748b")

        payload = {
            "attachments": [
                {
                    "color": color,
                    "title": f"[{alert.severity.value}] {alert.title}",
                    "text": alert.message,
                    "fields": [
                        {"title": "Event", "value": alert.event_type, "short": True},
                        {"title": "Model", "value": alert.model_name or "N/A", "short": True},
                        {"title": "Status", "value": alert.status.value, "short": True},
                        {"title": "Deployment ID", "value": alert.deployment_id or "N/A", "short": True},
                    ],
                    "footer": "MLite Alert Engine",
                    "ts": int(alert.created_at.timestamp()) if alert.created_at else None,
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(self.webhook_url, json=payload)
                return res.status_code == 200
        except Exception as exc:
            logger.warning("Slack dispatch failed: %s", exc)
            return False
