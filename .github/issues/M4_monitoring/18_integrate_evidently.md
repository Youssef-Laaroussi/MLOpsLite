# #18 — Integrate Evidently AI for automated ML evaluation and reports

> **Milestone:** M4 — Monitoring  
> **Priority:** `P1`  
> **Labels:** `monitoring` `P1`  

---

## Problem
Evaluating model distributions and comparing reference datasets against current production datasets requires complex statistical tests (Kolmogorov-Smirnov, Wasserstein distance, Chi-square). Re-implementing these from scratch is prone to statistical errors and maintenance overhead.

## Objective
Integrate Evidently AI inside `packages/monitoring/evidently_engine.py` to generate automated HTML and JSON reports for data drift, target drift, and model performance metrics.

## Proposed solution
Wrap Evidently Report and TestSuite APIs inside a unified MLite evaluation service. Provide pre-configured presets: DataDriftPreset, DataQualityPreset, and Classification/RegressionPreset. Store generated interactive HTML reports and summary JSON metrics in MinIO bucket `mlite-evaluations`.

## Technical requirements
- Evidently AI library integration (`evidently>=0.4.0`).
- Report runner: accepts `reference_data` (training/baseline) and `current_data` (inference/production) as Pandas/Polars DataFrames.
- Export outputs: interactive standalone HTML report (`report.html`) and structured metrics summary (`metrics.json`).
- Storage: save reports under `s3://mlite-evaluations/<project>/<model_version>/<run_id>/`.
- API endpoint `GET /api/v1/monitoring/reports/{id}/html` serving the interactive Evidently report.

## Acceptance criteria
- Executing an evaluation run generates both `report.html` and `metrics.json` without runtime warnings.
- Evidently metrics summary extracts drift share, drifted features list, and statistical p-values accurately.
- The interactive HTML report is viewable directly in the browser via the MLite API or React Dashboard.
- Execution is optimized for memory, safely processing tabular datasets up to 200MB.

## Tests
- Integration test `tests/integration/test_evidently_engine.py` running drift analysis between two synthetic datasets.
- Verify HTML report generation and JSON summary schema.

## Documentation
- Write `docs/monitoring/evidently_integration.md` detailing supported Evidently presets and report interpretation.
- Document how to customize statistical tests and drift confidence thresholds.

## Dependencies
Issue #5 (MinIO), Issue #6 (FastAPI), Issue #15 (Dataset Management).
