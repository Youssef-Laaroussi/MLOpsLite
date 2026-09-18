# Iris Classification Starter Tutorial

> **Component:** `examples/iris/`  
> **Milestone:** M8 — Documentation & Examples (Issue #36)  
> **Target Runtime:** `< 2 minutes` (Zero GPU requirements)

---

## 1. Overview

This starter tutorial walks through the full end-to-end MLite workflow using the classic Iris dataset:
1. Initialize the project workspace
2. Train a Scikit-Learn Logistic Regression model
3. Log metrics, parameters, and model artifacts to MLflow
4. Register the model and promote it to `PRODUCTION`
5. Deploy the model into an isolated Docker inference container
6. Query real-time predictions via `curl`

---

## 2. Prerequisites

Ensure MLite services are running:
```bash
docker compose up -d
```

Install example Python dependencies:
```bash
cd examples/iris
pip install -r requirements.txt
```

---

## 3. Step-by-Step Walkthrough

### Step 3.1: Initialize Project & Register Dataset
```bash
# Register dataset into MinIO object storage
mlite data add data/iris.csv --name iris-dataset
```

### Step 3.2: Train Model with MLflow Tracking
```bash
python src/train.py
```
Output:
```text
==================================================
🌺 Iris Classification Training Complete!
   MLflow Run ID: 8bf246a382d5471e98d98d896173a1ef
   Accuracy:      0.9667
   F1-Score:      0.9666
==================================================
```

### Step 3.3: Register & Promote Model
```bash
# Register model version 1
mlite model register iris-classifier --run-id <YOUR-RUN-ID>

# Promote to Production
mlite model promote iris-classifier --version 1 --stage PRODUCTION
```

### Step 3.4: Deploy Inference Container
```bash
mlite deploy iris-classifier --version 1 --port 8100
```

Verify that the container is running:
```bash
mlite deployment list
```

### Step 3.5: Query Real-Time Predictions
Execute the provided test script:
```bash
chmod +x test_predict.sh
./test_predict.sh 8100
```
Or send an ad-hoc `curl` request:
```bash
curl -X POST http://localhost:8100/predict \
  -H "Content-Type: application/json" \
  -d '{"features": [5.1, 3.5, 1.4, 0.2]}'
```

**Expected Response (Species 0 = Setosa):**
```json
{
  "prediction": [0],
  "probabilities": [0.985, 0.012, 0.003],
  "model_name": "iris-classifier",
  "model_version": 1,
  "latency_ms": 3.2
}
```

---

## 4. Cleanup

When finished, stop the deployment:
```bash
mlite deployment list
mlite deployment stop <deployment-id>
```
