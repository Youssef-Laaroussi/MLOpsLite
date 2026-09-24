# ⚡ 5-Minute Quickstart Guide (Zero to Hero)

> **Component:** `docs/getting-started/quickstart.md`  
> **Milestone:** M8 — Documentation & Examples (Issue #33)

---

## Welcome to MLite!

This tutorial guides you through your first complete machine learning lifecycle with MLite in under **5 minutes**:
1. Initialize a new MLite project
2. Version a training dataset
3. Run an experiment and log metrics to MLflow
4. Promote a model version to Production in the Registry
5. Deploy a real-time REST prediction container
6. Query predictions via `curl`

---

## Step 1: Initialize Your Project

Create a new directory and initialize an MLite project workspace:

```bash
mkdir my-ml-project && cd my-ml-project
mlite init my-ml-project
```

This creates a local `.mlite/` configuration folder and project metadata file.

---

## Step 2: Version Your Dataset

Create a simple dataset or use sample data:

```bash
cat << 'EOF' > data.csv
sepal_length,sepal_width,petal_length,petal_width,species
5.1,3.5,1.4,0.2,0
4.9,3.0,1.4,0.2,0
7.0,3.2,4.7,1.4,1
6.4,3.2,4.5,1.5,1
6.3,3.3,6.0,2.5,2
5.8,2.7,5.1,1.9,2
EOF

# Register the dataset into MinIO object storage
mlite data add data.csv --name iris-training
```

---

## Step 3: Run an Experiment & Log Metrics

Create a simple training script `train.py`:

```python
import mlflow
import polars as pl
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split

mlflow.set_tracking_uri("http://localhost:5000")
mlflow.set_experiment("iris-classification")

with mlflow.start_run() as run:
    # Load dataset
    df = pl.read_csv("data.csv")
    X = df.select(["sepal_length", "sepal_width", "petal_length", "petal_width"]).to_numpy()
    y = df["species"].to_numpy()

    # Train model
    model = LogisticRegression(max_iter=200)
    model.fit(X, y)
    accuracy = model.score(X, y)

    # Log metrics & parameters to MLflow
    mlflow.log_param("max_iter", 200)
    mlflow.log_metric("accuracy", accuracy)
    mlflow.sklearn.log_model(model, "model")

    print(f"✓ Training complete! Run ID: {run.info.run_id}, Accuracy: {accuracy:.4f}")
```

Execute the training script:
```bash
python train.py
```

Open your browser at `http://localhost:5000` to see your experiment run metrics in the MLflow UI!

---

## Step 4: Register & Promote to Production

Register your trained model version in the MLite central registry:

```bash
# Register model version 1
mlite model register iris-classifier --run-id <run-id-from-step-3>

# Promote to Production
mlite model promote iris-classifier --version 1 --stage PRODUCTION
```

---

## Step 5: Deploy Model Container

Deploy your production model into an isolated inference container on port 8100:

```bash
mlite deploy iris-classifier --version 1 --port 8100
```

Verify deployment status:
```bash
mlite deployment list
```

---

## Step 6: Query Predictions

Send a JSON inference payload to your live model container:

```bash
curl -X POST http://localhost:8100/predict \
  -H "Content-Type: application/json" \
  -d '{"features": [5.1, 3.5, 1.4, 0.2]}'
```

**Response (200 OK):**
```json
{
  "prediction": [0],
  "probabilities": [0.98, 0.01, 0.01],
  "model_name": "iris-classifier",
  "model_version": 1,
  "latency_ms": 3.8
}
```

---

## Next Steps

- Explore the [React Dashboard](http://localhost:3000) for visual monitoring and drift alerts.
- Check out the [Production Fraud Detection Tutorial](../tutorials/fraud_detection.md) to see automated drift detection and emergency rollback in action!
