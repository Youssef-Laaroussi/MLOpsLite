"""Auto-Rollback Policy Evaluator (Issue #24).

Background evaluation daemon that inspects active deployments against
configurable policies. When violations persist across consecutive
observation windows, triggers automatic rollback.

Safety features:
- Auto-rollback is disabled by default.
- Rate-limited to 1 auto-rollback per deployment per 24 hours.
- Oscillation guard prevents ping-ponging between versions.
- Optional require_approval mode for human-in-the-loop.
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Dict, List, Optional

from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.deployment import Deployment, DeploymentMetric, DeploymentStatus
from packages.core.models.rollback import (
    RollbackPolicy,
    RollbackRecord,
    RollbackStatus,
    RollbackTrigger,
)
from packages.core.models.monitoring import DriftEvaluation, ModelPerformanceHistory
from packages.rollback.coordinator import RollbackCoordinator, RollbackError

logger = logging.getLogger(__name__)


class PolicyViolation:
    """Represents a detected policy violation."""

    def __init__(
        self,
        policy: RollbackPolicy,
        deployment: Deployment,
        current_value: float,
        threshold: float,
        metric: str,
    ) -> None:
        self.policy = policy
        self.deployment = deployment
        self.current_value = current_value
        self.threshold = threshold
        self.metric = metric

    def __repr__(self) -> str:
        return (
            f"PolicyViolation(model={self.deployment.model_name}, "
            f"metric={self.metric}, value={self.current_value:.4f}, "
            f"threshold={self.threshold:.4f})"
        )


class AutoRollbackEvaluator:
    """Evaluates live deployments against auto-rollback policies.

    Designed to be called periodically (e.g. every 60 seconds) by a
    background scheduler or worker task.
    """

    def __init__(
        self,
        session: AsyncSession,
        coordinator: Optional[RollbackCoordinator] = None,
    ) -> None:
        self.session = session
        self.coordinator = coordinator or RollbackCoordinator(session=session)

    # ── Policy CRUD ──────────────────────────────────────────

    async def create_policy(
        self,
        model_name: str,
        deployment_id: Optional[str] = None,
        enabled: bool = False,
        require_approval: bool = False,
        metric: str = "error_rate",
        threshold: float = 0.05,
        evaluation_window_seconds: int = 300,
        consecutive_violations: int = 3,
        cooldown_hours: int = 24,
    ) -> RollbackPolicy:
        """Create a new auto-rollback policy."""
        policy = RollbackPolicy(
            model_name=model_name,
            deployment_id=deployment_id,
            enabled=enabled,
            require_approval=require_approval,
            metric=metric,
            threshold=threshold,
            evaluation_window_seconds=evaluation_window_seconds,
            consecutive_violations=consecutive_violations,
            cooldown_hours=cooldown_hours,
        )
        self.session.add(policy)
        await self.session.flush()
        await self.session.refresh(policy)
        return policy

    async def update_policy(
        self,
        policy_id: str,
        **kwargs: Any,
    ) -> Optional[RollbackPolicy]:
        """Update an existing policy."""
        policy = await self.get_policy(policy_id)
        if policy is None:
            return None

        allowed_fields = {
            "enabled", "require_approval", "metric", "threshold",
            "evaluation_window_seconds", "consecutive_violations",
            "cooldown_hours",
        }
        for key, value in kwargs.items():
            if key in allowed_fields:
                setattr(policy, key, value)

        await self.session.flush()
        await self.session.refresh(policy)
        return policy

    async def get_policy(self, policy_id: str) -> Optional[RollbackPolicy]:
        """Fetch a policy by ID."""
        result = await self.session.execute(
            select(RollbackPolicy).where(RollbackPolicy.id == policy_id)
        )
        return result.scalar_one_or_none()

    async def list_policies(
        self,
        model_name: Optional[str] = None,
        enabled_only: bool = False,
    ) -> List[RollbackPolicy]:
        """List all auto-rollback policies."""
        query = select(RollbackPolicy).order_by(RollbackPolicy.created_at.desc())
        if model_name:
            query = query.where(RollbackPolicy.model_name == model_name)
        if enabled_only:
            query = query.where(RollbackPolicy.enabled == True)  # noqa: E712
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def delete_policy(self, policy_id: str) -> bool:
        """Delete a policy by ID."""
        policy = await self.get_policy(policy_id)
        if policy is None:
            return False
        await self.session.delete(policy)
        await self.session.flush()
        return True

    # ── Evaluation Loop ──────────────────────────────────────

    async def evaluate_all_policies(self) -> List[Dict[str, Any]]:
        """Evaluate all enabled policies against live metrics.

        Called periodically by the background scheduler.
        Returns a list of action summaries.
        """
        policies = await self.list_policies(enabled_only=True)
        results: List[Dict[str, Any]] = []

        for policy in policies:
            try:
                result = await self._evaluate_single_policy(policy)
                results.append(result)
            except Exception as exc:
                logger.error(
                    "Error evaluating policy %s for %s: %s",
                    policy.id, policy.model_name, exc,
                )
                results.append({
                    "policy_id": policy.id,
                    "model_name": policy.model_name,
                    "action": "ERROR",
                    "error": str(exc),
                })

        return results

    async def _evaluate_single_policy(
        self, policy: RollbackPolicy
    ) -> Dict[str, Any]:
        """Evaluate a single policy against the active deployment's metrics."""
        # 1. Find active deployment
        deployment = await self._get_active_deployment(policy.model_name, policy.deployment_id)
        if deployment is None:
            return {
                "policy_id": policy.id,
                "model_name": policy.model_name,
                "action": "SKIP",
                "reason": "No active deployment found",
            }

        # 2. Check oscillation guard / cooldown
        if self._is_in_cooldown(policy):
            return {
                "policy_id": policy.id,
                "model_name": policy.model_name,
                "action": "COOLDOWN",
                "reason": f"Auto-rollback rate-limited (last triggered: {policy.last_triggered_at})",
            }

        # 3. Compute metric value over the evaluation window
        metric_value = await self._compute_metric(
            deployment, policy.metric, policy.evaluation_window_seconds
        )
        if metric_value is None:
            return {
                "policy_id": policy.id,
                "model_name": policy.model_name,
                "action": "SKIP",
                "reason": f"Insufficient data for metric '{policy.metric}'",
            }

        # 4. Check threshold violation
        is_violated = self._check_threshold(policy.metric, metric_value, policy.threshold)

        if is_violated:
            policy.violation_count += 1
            await self.session.flush()

            if policy.violation_count >= policy.consecutive_violations:
                # Trigger auto-rollback
                return await self._trigger_auto_rollback(policy, deployment, metric_value)
            else:
                return {
                    "policy_id": policy.id,
                    "model_name": policy.model_name,
                    "action": "VIOLATION",
                    "metric": policy.metric,
                    "value": metric_value,
                    "threshold": policy.threshold,
                    "violation_count": policy.violation_count,
                    "required": policy.consecutive_violations,
                }
        else:
            # Reset consecutive violation counter
            if policy.violation_count > 0:
                policy.violation_count = 0
                await self.session.flush()

            return {
                "policy_id": policy.id,
                "model_name": policy.model_name,
                "action": "OK",
                "metric": policy.metric,
                "value": metric_value,
                "threshold": policy.threshold,
            }

    async def _trigger_auto_rollback(
        self,
        policy: RollbackPolicy,
        deployment: Deployment,
        metric_value: float,
    ) -> Dict[str, Any]:
        """Execute or request approval for automatic rollback."""
        reason = (
            f"Auto-rollback triggered: {policy.metric}={metric_value:.4f} "
            f"exceeds threshold {policy.threshold:.4f} for "
            f"{policy.consecutive_violations} consecutive windows"
        )

        if policy.require_approval:
            # Create a PENDING_APPROVAL rollback record instead of executing
            record = RollbackRecord(
                deployment_id=deployment.id,
                model_name=policy.model_name,
                from_version=deployment.model_version,
                to_version=deployment.model_version - 1,
                reason=reason,
                trigger=RollbackTrigger.AUTOMATIC,
                status=RollbackStatus.PENDING_APPROVAL,
                initiated_by="auto-rollback-policy",
                details_json={
                    "policy_id": policy.id,
                    "metric": policy.metric,
                    "value": metric_value,
                    "threshold": policy.threshold,
                },
            )
            self.session.add(record)

            policy.last_triggered_at = datetime.now(timezone.utc)
            policy.violation_count = 0
            await self.session.flush()
            await self.session.refresh(record)

            logger.info(
                "Auto-rollback PENDING_APPROVAL for %s: %s",
                policy.model_name, reason,
            )
            return {
                "policy_id": policy.id,
                "model_name": policy.model_name,
                "action": "PENDING_APPROVAL",
                "rollback_id": record.id,
                "reason": reason,
            }
        else:
            # Execute auto-rollback immediately
            try:
                record = await self.coordinator.execute_rollback(
                    model_name=policy.model_name,
                    target_version=None,  # Previous version
                    reason=reason,
                    trigger=RollbackTrigger.AUTOMATIC,
                    initiated_by="auto-rollback-policy",
                )

                policy.last_triggered_at = datetime.now(timezone.utc)
                policy.violation_count = 0
                await self.session.flush()

                logger.info(
                    "Auto-rollback EXECUTED for %s: %s (record=%s)",
                    policy.model_name, reason, record.id,
                )
                return {
                    "policy_id": policy.id,
                    "model_name": policy.model_name,
                    "action": "ROLLBACK_EXECUTED",
                    "rollback_id": record.id,
                    "reason": reason,
                }
            except RollbackError as exc:
                logger.error(
                    "Auto-rollback FAILED for %s: %s",
                    policy.model_name, exc,
                )
                return {
                    "policy_id": policy.id,
                    "model_name": policy.model_name,
                    "action": "ROLLBACK_FAILED",
                    "error": str(exc),
                    "reason": reason,
                }

    # ── Metric computation ───────────────────────────────────

    async def _compute_metric(
        self,
        deployment: Deployment,
        metric: str,
        window_seconds: int,
    ) -> Optional[float]:
        """Compute a metric value over the evaluation window."""
        cutoff = datetime.now(timezone.utc) - timedelta(seconds=window_seconds)

        if metric == "error_rate":
            return await self._compute_error_rate(deployment.id, cutoff)
        elif metric == "latency_p95":
            return await self._compute_latency_p95(deployment.id, cutoff)
        elif metric == "accuracy":
            return await self._compute_accuracy(deployment.model_name, deployment.id, cutoff)
        elif metric == "drift_share":
            return await self._compute_drift_share(deployment.model_name, deployment.id, cutoff)
        else:
            logger.warning("Unknown metric '%s' in policy", metric)
            return None

    async def _compute_error_rate(
        self, deployment_id: str, cutoff: datetime
    ) -> Optional[float]:
        """Error rate = total_errors / total_requests over the window."""
        result = await self.session.execute(
            select(
                func.sum(DeploymentMetric.error_count),
                func.sum(DeploymentMetric.requests_count),
            ).where(
                and_(
                    DeploymentMetric.deployment_id == deployment_id,
                    DeploymentMetric.timestamp >= cutoff,
                )
            )
        )
        row = result.one_or_none()
        if row is None or row[1] is None or row[1] == 0:
            return None
        total_errors = row[0] or 0
        total_requests = row[1]
        return total_errors / total_requests

    async def _compute_latency_p95(
        self, deployment_id: str, cutoff: datetime
    ) -> Optional[float]:
        """Average p95 latency over the window (ms)."""
        result = await self.session.execute(
            select(func.avg(DeploymentMetric.latency_p95_ms)).where(
                and_(
                    DeploymentMetric.deployment_id == deployment_id,
                    DeploymentMetric.timestamp >= cutoff,
                    DeploymentMetric.latency_p95_ms.isnot(None),
                )
            )
        )
        return result.scalar_one_or_none()

    async def _compute_accuracy(
        self,
        model_name: str,
        deployment_id: str,
        cutoff: datetime,
    ) -> Optional[float]:
        """Latest accuracy from ModelPerformanceHistory."""
        result = await self.session.execute(
            select(ModelPerformanceHistory).where(
                and_(
                    ModelPerformanceHistory.model_name == model_name,
                    ModelPerformanceHistory.deployment_id == deployment_id,
                    ModelPerformanceHistory.created_at >= cutoff,
                )
            ).order_by(ModelPerformanceHistory.created_at.desc()).limit(1)
        )
        perf = result.scalar_one_or_none()
        if perf is None or not perf.metrics_json:
            return None
        return perf.metrics_json.get("accuracy")

    async def _compute_drift_share(
        self,
        model_name: str,
        deployment_id: str,
        cutoff: datetime,
    ) -> Optional[float]:
        """Latest drift share from DriftEvaluation."""
        result = await self.session.execute(
            select(DriftEvaluation).where(
                and_(
                    DriftEvaluation.model_name == model_name,
                    DriftEvaluation.deployment_id == deployment_id,
                    DriftEvaluation.created_at >= cutoff,
                )
            ).order_by(DriftEvaluation.created_at.desc()).limit(1)
        )
        drift = result.scalar_one_or_none()
        return drift.drift_share if drift else None

    # ── Helpers ──────────────────────────────────────────────

    async def _get_active_deployment(
        self,
        model_name: str,
        deployment_id: Optional[str] = None,
    ) -> Optional[Deployment]:
        """Find the active deployment for a model."""
        if deployment_id:
            result = await self.session.execute(
                select(Deployment).where(
                    and_(
                        Deployment.id == deployment_id,
                        Deployment.status == DeploymentStatus.RUNNING,
                    )
                )
            )
        else:
            result = await self.session.execute(
                select(Deployment).where(
                    and_(
                        Deployment.model_name == model_name,
                        Deployment.status == DeploymentStatus.RUNNING,
                    )
                ).order_by(Deployment.created_at.desc())
            )
        return result.scalar_one_or_none()

    def _is_in_cooldown(self, policy: RollbackPolicy) -> bool:
        """Check if the policy is within the cooldown period."""
        if policy.last_triggered_at is None:
            return False
        cooldown_end = policy.last_triggered_at + timedelta(hours=policy.cooldown_hours)
        return datetime.now(timezone.utc) < cooldown_end

    @staticmethod
    def _check_threshold(metric: str, value: float, threshold: float) -> bool:
        """Determine if a metric value violates its threshold.

        For most metrics (error_rate, latency, drift_share), violation = value > threshold.
        For accuracy, violation = value < threshold (lower is worse).
        """
        if metric == "accuracy":
            return value < threshold
        return value > threshold
