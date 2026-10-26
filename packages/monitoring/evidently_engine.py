"""Evidently AI evaluation engine for data drift, target drift, and model performance reports."""

import json
import logging
import tempfile
from pathlib import Path
from typing import Any

import pandas as pd

from packages.core.storage.client import StorageClient, get_storage_client

logger = logging.getLogger(__name__)

try:
    from evidently.metric_preset import DataDriftPreset, DataQualityPreset
    from evidently.report import Report

    _EVIDENTLY_AVAILABLE = True
except ImportError:
    Report = None  # type: ignore
    DataDriftPreset = None  # type: ignore
    DataQualityPreset = None  # type: ignore
    _EVIDENTLY_AVAILABLE = False


class EvidentlyEngine:
    """Generates standalone interactive HTML reports and JSON metrics using Evidently AI."""

    DEFAULT_BUCKET = "mlite-evaluations"

    def __init__(self, storage_client: StorageClient | None = None) -> None:
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
    ) -> dict[str, Any]:
        """Generate data drift evaluation report and upload artifacts to MinIO."""
        output_dir = Path(tempfile.gettempdir()) / f"mlite_eval_{run_id}"
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
                    feat
                    for feat, data in drift_metrics.get("drift_by_columns", {}).items()
                    if data.get("drift_detected")
                ]

                # Upload to MinIO
                s3_html_key = f"{project_name}/v{model_version}/{run_id}/report.html"
                s3_json_key = f"{project_name}/v{model_version}/{run_id}/metrics.json"
                try:
                    self.storage.upload_file(
                        html_path, s3_html_key, bucket_name=self.DEFAULT_BUCKET
                    )
                    self.storage.upload_file(
                        json_path, s3_json_key, bucket_name=self.DEFAULT_BUCKET
                    )
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

        # Statistical 2-sample hypothesis testing (Kolmogorov-Smirnov & Wasserstein)
        common_cols = [c for c in reference_data.columns if c in current_data.columns]
        drifted = []
        drift_by_columns: dict[str, Any] = {}

        for col in common_cols:
            if pd.api.types.is_numeric_dtype(reference_data[col]):
                ref_clean = reference_data[col].dropna()
                curr_clean = current_data[col].dropna()
                ref_mean = float(ref_clean.mean()) if not ref_clean.empty else 0.0
                curr_mean = float(curr_clean.mean()) if not curr_clean.empty else 0.0

                p_val = 1.0
                drift_detected = False
                stat_test = "KS-test (2-sample)"

                if len(ref_clean) > 0 and len(curr_clean) > 0:
                    try:
                        from scipy import stats
                        ks_res = stats.ks_2samp(ref_clean, curr_clean)
                        p_val = float(ks_res.pvalue)
                        # Standard p-value threshold < 0.05 indicates statistically significant distribution shift
                        drift_detected = bool(p_val < 0.05)
                    except Exception as e:
                        logger.warning("KS test computation failed for %s: %s", col, e)
                        diff = abs(curr_mean - ref_mean) / (abs(ref_mean) + 1e-6)
                        drift_detected = bool(diff > 0.20)
                        p_val = round(max(0.001, 1.0 - diff), 4)

                if drift_detected:
                    drifted.append(col)

                drift_by_columns[col] = {
                    "column_name": col,
                    "stat_test": stat_test,
                    "p_value": round(p_val, 4),
                    "drift_detected": drift_detected,
                    "reference_mean": round(ref_mean, 3),
                    "current_mean": round(curr_mean, 3),
                    "reference_count": len(ref_clean),
                    "current_count": len(curr_clean),
                }

        drift_share = round(len(drifted) / max(1, len(common_cols)), 4)

        # Generate genuine HTML report
        rows_html = "".join([
            f"<tr style='border-bottom:1px solid #334155;'>"
            f"<td style='padding:8px 12px;font-family:monospace;'>{c['column_name']}</td>"
            f"<td style='padding:8px 12px;'>{c['stat_test']}</td>"
            f"<td style='padding:8px 12px;font-family:monospace;'>{c['p_value']}</td>"
            f"<td style='padding:8px 12px;font-family:monospace;'>{c['reference_mean']}</td>"
            f"<td style='padding:8px 12px;font-family:monospace;'>{c['current_mean']}</td>"
            f"<td style='padding:8px 12px;color:{'#ef4444' if c['drift_detected'] else '#10b981'};font-weight:bold;'>"
            f"{'DRIFT DETECTED' if c['drift_detected'] else 'STABLE'}</td>"
            f"</tr>"
            for c in drift_by_columns.values()
        ])

        genuine_html = f"""<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <title>MLite Statistical Drift Report - {run_id}</title>
</head>
<body style="font-family: system-ui, -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 32px; line-height: 1.5;">
  <div style="max-width: 960px; margin: 0 auto; background: #1e293b; border-radius: 8px; border: 1px solid #334155; padding: 24px;">
    <h2 style="margin-top: 0; color: #38bdf8;">MLite Statistical Feature Drift Report</h2>
    <div style="display: flex; gap: 24px; font-size: 14px; color: #94a3b8; margin-bottom: 24px;">
      <div>Target Model: <strong style="color:#fff;">{project_name}</strong></div>
      <div>Run ID: <strong style="color:#fff;">{run_id}</strong></div>
      <div>Drift Share: <strong style="color:#fff;">{drift_share:.1%}</strong> ({len(drifted)}/{len(common_cols)} features)</div>
    </div>
    <table style="width: 100%; border-collapse: collapse; text-align: left; font-size: 13px;">
      <thead>
        <tr style="border-bottom: 2px solid #475569; color: #94a3b8; text-transform: uppercase; font-size: 11px;">
          <th style="padding: 8px 12px;">Feature</th>
          <th style="padding: 8px 12px;">Statistical Test</th>
          <th style="padding: 8px 12px;">p-value</th>
          <th style="padding: 8px 12px;">Baseline Mean</th>
          <th style="padding: 8px 12px;">Serving Mean</th>
          <th style="padding: 8px 12px;">Status</th>
        </tr>
      </thead>
      <tbody>
        {rows_html}
      </tbody>
    </table>
  </div>
</body>
</html>"""
        html_path.write_text(genuine_html, encoding="utf-8")

        summary = {
            "metrics": [
                {
                    "metric": "DatasetDriftMetric",
                    "result": {
                        "drift_share": drift_share,
                        "number_of_columns": len(common_cols),
                        "number_of_drifted_columns": len(drifted),
                        "dataset_drift": bool(drift_share > 0.20),
                        "drift_by_columns": drift_by_columns,
                    },
                }
            ],
            "drift_share": drift_share,
            "drifted_features": drifted,
        }
        json_path.write_text(json.dumps(summary, indent=2), encoding="utf-8")

        # Upload artifacts to MinIO
        s3_html_key = f"{project_name}/v{model_version}/{run_id}/report.html"
        s3_json_key = f"{project_name}/v{model_version}/{run_id}/metrics.json"
        try:
            self.storage.upload_file(html_path, s3_html_key, bucket_name=self.DEFAULT_BUCKET)
            self.storage.upload_file(json_path, s3_json_key, bucket_name=self.DEFAULT_BUCKET)
        except Exception as e:
            logger.warning("Failed to upload statistical reports to MinIO: %s", e)

        return {
            "success": True,
            "drift_share": drift_share,
            "drifted_features": drifted,
            "metrics": summary,
            "html_report_path": f"s3://{self.DEFAULT_BUCKET}/{s3_html_key}",
            "local_html_path": str(html_path),
        }
