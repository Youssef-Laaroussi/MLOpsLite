"""Discord Webhook alert dispatcher using rich embeds."""

import logging
from typing import Optional

import httpx

from packages.alerting.dispatchers.base import BaseDispatcher
from packages.core.models.alert import Alert

logger = logging.getLogger(__name__)


class DiscordDispatcher(BaseDispatcher):
    """Formats and posts alerts to Discord webhook channels via embeds."""

    SEVERITY_COLORS = {
        "INFO": 0x0284C7,
        "WARNING": 0xF59E0B,
        "HIGH": 0xEA580C,
        "CRITICAL": 0xDC2626,
    }

    def __init__(self, webhook_url: str, timeout: float = 5.0) -> None:
        self.webhook_url = webhook_url
        self.timeout = timeout

    async def dispatch(self, alert: Alert) -> bool:
        """Format alert as a Discord embed."""
        color = self.SEVERITY_COLORS.get(alert.severity.value, 0x64748B)

        payload = {
            "embeds": [
                {
                    "title": f"🚨 [{alert.severity.value}] {alert.title}",
                    "description": alert.message,
                    "color": color,
                    "fields": [
                        {"name": "Event Type", "value": alert.event_type, "inline": True},
                        {"name": "Model", "value": alert.model_name or "N/A", "inline": True},
                        {"name": "Deployment", "value": alert.deployment_id or "N/A", "inline": True},
                    ],
                    "footer": {"text": "MLite MLOps Platform"},
                    "timestamp": alert.created_at.isoformat() if alert.created_at else None,
                }
            ]
        }

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(self.webhook_url, json=payload)
                return res.status_code in (200, 204)
        except Exception as exc:
            logger.warning("Discord dispatch failed: %s", exc)
            return False
