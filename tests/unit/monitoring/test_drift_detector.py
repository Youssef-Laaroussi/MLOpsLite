"""Unit tests for DataDriftDetector feature drift testing and severity classification (Issue #19)."""

import pandas as pd
import pytest
from unittest.mock import AsyncMock, MagicMock

from packages.core.models.monitoring import DriftSeverity
from packages.monitoring.drift_detector import DataDriftDetector
from packages.monitoring.evidently_engine import EvidentlyEngine


class TestDataDriftDetector:
    """Test drift severity mapping and drift calculation."""

    def test_classify_severity(self):
        assert DataDriftDetector.classify_severity(0.05) == DriftSeverity.LOW
        assert DataDriftDetector.classify_severity(0.15) == DriftSeverity.MEDIUM
        assert DataDriftDetector.classify_severity(0.25) == DriftSeverity.MEDIUM
        assert DataDriftDetector.classify_severity(0.35) == DriftSeverity.HIGH

    @pytest.mark.asyncio
    async def test_evaluate_drift_persists_record(self):
        session = AsyncMock()
        mock_evidently = MagicMock(spec=EvidentlyEngine)
        mock_evidently.run_drift_report.return_value = {
            "success": True,
            "drift_share": 0.40,
            "drifted_features": ["col_a", "col_b"],
            "metrics": {"col_a": 0.001},
            "html_report_path": "s3://mlite-evaluations/report.html",
        }

        detector = DataDriftDetector(session=session, evidently_engine=mock_evidently)

        ref_df = pd.DataFrame({"col_a": [1, 2], "col_b": [3, 4]})
        curr_df = pd.DataFrame({"col_a": [10, 20], "col_b": [30, 40]})

        eval_record = await detector.evaluate_drift(
            model_name="fraud-detector",
            reference_df=ref_df,
            current_df=curr_df,
            deployment_id="dep-123",
        )

        assert eval_record.model_name == "fraud-detector"
        assert eval_record.drift_share == 0.40
        assert eval_record.drift_status == DriftSeverity.HIGH
        assert eval_record.drifted_features == ["col_a", "col_b"]
        session.add.assert_called_once()
        session.flush.assert_called_once()
