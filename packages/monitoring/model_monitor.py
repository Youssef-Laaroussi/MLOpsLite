"""Model performance monitor matching delayed ground-truth feedback with predictions."""

import logging
from typing import Any

import numpy as np
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.monitoring import (
    ModelPerformanceHistory,
    PredictionFeedback,
)

logger = logging.getLogger(__name__)


class ModelPerformanceMonitor:
    """Computes real-world evaluation metrics and detects performance degradation."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    @staticmethod
    def resolve_task_type(configured: str | None, baseline_metrics: dict[str, Any]) -> str:
        """Prefer explicit configuration, then unambiguous registered metric families."""
        if configured is not None:
            task = configured.lower() if isinstance(configured, str) else None
            if task not in ("classification", "regression"):
                raise ValueError("Unsupported performance monitoring task type")
            return task
        metrics = set(baseline_metrics)
        regression = {"rmse", "mae", "mse", "r2", "r2_score"}
        classification = {"accuracy", "f1", "f1_score", "precision", "recall"}
        if metrics & regression and not metrics & classification:
            return "regression"
        return "classification"

    async def ingest_feedback(
        self,
        deployment_id: str,
        prediction_id: str,
        ground_truth: Any,
        predicted_value: Any | None = None,
        latency_ms: float | None = None,
    ) -> PredictionFeedback:
        """Store ground-truth observation linked to a prediction ID."""
        feedback = PredictionFeedback(
            deployment_id=deployment_id,
            prediction_id=prediction_id,
            ground_truth=ground_truth,
            predicted_value=predicted_value,
            latency_ms=latency_ms,
        )
        self.session.add(feedback)
        await self.session.flush()
        await self.session.refresh(feedback)
        return feedback

    @staticmethod
    def calculate_classification_metrics(y_true: list[Any], y_pred: list[Any]) -> dict[str, float]:
        """Compute accuracy and support-weighted metrics for all observed classes."""
        if len(y_true) == 0:
            return {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0}

        y_t = np.array(y_true)
        y_p = np.array(y_pred)

        accuracy = float(np.mean(y_t == y_p))

        from sklearn.metrics import precision_recall_fscore_support

        precision, recall, f1, _ = precision_recall_fscore_support(
            y_t, y_p, average="weighted", zero_division=0,
        )

        return {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
        }

    @staticmethod
    def calculate_regression_metrics(y_true: list[float], y_pred: list[float]) -> dict[str, float]:
        """Compute standard regression metrics (MAE, MSE, RMSE, R2)."""
        if len(y_true) == 0:
            return {"mae": 0.0, "rmse": 0.0, "r2": 0.0}

        y_t = np.array(y_true, dtype=float)
        y_p = np.array(y_pred, dtype=float)

        mae = float(np.mean(np.abs(y_t - y_p)))
        mse = float(np.mean((y_t - y_p) ** 2))
        rmse = float(np.sqrt(mse))

        ss_tot = float(np.sum((y_t - np.mean(y_t)) ** 2))
        ss_res = float(np.sum((y_t - y_p) ** 2))
        r2 = 1.0 - (ss_res / ss_tot) if ss_tot > 0 else 0.0

        return {
            "mae": round(mae, 4),
            "rmse": round(rmse, 4),
            "r2": round(r2, 4),
        }

    @staticmethod
    def check_degradation(
        current_metrics: dict[str, float],
        baseline_metrics: dict[str, float],
        tolerance_pct: float = 10.0,
    ) -> bool:
        """Check if any primary metric (accuracy, f1) dropped by more than tolerance_pct."""
        for metric in ("accuracy", "f1"):
            if metric in current_metrics and metric in baseline_metrics:
                base = baseline_metrics[metric]
                curr = current_metrics[metric]
                if base > 0:
                    pct_drop = ((base - curr) / base) * 100.0
                    if pct_drop >= tolerance_pct:
                        return True
        return False

    async def record_performance_snapshot(
        self,
        model_name: str,
        deployment_id: str | None,
        task_type: str,
        y_true: list[Any],
        y_pred: list[Any],
        baseline_metrics: dict[str, float] | None = None,
        degradation_threshold_pct: float = 10.0,
    ) -> ModelPerformanceHistory:
        """Compute and persist live performance evaluation metrics."""
        if task_type.lower() == "regression":
            metrics = self.calculate_regression_metrics(y_true, y_pred)
        else:
            metrics = self.calculate_classification_metrics(y_true, y_pred)

        degraded = False
        if baseline_metrics:
            degraded = self.check_degradation(
                current_metrics=metrics,
                baseline_metrics=baseline_metrics,
                tolerance_pct=degradation_threshold_pct,
            )

        snapshot = ModelPerformanceHistory(
            model_name=model_name,
            deployment_id=deployment_id,
            task_type=task_type,
            sample_count=len(y_true),
            metrics_json=metrics,
            baseline_metrics_json=baseline_metrics or {},
            degraded=degraded,
        )
        self.session.add(snapshot)
        await self.session.flush()
        await self.session.refresh(snapshot)
        return snapshot
