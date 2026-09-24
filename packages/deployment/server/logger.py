"""Asynchronous inference payload logger for drift monitoring and auditing."""

import asyncio
import json
import logging
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class InferencePayloadLogger:
    """Buffers and asynchronously flushes inference logs to storage for drift analysis."""

    def __init__(self, buffer_capacity: int = 100) -> None:
        self.buffer_capacity = buffer_capacity
        self._buffer: List[Dict[str, Any]] = []
        self._lock = asyncio.Lock()

    async def log_inference(
        self,
        model_name: str,
        model_version: str,
        request_payload: Dict[str, Any],
        predictions: List[Any],
        latency_ms: float,
        timestamp: Optional[datetime] = None,
    ) -> None:
        """Record an inference event into the buffer."""
        record = {
            "timestamp": (timestamp or datetime.now(timezone.utc)).isoformat(),
            "model": model_name,
            "version": model_version,
            "inputs": request_payload,
            "predictions": predictions,
            "latency_ms": latency_ms,
        }

        async with self._lock:
            self._buffer.append(record)
            if len(self._buffer) >= self.buffer_capacity:
                await self.flush()

    async def flush(self) -> List[Dict[str, Any]]:
        """Flush the current buffer and return stored records."""
        async with self._lock:
            flushed = list(self._buffer)
            self._buffer.clear()

        if flushed:
            logger.debug("Flushed %d inference payload records", len(flushed))
        return flushed

    @property
    def buffer_size(self) -> int:
        """Current number of unflushed records in buffer."""
        return len(self._buffer)
