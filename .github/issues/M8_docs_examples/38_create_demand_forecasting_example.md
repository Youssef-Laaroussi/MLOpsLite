# #38 — Create demand forecasting example with time-series evaluation

> **Milestone:** M8 — Documentation & Examples  
> **Priority:** `P2`  
> **Labels:** `example` `P2`  

---

## Problem
ML teams often work with regression and time-series forecasting models (sales demand, inventory prediction, energy consumption), which have different evaluation metrics (MAE, RMSE, MAPE) and continuous drift characteristics than classification models.

## Objective
Build a Demand Forecasting example in `examples/demand-forecasting/` demonstrating time-series data versioning, regression experiment tracking, scheduled model re-training, and continuous error monitoring.

## Proposed solution
Implement a retail sales demand forecasting project using LightGBM or Scikit-learn RandomForestRegressor. Track RMSE/MAE metrics in MLflow, deploy the forecasting endpoint, log predicted demand versus delayed actual sales, and compute rolling error metrics.

## Technical requirements
- Directory `examples/demand-forecasting/` with `src/train.py`, `src/simulate_sales.py`, and `mlite.yaml`.
- Time-series feature engineering: lag features, rolling statistics, calendar seasonality.
- Regression evaluation metrics: MAE, MSE, RMSE, R-squared, MAPE.
- Delayed ground-truth feedback ingestion demonstrating `POST /api/v1/deployments/{id}/feedback`.

## Acceptance criteria
- Forecasting model logs regression metrics to MLflow and registers model versions.
- Inference endpoint serves batch predictions for store-item demand forecasts.
- Delayed ground-truth sales records update rolling RMSE metrics in the MLite monitoring dashboard.
- Includes clear guide on setting regression metric degradation thresholds.

## Tests
- Unit test for regression metric calculation and time-series lag feature validation.
- Integration test verifying ground-truth feedback matching for time-series predictions.

## Documentation
- `examples/demand-forecasting/README.md`.
- `docs/tutorials/demand_forecasting.md`.

## Dependencies
Issue #9 (Tracking), Issue #11 (Deployment), Issue #20 (Model Monitoring).
