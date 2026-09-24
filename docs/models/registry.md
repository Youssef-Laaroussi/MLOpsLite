# MLite Model Registry

> Centralized model governance, versioning, staging, and automated promotion rules.

---

## Overview

The MLite Model Registry provides formal governance for trained machine learning artifacts. It bridges MLflow experiment runs with production serving environments, ensuring that model versions progress through structured validation gates.

### Model Lifecycle Stages

Each model version transitions through an explicit lifecycle:

```
[ DEVELOPMENT ] ──> [ CANDIDATE ] ──> [ STAGING ] ──> [ PRODUCTION ] ──> [ ARCHIVED ]
        │                  │               │
        └──────────────────┴───────────────┴────────────────────────────> [ ARCHIVED ]
```

| Stage | Description | Deployment Target | Promotion Gate |
|---|---|---|---|
| `DEVELOPMENT` | Initial registration from training run | Local sandbox | Auto-assigned on registration |
| `CANDIDATE` | Passed training convergence & basic unit tests | Dev cluster | Model evaluation benchmarks meet minimum thresholds |
| `STAGING` | Undergoing integration & shadow testing | Staging cluster | Canary testing, latency verification |
| `PRODUCTION` | Active production serving | Production cluster | Strict single-active exclusivity per model |
| `ARCHIVED` | Deprecated or superseded version | Cold storage | Automatically demoted when new version enters Production |

---

## Single Production Exclusivity & Auto-Demotion

Only **one** version of a registered model may hold the `PRODUCTION` stage simultaneously.

When version $N+1$ is promoted to `PRODUCTION`:
1. The currently active `PRODUCTION` version (e.g. version $N$) is automatically demoted to `ARCHIVED`.
2. The audit log records the promotion event, timestamp, and user/trigger.
3. If version $N+1$ encounters production anomalies, instant rollback is possible by re-promoting version $N$.

---

## CLI Usage

### 1. Register a Model from a Training Run

```bash
# Register from MLflow run ID
mlite model register \
  --name "churn-predictor" \
  --run-id "4b8d7ef293a14c3e809b44123567890a" \
  --description "XGBoost classifier with Optuna hyperparams"
```

### 2. List Registered Models & Versions

```bash
# List all models
mlite model list

# Filter by stage
mlite model list --stage PRODUCTION
```

### 3. Compare Two Versions

```bash
# Compare metrics between v1 and v2 side by side
mlite model compare churn-predictor --v1 1 --v2 2
```

### 4. Promote a Version

```bash
# Promote v2 to CANDIDATE
mlite model promote churn-predictor --version 2 --stage CANDIDATE

# Promote v2 to STAGING
mlite model promote churn-predictor --version 2 --stage STAGING

# Promote v2 to PRODUCTION (auto-demotes previous production version)
mlite model promote churn-predictor --version 2 --stage PRODUCTION
```

---

## REST API Reference

| Method | Endpoint | Description |
|---|---|---|
| `POST` | `/api/v1/models/register` | Register a new model or create next sequential version |
| `GET` | `/api/v1/models/` | List all registered models |
| `GET` | `/api/v1/models/{name}/versions` | List all versions for a given model |
| `POST` | `/api/v1/models/{name}/versions/{version}/promote` | Promote version to target stage |
| `GET` | `/api/v1/models/compare` | Compare metrics between two versions side-by-side |

### Example: Promote Version via API

```bash
curl -X POST http://localhost:8000/api/v1/models/churn-predictor/versions/2/promote \
  -H "Content-Type: application/json" \
  -d '{"stage": "PRODUCTION"}'
```

Response:
```json
{
  "model_name": "churn-predictor",
  "version": 2,
  "stage": "PRODUCTION",
  "promoted": true
}
```

---

## Rollback Procedure

If a deployed model degrades in production:

1. Identify the previous stable version:
   ```bash
   mlite model list --stage ARCHIVED
   ```
2. Re-promote the previous stable version back to `PRODUCTION`:
   ```bash
   mlite model promote churn-predictor --version 1 --stage PRODUCTION
   ```
3. Serving endpoints automatically route traffic to the re-promoted version within seconds.
