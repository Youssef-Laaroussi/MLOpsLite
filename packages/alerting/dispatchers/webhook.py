"""Generic webhook notification dispatcher with HMAC-SHA256 signature verification."""

import hashlib
import hmac
import json
import logging
from typing import Optional

import httpx

from packages.alerting.dispatchers.base import BaseDispatcher
from packages.core.models.alert import Alert

logger = logging.getLogger(__name__)


class WebhookDispatcher(BaseDispatcher):
    """Sends JSON alert payloads via HTTP POST with optional HMAC signature."""

    def __init__(self, endpoint_url: str, secret_key: Optional[str] = None, timeout: float = 5.0) -> None:
        self.endpoint_url = endpoint_url
        self.secret_key = secret_key
        self.timeout = timeout

    async def dispatch(self, alert: Alert) -> bool:
        """Deliver alert payload to webhook endpoint."""
        payload = {
            "id": alert.id,
            "event_type": alert.event_type,
            "severity": alert.severity.value,
            "title": alert.title,
            "message": alert.message,
            "model_name": alert.model_name,
            "deployment_id": alert.deployment_id,
            "details": alert.details_json,
            "created_at": alert.created_at.isoformat() if alert.created_at else None,
        }
        body_bytes = json.dumps(payload, sort_keys=True).encode("utf-8")
        headers = {"Content-Type": "application/json"}

        if self.secret_key:
            signature = hmac.new(
                self.secret_key.encode("utf-8"), body_bytes, hashlib.sha256
            ).hexdigest()
            headers["X-MLite-Signature"] = f"sha256={signature}"

        try:
            async with httpx.AsyncClient(timeout=self.timeout) as client:
                res = await client.post(self.endpoint_url, content=body_bytes, headers=headers)
                return res.status_code in (200, 201, 202, 204)
        except Exception as exc:
            logger.warning("Webhook dispatch failed for %s: %s", self.endpoint_url, exc)
            return False
