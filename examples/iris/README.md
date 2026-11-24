# Iris Classification Starter Example

> **Component:** `examples/iris/`  
> **Milestone:** M8 — Documentation & Examples (Issue #36)  
> **Target Runtime:** `< 2 minutes` (Zero GPU requirements)

---

## Overview

This starter example walks you through the entire MLite lifecycle using the classic Iris dataset:
1. Initialize the project workspace
2. Train a Scikit-Learn Logistic Regression model
3. Log metrics, parameters, and model artifacts to MLflow
4. Register the model and promote it to `PRODUCTION`
5. Deploy the model into an isolated Docker inference container
6. Query predictions via `curl`

---

## Start from a clean checkout

From the repository root:

```bash
docker compose build mlite-serving
docker compose up -d --build
docker compose up minio-create-buckets
python3.12 -m venv examples/iris/.venv
source examples/iris/.venv/bin/activate
python -m pip install -r examples/iris/requirements.txt
```

Complete [installation setup](../../docs/getting-started/solo-setup.md) first.
Use your actual personal account credentials for the acceptance scenario:

```bash
MLFLOW_S3_ENDPOINT_URL=http://localhost:9000 \
AWS_ACCESS_KEY_ID=mlite_minio_admin \
AWS_SECRET_ACCESS_KEY=mlite_minio_password \
ADMIN_USER=YOUR_USERNAME ADMIN_PASSWORD=YOUR_PASSWORD \
python scripts/test_iris_lifecycle.py
```

With custom credentials or ports, supply the matching local MinIO endpoint and
credentials, plus `ADMIN_USER`, `ADMIN_PASSWORD`, and `MLITE_API_URL` as needed.
The test creates uniquely named resources and stops the inference container after
verification. The run and catalog records remain available for inspection.

On a disposable CI installation, `MLITE_SETUP_TOKEN` allows this script to perform
the one-time setup with the supplied account credentials (password at least 12
characters). This does not recreate an administrator on configured installations.

## Step-by-Step Walkthrough

Use the [CLI installation guide](../../docs/getting-started/installation.md) for the manual commands below. Run the training command from this example directory with the same MinIO settings as above.

### 1. Initialize Project & Register Dataset
```bash
# Register dataset into MinIO object storage
mlite data add data/iris.csv --name iris-dataset
```

### 2. Train Model with MLflow Tracking
```bash
python src/train.py
```
Output:
```
==================================================
Iris Classification Training Complete!
   MLflow Run ID: 8bf246a382d5471e98d98d896173a1ef
   Accuracy:      0.9667
   F1-Score:      0.9666
==================================================
```

### 3. Register & Promote Model
```bash
# Register model version 1
mlite model register iris-classifier --run-id <YOUR-RUN-ID>

# Promote to Production
mlite model promote iris-classifier --version 1 --stage PRODUCTION
```

### 4. Deploy Inference Container
```bash
mlite deploy iris-classifier --version 1 --port 8100
```

Verify that the container is running:
```bash
mlite deployment list
```

### 5. Query Real-Time Predictions
Execute the provided test script:
```bash
chmod +x test_predict.sh
./test_predict.sh 8100
```
Or send an ad-hoc `curl` request:
```bash
curl -X POST http://localhost:8100/predict \
  -H "Content-Type: application/json" \
  -d '{"inputs": [[5.1, 3.5, 1.4, 0.2]]}'
```

For this input, confirm `predictions` is `[0]` (Setosa), `model` is
`iris-classifier` and `version` matches the deployed version.

---

## Retrain on a new labeled snapshot

From this example directory, with the same tracking and storage settings:

```bash
IRIS_DATA_PATH=/path/to/new-iris.csv python src/train.py --min-accuracy 0.90
```

Choose a threshold appropriate to your dataset. A run below the threshold is
logged as failed and its model artifact is not published. A passing run can be
registered as a new version using its run ID. Promotion is a separate action.

## Cleanup

When finished, stop the deployment:
```bash
mlite deployment list
mlite deployment stop <deployment-id>
```
