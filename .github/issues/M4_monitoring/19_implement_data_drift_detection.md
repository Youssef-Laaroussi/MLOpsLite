# #19 — Implement feature data drift detection and threshold analysis

> **Milestone:** M4 — Monitoring  
> **Priority:** `P1`  
> **Labels:** `monitoring` `P1`  

---

## Problem
After a model is deployed to production, input distributions drift over time due to seasonal shifts, user behavior changes, or upstream data pipeline errors. Without automated drift detection, models degrade silently without the data science team realizing it.

## Objective
Implement automated data drift detection in `packages/monitoring/drift_detector.py` comparing historical baseline data with live inference payloads, calculating feature-level drift scores, and determining overall drift severity.

## Proposed solution
Build a scheduled or on-demand drift detection job. The worker queries logged production inference requests over a configurable sliding window (e.g. last 24 hours or last 10,000 predictions), compares them with the reference training dataset using Evidently / Scipy statistical tests, and computes drift status per feature (LOW, MEDIUM, HIGH).

## Technical requirements
- Drift statistical algorithms: Kolmogorov-Smirnov test for numerical features, Chi-square test for categorical features, Jensen-Shannon divergence.
- Configurable drift threshold in `mlite.yaml`: `drift_threshold: 0.20` (p-value or drifted feature ratio).
- Drift output classification: `LOW` (drifted features < 10%), `MEDIUM` (10% - 25%), `HIGH` (> 25%).
- CLI command: `mlite monitor drift <deployment_id_or_model>`.
- REST endpoint: `POST /api/v1/monitoring/drift/check` and `GET /api/v1/monitoring/drift/{model_name}`.

## Acceptance criteria
- Executing `mlite monitor drift fraud-detector` outputs feature-level drift breakdown table in the terminal.
- If drifted feature ratio exceeds the configured threshold, the system flags overall drift as `HIGH` and generates a warning event.
- Historical drift trends are persisted in PostgreSQL table `drift_evaluations` for time-series charting.
- Drift detection accurately flags artificially shifted test distributions with statistical significance.

## Tests
- Unit tests in `tests/unit/monitoring/test_drift_detector.py` comparing shifted Gaussian distributions against baseline.
- Test sliding window inference buffer sampling.

## Documentation
- Write `docs/monitoring/drift_detection.md` explaining statistical tests, p-values, and recommended remediation actions.
- Provide guide on configuring drift alert thresholds in `mlite.yaml`.

## Dependencies
Issue #12 (Prediction REST Endpoint), Issue #18 (Evidently Integration).
