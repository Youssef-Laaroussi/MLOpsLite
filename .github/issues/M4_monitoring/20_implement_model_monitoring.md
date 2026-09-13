# #20 — Implement model performance and concept drift monitoring

> **Milestone:** M4 — Monitoring  
> **Priority:** `P1`  
> **Labels:** `monitoring` `P1`  

---

## Problem
Even when input features remain stable, the relationship between features and target labels can change (concept drift). Furthermore, when ground-truth labels arrive post-inference (delayed feedback), teams need an automated mechanism to compute production accuracy, precision, recall, or RMSE over time.

## Objective
Build the Model Monitoring engine in `packages/monitoring/model_monitor.py` to match delayed ground-truth labels with historical predictions, compute live production performance metrics, and detect concept degradation.

## Proposed solution
Create an ingestion endpoint for delayed ground-truth feedback (`POST /api/v1/deployments/{id}/feedback`). Link ground-truth labels to stored prediction IDs. Compute real-world performance metrics across sliding time windows and compare against the model's initial baseline evaluation from the model registry.

## Technical requirements
- Delayed feedback API endpoint accepting `{prediction_id: str, ground_truth: Any, timestamp: Optional[datetime]}`.
- Metric calculation routines: Classification (Accuracy, Precision, Recall, F1, ROC-AUC, Confusion Matrix); Regression (MAE, MSE, RMSE, R2).
- Degradation detector: triggers when current metric drops by more than $X\%$ compared to baseline registration metrics.
- Database table `model_performance_history`: records periodic metric snapshots for active deployments.

## Acceptance criteria
- Submitting ground-truth labels updates matched prediction records in the database.
- The performance calculation worker generates metric snapshots and correctly flags significant accuracy drops.
- `mlite monitor performance <model_name>` displays current production accuracy vs training baseline.
- Supports delayed ground-truth ingested minutes, days, or weeks after original inference.

## Tests
- Integration test `tests/integration/test_model_monitoring.py` sending 500 predictions, ingesting delayed labels, and verifying computed accuracy and F1.
- Unit test for degradation detection triggers.

## Documentation
- Write `docs/monitoring/performance_monitoring.md` documenting the ground-truth ingestion API and concept drift alerts.
- Include architecture diagram explaining delayed feedback loops.

## Dependencies
Issue #10 (Model Registry), Issue #12 (Prediction REST Endpoint).
