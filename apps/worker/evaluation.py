"""Periodic evaluation of configured alert and rollback rules."""

import asyncio
import logging

from sqlalchemy import text

from apps.api.routers.alerts import _get_engine
from packages.alerting.rules import evaluate_rules
from packages.core.db.session import async_session_factory
from packages.rollback.policies import AutoRollbackEvaluator

logger = logging.getLogger(__name__)


async def evaluate_periodically(interval_seconds: int) -> None:
    while True:
        for name, lock_id in (("alerts", 716001), ("rollback", 716002)):
            try:
                async with async_session_factory.begin() as session:
                    if session.get_bind().dialect.name == "postgresql":
                        # Avoid running the same job concurrently across API processes.
                        acquired = await session.scalar(
                            text("SELECT pg_try_advisory_xact_lock(CAST(:key AS bigint))"),
                            {"key": lock_id},
                        )
                        if not acquired:
                            continue
                    if name == "alerts":
                        await evaluate_rules(session, await _get_engine(session))
                    else:
                        await AutoRollbackEvaluator(session).evaluate_all_policies()
            except Exception:
                logger.exception("Periodic %s evaluation failed", name)
        await asyncio.sleep(interval_seconds)
