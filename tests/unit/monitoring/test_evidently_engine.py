"""Unit tests for EvidentlyEngine automated evaluation and report generation (Issue #18)."""

import pandas as pd
import pytest
from unittest.mock import MagicMock

from packages.core.storage.client import StorageClient
from packages.monitoring.evidently_engine import EvidentlyEngine


@pytest.fixture
def synthetic_datasets():
    # Baseline reference dataset
    ref = pd.DataFrame({
        "feature_1": [1.0, 2.0, 3.0, 4.0, 5.0] * 20,
        "feature_2": [10.0, 20.0, 30.0, 40.0, 50.0] * 20,
    })
    # Shifted current dataset
    curr = pd.DataFrame({
        "feature_1": [10.0, 20.0, 30.0, 40.0, 50.0] * 20,  # heavily shifted
        "feature_2": [10.0, 20.0, 30.0, 40.0, 50.0] * 20,  # stable
    })
    return ref, curr


class TestEvidentlyEngine:
    """Test EvidentlyEngine report execution, artifact generation, and MinIO uploads."""

    def test_run_drift_report(self, synthetic_datasets):
        ref, curr = synthetic_datasets
        mock_storage = MagicMock(spec=StorageClient)
        mock_storage.upload_file.return_value = {"s3_uri": "s3://mlite-evaluations/report.html"}

        engine = EvidentlyEngine(storage_client=mock_storage)
        result = engine.run_drift_report(
            reference_data=ref,
            current_data=curr,
            project_name="fraud-detection",
            model_version="1",
            run_id="test-run-123",
        )

        assert result["success"] is True
        assert "drift_share" in result
        assert "drifted_features" in result
        assert "feature_1" in result["drifted_features"]
        assert "html_report_path" in result
        assert result["html_report_path"].startswith("s3://mlite-evaluations/")
