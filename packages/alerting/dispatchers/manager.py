"""Notification manager orchestrating multi-channel delivery and retries."""

import asyncio
import logging
from typing import List, Optional

from packages.alerting.dispatchers.base import BaseDispatcher
from packages.core.models.alert import Alert

logger = logging.getLogger(__name__)


class NotificationManager:
    """Manages dispatchers and orchestrates retried alert delivery."""

    def __init__(
        self,
        dispatchers: Optional[List[BaseDispatcher]] = None,
        max_retries: int = 3,
        initial_backoff: float = 1.0,
    ) -> None:
        self.dispatchers = dispatchers or []
        self.max_retries = max_retries
        self.initial_backoff = initial_backoff

    def add_dispatcher(self, dispatcher: BaseDispatcher) -> None:
        """Register a notification dispatcher."""
        self.dispatchers.append(dispatcher)

    async def broadcast_alert(self, alert: Alert) -> List[bool]:
        """Deliver alert to all configured channels with exponential backoff retry."""
        results = []
        for dispatcher in self.dispatchers:
            delivered = False
            for attempt in range(1, self.max_retries + 1):
                try:
                    success = await dispatcher.dispatch(alert)
                    if success:
                        delivered = True
                        break
                except Exception as exc:
                    logger.warning(
                        "Dispatch error on attempt %d/%d for %s: %s",
                        attempt,
                        self.max_retries,
                        type(dispatcher).__name__,
                        exc,
                    )

                if attempt < self.max_retries:
                    backoff = self.initial_backoff * (2 ** (attempt - 1))
                    await asyncio.sleep(backoff)

            results.append(delivered)
        return results
