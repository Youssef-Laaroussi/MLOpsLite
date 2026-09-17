"""Evidently AI evaluation engine for data drift, target drift, and model performance reports."""

import json
import logging
from pathlib import Path
from typing import Any, Dict, Optional, Tuple

import pandas as pd

from packages.core.storage.client import StorageClient, get_storage_client

logger = logging.getLogger(__name__)

try:
    from evidently.report import Report
    from evidently.metric_preset import DataDriftPreset, DataQualityPreset
    _EVIDENTLY_AVAILABLE = True
except ImportError:
    Report = None  # type: ignore
    DataDriftPreset = None  # type: ignore
    DataQualityPreset = None  # type: ignore
    _EVIDENTLY_AVAILABLE = False


class EvidentlyEngine:
    """Generates standalone interactive HTML reports and JSON metrics using Evidently AI."""

    DEFAULT_BUCKET = "mlite-evaluations"

    def __init__(self, storage_client: Optional[StorageClient] = None) -> None:
        self.storage = storage_client or get_storage_client()

    @property
    def is_available(self) -> bool:
        """Check if evidently library is installed."""
        return _EVIDENTLY_AVAILABLE

    def run_drift_report(
        self,
        reference_data: pd.DataFrame,
        current_data: pd.DataFrame,
        project_name: str = "default-project",
        model_version: str = "1",
        run_id: str = "eval-run",
    ) -> Dict[str, Any]:
        """Generate data drift evaluation report and upload artifacts to MinIO."""
        output_dir = Path(f"/tmp/mlite_eval_{run_id}")
        output_dir.mkdir(parents=True, exist_ok=True)
        html_path = output_dir / "report.html"
        json_path = output_dir / "metrics.json"

        if self.is_available:
            try:
                report = Report(metrics=[DataDriftPreset()])
                report.run(reference_data=reference_data, current_data=current_data)

                # Save standalone HTML
                report.save_html(str(html_path))

                # Extract JSON metrics dictionary
                metrics_dict = report.as_dict()
                with open(json_path, "w", encoding="utf-8") as f:
                    json.dump(metrics_dict, f, indent=2)

                # Extract key summary figures
                drift_metrics = metrics_dict.get("metrics", [{}])[0].get("result", {})
                drift_share = drift_metrics.get("drift_share", 0.0)
                drifted_features = [
                    feat for feat, data in drift_metrics.get("drift_by_columns", {}).items()
                    if data.get("drift_detected")
                ]

                # Upload to MinIO
                s3_html_key = f"{project_name}/v{model_version}/{run_id}/report.html"
                s3_json_key = f"{project_name}/v{model_version}/{run_id}/metrics.json"
                try:
                    self.storage.upload_file(html_path, s3_html_key, bucket_name=self.DEFAULT_BUCKET)
                    self.storage.upload_file(json_path, s3_json_key, bucket_name=self.DEFAULT_BUCKET)
                except Exception as e:
                    logger.warning("Failed to upload Evidently reports to MinIO: %s", e)

                return {
                    "success": True,
                    "drift_share": drift_share,
                    "drifted_features": drifted_features,
                    "metrics": metrics_dict,
                    "html_report_path": f"s3://{self.DEFAULT_BUCKET}/{s3_html_key}",
                    "local_html_path": str(html_path),
                }
            except Exception as exc:
                logger.error("Evidently report execution failed: %s", exc)

        # Fallback heuristic / statistical drift evaluation for lightweight or offline environments
        common_cols = [c for c in reference_data.columns if c in current_data.columns]
        drifted = []
        for col in common_cols:
            if pd.api.types.is_numeric_dtype(reference_data[col]):
                ref_mean = reference_data[col].mean()
                curr_mean = current_data[col].mean()
                diff = abs(curr_mean - ref_mean) / (abs(ref_mean) + 1e-6)
                if diff > 0.25:
                    drifted.append(col)

        drift_share = len(drifted) / max(1, len(common_cols))

        # Generate lightweight HTML report
        fallback_html = f"""<!DOCTYPE html>
<html>
<head><title>MLite Drift Report - {run_id}</title></head>
<body style="font-family: sans-serif; background: #0f172a; color: #f8fafc; padding: 40px;">
  <h2>MLite Automated Drift Report</h2>
  <p>Run ID: {run_id} | Model Version: {model_version}</p>
  <p>Drift Share: {drift_share:.2%} ({len(drifted)} / {len(common_cols)} features drifted)</p>
</body>
</html>"""
        html_path.write_text(fallback_html, encoding="utf-8")

        summary = {
            "drift_share": round(drift_share, 4),
            "drifted_features": drifted,
            "simulated": True,
        }
        json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

        return {
            "success": True,
            "drift_share": drift_share,
            "drifted_features": drifted,
            "metrics": summary,
            "html_report_path": f"s3://{self.DEFAULT_BUCKET}/{project_name}/v{model_version}/{run_id}/report.html",
            "local_html_path": str(html_path),
        }
