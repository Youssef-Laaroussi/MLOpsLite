# MLite CLI — Overview

> **Entry point:** `mlite`  
> **Installation:** `pip install -e .` (from project root)

---

## Quick Start

```bash
# Initialize a new ML project
mlite init my-fraud-detector --description "Credit card fraud classifier"

# Check platform status
mlite status

# Run a training script with experiment tracking
mlite experiment run src/train.py --project my-fraud-detector

# List experiments
mlite experiment list --project my-fraud-detector

# Register and promote a model
mlite model register fraud-xgb --run-id abc123
mlite model promote fraud-xgb --version 1 --stage PRODUCTION
mlite model compare fraud-xgb --v1 1 --v2 2
```

---

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `MLITE_API_URL` | `http://localhost:8000` | MLite API base URL |
| `MLFLOW_TRACKING_URI` | `http://localhost:5000` | MLflow tracking server |
| `MINIO_ENDPOINT` | `http://localhost:9000` | MinIO storage endpoint |

---

## Configuration

Local configuration is stored in `.mlite/config.json` within each project:

```bash
# View current config
mlite config view

# Set a value
mlite config set api_url http://my-server:8000

# Get a value
mlite config get api_url
```
