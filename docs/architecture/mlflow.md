# MLflow Tracking Architecture & Artifact Integration

MLite leverages **MLflow 2.15+** as its core experiment tracking and model registry storage engine, backed by **PostgreSQL 16** for relational metadata and **MinIO** for artifact storage.

---

## 1. Architecture Topology

```
┌─────────────────┐       Metrics & Runs       ┌─────────────────────────┐
│    MLite CLI    │ ─────────────────────────► │      MLflow Server      │
│ & Training Code │                            │     (Port 5000)         │
└────────┬────────┘                            └───────┬─────────┬───────┘
         │                                             │         │
         │ Artifacts (Weights / Plots)                 │         │
         ▼                                             ▼         ▼
┌─────────────────┐                              ┌──────────┐ ┌──────────┐
│  MinIO Storage  │                              │PostgreSQL│ │  MinIO   │
│ (Port 9000/9001)│                              │(mlflow_db│ │(Artifacts│
└─────────────────┘                              └──────────┘ └──────────┘
```

---

## 2. Configuration & Credentials

MLflow is launched via `docker-compose.yml` with the following parameters:

- **Tracking UI**: `http://localhost:5000`
- **Backend Store URI**: `postgresql://mlite_user:${DB_PASSWORD}@mlite-db:5432/mlflow_db`
- **Default Artifact Root**: `s3://mlflow-artifacts/`
- **S3 Endpoint URL**: `http://mlite-storage:9000`
- **S3 Region**: `us-east-1`

---

## 3. Python SDK Integration

To log experiments from your Python scripts, use the `packages.tracking` module:

```python
import mlflow
from packages.tracking import configure_mlflow_environment, MLiteMLflowManager

# Configure environment and tracking URI
configure_mlflow_environment()

manager = MLiteMLflowManager()
experiment_id = manager.get_or_create_experiment("iris-classification")

mlflow.set_experiment(experiment_id=experiment_id)

with mlflow.start_run(run_name="logistic-regression-baseline"):
    # Log hyperparameters
    mlflow.log_param("solver", "lbfgs")
    mlflow.log_param("max_iter", 200)

    # Log metrics
    mlflow.log_metric("accuracy", 0.96)
    mlflow.log_metric("f1_score", 0.95)

    # Log model artifacts (saved directly to MinIO bucket mlflow-artifacts)
    # mlflow.sklearn.log_model(model, artifact_path="model")
```

---

## 4. MLflow Web UI Access

The MLflow web console is accessible locally at:
- **URL**: [http://localhost:5000](http://localhost:5000)
- Here you can inspect all runs, compare hyperparameter charts, and review registered model versions.
