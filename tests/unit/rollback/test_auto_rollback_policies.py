"""Unit tests for AutoRollbackEvaluator and auto-rollback policies (Issue #24)."""

import pytest
from unittest.mock import AsyncMock, MagicMock
from datetime import datetime, timezone, timedelta

from packages.core.models.deployment import Deployment, DeploymentMetric, DeploymentStatus
from packages.core.models.rollback import (
    RollbackPolicy,
    RollbackRecord,
    RollbackStatus,
    RollbackTrigger,
)
from packages.rollback.policies import AutoRollbackEvaluator
from packages.rollback.coordinator import RollbackCoordinator


@pytest.fixture
def mock_session():
    return AsyncMock()


@pytest.fixture
def mock_coordinator():
    return MagicMock(spec=RollbackCoordinator)


def _mock_scalar_one_or_none(value):
    result = MagicMock()
    result.scalar_one_or_none.return_value = value
    return result


def _mock_scalars_all(values):
    result = MagicMock()
    result.scalars.return_value.all.return_value = values
    return result


def _mock_one_or_none(value):
    result = MagicMock()
    result.one_or_none.return_value = value
    return result


@pytest.mark.asyncio
class TestAutoRollbackPolicyCRUD:
    """Test policy CRUD operations."""

    async def test_create_policy(self, mock_session):
        evaluator = AutoRollbackEvaluator(session=mock_session)

        policy = await evaluator.create_policy(
            model_name="churn-predictor",
            metric="error_rate",
            threshold=0.05,
            enabled=False,
        )

        assert policy.model_name == "churn-predictor"
        assert policy.metric == "error_rate"
        assert policy.threshold == 0.05
        assert policy.enabled is False
        mock_session.add.assert_called_once()

    async def test_list_policies(self, mock_session):
        policies = [
            RollbackPolicy(
                id="pol-1",
                model_name="churn-predictor",
                metric="error_rate",
                threshold=0.05,
                enabled=True,
            ),
        ]
        mock_session.execute.return_value = _mock_scalars_all(policies)

        evaluator = AutoRollbackEvaluator(session=mock_session)
        result = await evaluator.list_policies()

        assert len(result) == 1
        assert result[0].model_name == "churn-predictor"

    async def test_update_policy(self, mock_session):
        policy = RollbackPolicy(
            id="pol-1",
            model_name="churn-predictor",
            metric="error_rate",
            threshold=0.05,
            enabled=False,
        )
        mock_session.execute.return_value = _mock_scalar_one_or_none(policy)

        evaluator = AutoRollbackEvaluator(session=mock_session)
        updated = await evaluator.update_policy("pol-1", enabled=True, threshold=0.10)

        assert updated is not None
        assert updated.enabled is True
        assert updated.threshold == 0.10

    async def test_update_nonexistent_policy_returns_none(self, mock_session):
        mock_session.execute.return_value = _mock_scalar_one_or_none(None)

        evaluator = AutoRollbackEvaluator(session=mock_session)
        result = await evaluator.update_policy("nonexistent", enabled=True)

        assert result is None

    async def test_delete_policy(self, mock_session):
        policy = RollbackPolicy(id="pol-1", model_name="test")
        mock_session.execute.return_value = _mock_scalar_one_or_none(policy)

        evaluator = AutoRollbackEvaluator(session=mock_session)
        result = await evaluator.delete_policy("pol-1")

        assert result is True
        mock_session.delete.assert_called_once_with(policy)

    async def test_delete_nonexistent_policy(self, mock_session):
        mock_session.execute.return_value = _mock_scalar_one_or_none(None)

        evaluator = AutoRollbackEvaluator(session=mock_session)
        result = await evaluator.delete_policy("nonexistent")

        assert result is False


@pytest.mark.asyncio
class TestOscillationGuard:
    """Test oscillation prevention / cooldown logic."""

    def test_cooldown_not_triggered_when_never_triggered(self):
        policy = RollbackPolicy(
            id="pol-1",
            model_name="test",
            cooldown_hours=24,
            last_triggered_at=None,
        )
        evaluator = AutoRollbackEvaluator(session=AsyncMock())
        assert evaluator._is_in_cooldown(policy) is False

    def test_cooldown_active_when_recently_triggered(self):
        policy = RollbackPolicy(
            id="pol-1",
            model_name="test",
            cooldown_hours=24,
            last_triggered_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )
        evaluator = AutoRollbackEvaluator(session=AsyncMock())
        assert evaluator._is_in_cooldown(policy) is True

    def test_cooldown_expired(self):
        policy = RollbackPolicy(
            id="pol-1",
            model_name="test",
            cooldown_hours=24,
            last_triggered_at=datetime.now(timezone.utc) - timedelta(hours=25),
        )
        evaluator = AutoRollbackEvaluator(session=AsyncMock())
        assert evaluator._is_in_cooldown(policy) is False


@pytest.mark.asyncio
class TestThresholdLogic:
    """Test threshold violation detection logic."""

    def test_error_rate_violation_when_exceeded(self):
        assert AutoRollbackEvaluator._check_threshold("error_rate", 0.10, 0.05) is True

    def test_error_rate_ok_when_below(self):
        assert AutoRollbackEvaluator._check_threshold("error_rate", 0.03, 0.05) is False

    def test_accuracy_violation_when_below_threshold(self):
        # For accuracy, lower is worse
        assert AutoRollbackEvaluator._check_threshold("accuracy", 0.80, 0.90) is True

    def test_accuracy_ok_when_above_threshold(self):
        assert AutoRollbackEvaluator._check_threshold("accuracy", 0.95, 0.90) is False

    def test_latency_violation_when_exceeded(self):
        assert AutoRollbackEvaluator._check_threshold("latency_p95", 500.0, 200.0) is True

    def test_drift_violation_when_exceeded(self):
        assert AutoRollbackEvaluator._check_threshold("drift_share", 0.8, 0.5) is True


@pytest.mark.asyncio
class TestPolicyEvaluation:
    """Test the policy evaluation loop."""

    async def test_skip_when_no_active_deployment(self, mock_session, mock_coordinator):
        policy = RollbackPolicy(
            id="pol-1",
            model_name="test-model",
            enabled=True,
            metric="error_rate",
            threshold=0.05,
            evaluation_window_seconds=300,
            consecutive_violations=3,
            cooldown_hours=24,
            violation_count=0,
            last_triggered_at=None,
        )

        evaluator = AutoRollbackEvaluator(
            session=mock_session, coordinator=mock_coordinator
        )
        evaluator._get_active_deployment = AsyncMock(return_value=None)

        result = await evaluator._evaluate_single_policy(policy)

        assert result["action"] == "SKIP"
        assert "No active deployment" in result["reason"]

    async def test_cooldown_prevents_evaluation(self, mock_session, mock_coordinator):
        policy = RollbackPolicy(
            id="pol-1",
            model_name="test-model",
            enabled=True,
            metric="error_rate",
            threshold=0.05,
            evaluation_window_seconds=300,
            consecutive_violations=3,
            cooldown_hours=24,
            violation_count=0,
            last_triggered_at=datetime.now(timezone.utc) - timedelta(hours=1),
        )

        deployment = Deployment(
            id="dep-1",
            model_name="test-model",
            model_version=2,
            port=8100,
            endpoint_url="http://localhost:8100",
            status=DeploymentStatus.RUNNING,
        )

        evaluator = AutoRollbackEvaluator(
            session=mock_session, coordinator=mock_coordinator
        )
        evaluator._get_active_deployment = AsyncMock(return_value=deployment)

        result = await evaluator._evaluate_single_policy(policy)

        assert result["action"] == "COOLDOWN"

    async def test_ok_when_metric_below_threshold(self, mock_session, mock_coordinator):
        policy = RollbackPolicy(
            id="pol-1",
            model_name="test-model",
            enabled=True,
            metric="error_rate",
            threshold=0.05,
            evaluation_window_seconds=300,
            consecutive_violations=3,
            cooldown_hours=24,
            violation_count=0,
            last_triggered_at=None,
        )

        deployment = Deployment(
            id="dep-1",
            model_name="test-model",
            model_version=2,
            port=8100,
            endpoint_url="http://localhost:8100",
            status=DeploymentStatus.RUNNING,
        )

        evaluator = AutoRollbackEvaluator(
            session=mock_session, coordinator=mock_coordinator
        )
        evaluator._get_active_deployment = AsyncMock(return_value=deployment)
        evaluator._compute_metric = AsyncMock(return_value=0.02)  # Below threshold

        result = await evaluator._evaluate_single_policy(policy)

        assert result["action"] == "OK"

    async def test_violation_increments_counter(self, mock_session, mock_coordinator):
        policy = RollbackPolicy(
            id="pol-1",
            model_name="test-model",
            enabled=True,
            metric="error_rate",
            threshold=0.05,
            evaluation_window_seconds=300,
            consecutive_violations=3,
            cooldown_hours=24,
            violation_count=0,
            last_triggered_at=None,
        )

        deployment = Deployment(
            id="dep-1",
            model_name="test-model",
            model_version=2,
            port=8100,
            endpoint_url="http://localhost:8100",
            status=DeploymentStatus.RUNNING,
        )

        evaluator = AutoRollbackEvaluator(
            session=mock_session, coordinator=mock_coordinator
        )
        evaluator._get_active_deployment = AsyncMock(return_value=deployment)
        evaluator._compute_metric = AsyncMock(return_value=0.10)  # Above threshold

        result = await evaluator._evaluate_single_policy(policy)

        assert result["action"] == "VIOLATION"
        assert policy.violation_count == 1

    async def test_violation_resets_on_healthy_window(self, mock_session, mock_coordinator):
        policy = RollbackPolicy(
            id="pol-1",
            model_name="test-model",
            enabled=True,
            metric="error_rate",
            threshold=0.05,
            evaluation_window_seconds=300,
            consecutive_violations=3,
            cooldown_hours=24,
            violation_count=2,  # Was elevated
            last_triggered_at=None,
        )

        deployment = Deployment(
            id="dep-1",
            model_name="test-model",
            model_version=2,
            port=8100,
            endpoint_url="http://localhost:8100",
            status=DeploymentStatus.RUNNING,
        )

        evaluator = AutoRollbackEvaluator(
            session=mock_session, coordinator=mock_coordinator
        )
        evaluator._get_active_deployment = AsyncMock(return_value=deployment)
        evaluator._compute_metric = AsyncMock(return_value=0.01)  # Below threshold

        result = await evaluator._evaluate_single_policy(policy)

        assert result["action"] == "OK"
        assert policy.violation_count == 0  # Reset

    async def test_pending_approval_when_required(self, mock_session, mock_coordinator):
        policy = RollbackPolicy(
            id="pol-1",
            model_name="test-model",
            enabled=True,
            require_approval=True,
            metric="error_rate",
            threshold=0.05,
            evaluation_window_seconds=300,
            consecutive_violations=2,
            cooldown_hours=24,
            violation_count=1,  # One more needed
            last_triggered_at=None,
        )

        deployment = Deployment(
            id="dep-1",
            model_name="test-model",
            model_version=2,
            port=8100,
            endpoint_url="http://localhost:8100",
            status=DeploymentStatus.RUNNING,
        )

        evaluator = AutoRollbackEvaluator(
            session=mock_session, coordinator=mock_coordinator
        )
        evaluator._get_active_deployment = AsyncMock(return_value=deployment)
        evaluator._compute_metric = AsyncMock(return_value=0.10)  # Above threshold

        result = await evaluator._evaluate_single_policy(policy)

        assert result["action"] == "PENDING_APPROVAL"
        assert policy.violation_count == 0  # Reset after trigger
