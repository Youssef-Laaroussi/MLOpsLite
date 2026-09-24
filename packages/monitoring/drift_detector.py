"""Feature data drift detector comparing reference datasets against production inference payloads."""

import logging
from typing import Any, Dict, List, Optional, Tuple

import numpy as np
import pandas as pd
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.monitoring import DriftEvaluation, DriftSeverity
from packages.monitoring.evidently_engine import EvidentlyEngine

logger = logging.getLogger(__name__)


class DataDriftDetector:
    """Calculates statistical drift scores between reference and production distributions."""

    def __init__(
        self,
        session: AsyncSession,
        evidently_engine: Optional[EvidentlyEngine] = None,
        default_drift_threshold: float = 0.20,
    ) -> None:
        self.session = session
        self.evidently = evidently_engine or EvidentlyEngine()
        self.default_drift_threshold = default_drift_threshold

    @staticmethod
    def classify_severity(drift_share: float) -> DriftSeverity:
        """Classify drift ratio into LOW (<10%), MEDIUM (10-25%), or HIGH (>25%)."""
        if drift_share < 0.10:
            return DriftSeverity.LOW
        elif drift_share <= 0.25:
            return DriftSeverity.MEDIUM
        return DriftSeverity.HIGH

    async def evaluate_drift(
        self,
        model_name: str,
        reference_df: pd.DataFrame,
        current_df: pd.DataFrame,
        deployment_id: Optional[str] = None,
        run_id: str = "drift-eval",
    ) -> DriftEvaluation:
        """Execute drift analysis, classify severity, and persist record."""
        # Use Evidently engine to calculate drift
        res = self.evidently.run_drift_report(
            reference_data=reference_df,
            current_data=current_df,
            project_name=model_name,
            model_version="1",
            run_id=run_id,
        )

        drift_share = float(res.get("drift_share", 0.0))
        drifted_features = res.get("drifted_features", [])
        severity = self.classify_severity(drift_share)

        evaluation = DriftEvaluation(
            model_name=model_name,
            deployment_id=deployment_id,
            drift_share=drift_share,
            drift_status=severity,
            drifted_features=drifted_features,
            metrics_json=res.get("metrics", {}),
            html_report_path=res.get("html_report_path"),
        )
        self.session.add(evaluation)
        await self.session.flush()
        await self.session.refresh(evaluation)
        return evaluation

    async def get_latest_evaluations(
        self,
        model_name: str,
        limit: int = 10,
    ) -> List[DriftEvaluation]:
        """Fetch historical drift evaluations for a model."""
        query = (
            select(DriftEvaluation)
            .where(DriftEvaluation.model_name == model_name)
            .order_by(DriftEvaluation.created_at.desc())
            .limit(limit)
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())
