# Object Storage Architecture (MinIO / S3)

MLite uses a self-hosted, S3-compatible **MinIO** instance for all binary artifacts, raw datasets, serialized model weights, evaluation reports, and backups.

---

## 1. Storage Topology & Buckets

When Docker Compose starts, the `minio-create-buckets` initialization service automatically provisions three primary buckets:

| Bucket Name | Purpose | Retention |
| :--- | :--- | :--- |
| `mlite-datasets` | Raw and versioned tabular datasets, DVC cache, and Parquet files | Persistent |
| `mlflow-artifacts` | MLflow model artifacts, serialized weights (Pickle, ONNX, PyTorch), run metrics | Persistent |
| `mlite-evaluations` | Evidently AI standalone HTML reports, drift test suites, data quality summaries | 90 days default |

---

## 2. Configuration & Credentials

MinIO parameters are configured in `.env`:

```env
MINIO_ROOT_USER=mlite_minio_admin
MINIO_ROOT_PASSWORD=mlite_minio_password
MINIO_PORT=9000
MINIO_CONSOLE_PORT=9001
MINIO_ENDPOINT=http://mlite-storage:9000
MINIO_DATASETS_BUCKET=mlite-datasets
MINIO_MLFLOW_BUCKET=mlflow-artifacts
MINIO_EVALUATIONS_BUCKET=mlite-evaluations

# S3 Compatibility for AWS Boto3 / DVC / MLflow
AWS_ACCESS_KEY_ID=mlite_minio_admin
AWS_SECRET_ACCESS_KEY=mlite_minio_password
AWS_DEFAULT_REGION=us-east-1
MLFLOW_S3_ENDPOINT_URL=http://mlite-storage:9000
MLFLOW_S3_IGNORE_TLS=true
```

---

## 3. StorageClient Python SDK

The `packages.core.storage.StorageClient` provides a Python interface for S3 operations:

### Uploading a Dataset
```python
from packages.core.storage import get_storage_client

storage = get_storage_client()

# Upload a local file with automated SHA-256 computation
result = storage.upload_file(
    local_path="data/raw/transactions.csv",
    s3_key="projects/fraud-detection/v1/transactions.csv",
    bucket_name="mlite-datasets",
)

print(result["s3_uri"])   # s3://mlite-datasets/projects/fraud-detection/v1/transactions.csv
print(result["sha256"])   # 66f466b4...
print(result["size_bytes"])
```

### Generating Presigned Download URLs
```python
# Create a secure temporary download link (valid for 1 hour)
download_url = storage.generate_presigned_url(
    s3_key="models/fraud_v1.pkl",
    bucket_name="mlflow-artifacts",
    expiration_seconds=3600,
)
```

### Downloading and Verifying Files
```python
# Download to a local destination
local_file = storage.download_file(
    s3_key="projects/fraud-detection/v1/transactions.csv",
    local_path="/tmp/transactions.csv",
)

# Check existence
if storage.file_exists("models/fraud_v1.pkl"):
    print("Model weights exist in MinIO.")
```

---

## 4. MinIO Web Console Access

You can inspect all stored files, bucket policies, and usage metrics via the browser:
- **URL**: `http://localhost:9001`
- **Username**: `mlite_minio_admin`
- **Password**: `mlite_minio_password`
