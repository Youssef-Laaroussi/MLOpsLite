"""Base notification dispatcher interface."""

from abc import ABC, abstractmethod
from typing import Any, Dict

from packages.core.models.alert import Alert


class BaseDispatcher(ABC):
    """Abstract interface for alert notification dispatchers."""

    @abstractmethod
    async def dispatch(self, alert: Alert) -> bool:
        """Deliver alert to destination channel. Returns True on success."""
        pass
