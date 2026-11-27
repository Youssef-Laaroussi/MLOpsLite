"""Unit tests for EvidentlyEngine automated evaluation and report generation (Issue #18)."""

from pathlib import Path
from unittest.mock import MagicMock

import pandas as pd
import pytest

from packages.core.storage.client import StorageClient
from packages.monitoring.evidently_engine import EvidentlyEngine


@pytest.fixture
def synthetic_datasets():
    # Baseline reference dataset
    ref = pd.DataFrame(
        {
            "feature_1": [1.0, 2.0, 3.0, 4.0, 5.0] * 20,
            "feature_2": [10.0, 20.0, 30.0, 40.0, 50.0] * 20,
        }
    )
    # Shifted current dataset
    curr = pd.DataFrame(
        {
            "feature_1": [10.0, 20.0, 30.0, 40.0, 50.0] * 20,  # heavily shifted
            "feature_2": [10.0, 20.0, 30.0, 40.0, 50.0] * 20,  # stable
        }
    )
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

    @pytest.mark.parametrize("measured,drifted", [(0.0, []), (0.5, ["feature_1"])])
    def test_evidently_measured_fraction_is_not_its_decision_threshold(self, monkeypatch, synthetic_datasets, measured, drifted):
        from packages.monitoring import evidently_engine as module

        report = MagicMock()
        report.save_html.side_effect = lambda path: Path(path).write_text("<html>Measured report</html>")
        report.as_dict.return_value = {"metrics": [
            {"result": {"drift_share": 0.2, "share_of_drifted_columns": measured}},
            {"result": {"drift_by_columns": {"feature_1": {"drift_detected": bool(drifted)}}}},
        ]}
        monkeypatch.setattr(module, "_EVIDENTLY_AVAILABLE", True)
        monkeypatch.setattr(module, "Report", MagicMock(return_value=report))
        monkeypatch.setattr(module, "DataDriftPreset", MagicMock())
        result = EvidentlyEngine(storage_client=MagicMock()).run_drift_report(*synthetic_datasets)
        assert result["drift_share"] == measured
        assert result["drifted_features"] == drifted
        assert result["metrics"]["mlite_engine"] == "evidently"

    def test_fallback_report_escapes_user_controlled_labels(self, monkeypatch):
        from packages.monitoring import evidently_engine as module

        monkeypatch.setattr(module, "_EVIDENTLY_AVAILABLE", False)
        frame = pd.DataFrame({'feature<img src=x>': list(range(100))})
        result = EvidentlyEngine(storage_client=MagicMock()).run_drift_report(frame, frame, project_name='model<img src=x>')
        html = Path(result["local_html_path"]).read_text()
        assert 'feature&lt;img src=x&gt;' in html
        assert 'model&lt;img src=x&gt;' in html
        assert '<img src=x>' not in html
