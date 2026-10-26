"""Evaluates persisted AlertRules against real metrics stored in PostgreSQL."""

import operator
from collections.abc import Callable

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.alerting.dispatchers import (
    BaseDispatcher,
    DiscordDispatcher,
    SlackDispatcher,
    WebhookDispatcher,
)
from packages.alerting.engine import AlertEngine
from packages.core.models.alert import Alert, AlertRule, NotificationChannel
from packages.core.models.deployment import Deployment, DeploymentMetric, DeploymentStatus
from packages.core.models.monitoring import DriftEvaluation

OPERATORS: dict[str, Callable[[float, float], bool]] = {
    ">": operator.gt,
    ">=": operator.ge,
    "<": operator.lt,
    "<=": operator.le,
}

_DISPATCHERS: dict[str, type[BaseDispatcher]] = {
    "SLACK": SlackDispatcher,
    "DISCORD": DiscordDispatcher,
    "WEBHOOK": WebhookDispatcher,
}


def build_dispatcher(channel: NotificationChannel) -> BaseDispatcher:
    return _DISPATCHERS[channel.kind](channel.url)


async def load_dispatchers(session: AsyncSession) -> list[BaseDispatcher]:
    res = await session.execute(
        select(NotificationChannel).where(NotificationChannel.enabled.is_(True))
    )
    return [build_dispatcher(c) for c in res.scalars().all()]


def _latest_per_model(rows) -> dict[str, float]:
    """rows ordered newest-first as (model_name, value) -> keep first value per model."""
    out: dict[str, float] = {}
    for model, value in rows:
        if model is not None and value is not None:
            out.setdefault(model, float(value))
    return out


async def observe(session: AsyncSession, metric: str) -> dict[str, float]:
    """Return the current observed value of `metric` per model, read from real tables."""
    if metric == "drift_share":
        q = select(DriftEvaluation.model_name, DriftEvaluation.drift_share).order_by(
            DriftEvaluation.created_at.desc()
        )
        return _latest_per_model((await session.execute(q)).all())
    if metric == "latency_p95_ms":
        q = (
            select(Deployment.model_name, DeploymentMetric.latency_p95_ms)
            .join(Deployment, DeploymentMetric.deployment_id == Deployment.id)
            .order_by(DeploymentMetric.timestamp.desc())
        )
        return _latest_per_model((await session.execute(q)).all())
    if metric == "failed_deployments":
        q = (
            select(Deployment.model_name, func.count(Deployment.id))
            .where(Deployment.status == DeploymentStatus.FAILED)
            .group_by(Deployment.model_name)
        )
        return {m: float(c) for m, c in (await session.execute(q)).all()}
    raise ValueError(f"Unsupported metric: {metric}")


async def evaluate_rules(session: AsyncSession, engine: AlertEngine) -> tuple[int, list[Alert]]:
    """Evaluate every enabled rule; returns (rules evaluated, alerts actually created)."""
    rules = (
        (await session.execute(select(AlertRule).where(AlertRule.enabled.is_(True))))
        .scalars()
        .all()
    )
    cache: dict[str, dict[str, float]] = {}
    triggered: list[Alert] = []
    for rule in rules:
        if rule.metric not in cache:
            cache[rule.metric] = await observe(session, rule.metric)
        for model, value in cache[rule.metric].items():
            if rule.model_name and model != rule.model_name:
                continue
            if not OPERATORS[rule.operator](value, rule.threshold):
                continue
            alert = await engine.trigger_alert(
                event_type=f"RULE_{rule.metric.upper()}",
                title=rule.name,
                message=f"{rule.metric} = {value:g} ({rule.operator} {rule.threshold:g}) on {model}",
                severity=rule.severity,
                model_name=model,
                details={"rule_id": rule.id, "observed": value, "threshold": rule.threshold},
            )
            if alert is not None:  # None => suppressed by cooldown (deduplicated)
                triggered.append(alert)
    return len(rules), triggered
