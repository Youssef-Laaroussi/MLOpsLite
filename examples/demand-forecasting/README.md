# Retail Demand Forecasting with MLite

This directory contains a complete time-series regression example demonstrating store-item demand forecasting, MLflow logging, deployment serving, and delayed ground-truth feedback ingestion.

---

## Structure

```text
examples/demand-forecasting/
├── mlite.yaml                # Project configuration
├── requirements.txt          # Python dependencies
├── README.md                 # This file
└── src/
    ├── generate_data.py      # Generates synthetic daily sales with lag features
    ├── train.py              # Trains RandomForestRegressor and logs to MLflow
    └── simulate_sales.py     # Queries deployment & sends delayed feedback to MLite
```

---

## Quickstart

### 1. Install Dependencies

```bash
cd examples/demand-forecasting
pip install -r requirements.txt
```

### 2. Generate Daily Sales Data

```bash
python src/generate_data.py
```
This generates `data/daily_sales_train.csv` (140 days) and `data/daily_sales_test.csv` (40 days) with temporal features (`lag_1`, `lag_7`, `lag_14`, `rolling_mean_7`, `promo`, `is_weekend`).

### 3. Register Data with MLite

```bash
mlite data register \
  --name retail-sales-train \
  --path data/daily_sales_train.csv \
  --description "140 days store-item daily demand"
```

### 4. Train Model

```bash
python src/train.py
```
- Trains a `RandomForestRegressor`.
- Logs hyper-parameters and metrics (RMSE, MAE, R²) to MLflow.
- Outputs serialized model to `models/demand_forecaster.pkl`.

### 5. Register & Deploy Model

```bash
mlite models register \
  --name demand-forecaster \
  --version 1 \
  --artifact-uri "models/demand_forecaster.pkl" \
  --framework scikit-learn \
  --description "Store-item daily demand forecaster"

mlite deployments create \
  --name demand-forecaster-prod \
  --model demand-forecaster \
  --version 1 \
  --port 8200
```

### 6. Simulate Daily Inferences & Delayed Feedback

When items are sold, the actual ground truth becomes available with a delay. Send predictions and ingest actual feedback:

```bash
python src/simulate_sales.py --port 8200 --deployment-id demand-forecaster-prod
```

### 7. Monitor Performance Degradation

Query live performance metrics calculated from ingested ground-truth:

```bash
curl http://localhost:8000/api/v1/deployments/demand-forecaster-prod/metrics
```
