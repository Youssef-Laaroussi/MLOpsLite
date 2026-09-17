"""Model performance monitor matching delayed ground-truth feedback with predictions."""

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
from sqlalchemy import select
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

    async def ingest_feedback(
        self,
        deployment_id: str,
        prediction_id: str,
        ground_truth: Any,
        predicted_value: Optional[Any] = None,
        latency_ms: Optional[float] = None,
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
    def calculate_classification_metrics(y_true: List[Any], y_pred: List[Any]) -> Dict[str, float]:
        """Compute standard classification metrics (accuracy, precision, recall, f1)."""
        if len(y_true) == 0:
            return {"accuracy": 0.0, "precision": 0.0, "recall": 0.0, "f1": 0.0}

        y_t = np.array(y_true)
        y_p = np.array(y_pred)

        accuracy = float(np.mean(y_t == y_p))

        # Binary precision & recall
        tp = float(np.sum((y_t == 1) & (y_p == 1)))
        fp = float(np.sum((y_t == 0) & (y_p == 1)))
        fn = float(np.sum((y_t == 1) & (y_p == 0)))

        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        f1 = (2 * precision * recall) / (precision + recall) if (precision + recall) > 0 else 0.0

        return {
            "accuracy": round(accuracy, 4),
            "precision": round(precision, 4),
            "recall": round(recall, 4),
            "f1": round(f1, 4),
        }

    @staticmethod
    def calculate_regression_metrics(y_true: List[float], y_pred: List[float]) -> Dict[str, float]:
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
        current_metrics: Dict[str, float],
        baseline_metrics: Dict[str, float],
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
        deployment_id: Optional[str],
        task_type: str,
        y_true: List[Any],
        y_pred: List[Any],
        baseline_metrics: Optional[Dict[str, float]] = None,
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
