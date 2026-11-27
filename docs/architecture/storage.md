# Object Storage Architecture (MinIO / S3)

MLite uses a self-hosted, S3-compatible **MinIO** instance for datasets, model artifacts and evaluation reports. Migration backups stay in a private local directory.

---

## 1. Storage Topology & Buckets

When Docker Compose starts, the `minio-create-buckets` initialization service automatically provisions three primary buckets:

| Bucket Name | Purpose | Retention |
| :--- | :--- | :--- |
| `mlite-datasets` | Raw and versioned tabular datasets, DVC cache, and Parquet files | Persistent |
| `mlflow-artifacts` | MLflow model artifacts, serialized weights (Pickle, ONNX, PyTorch), run metrics | Persistent |
| `mlite-evaluations` | Evidently AI standalone HTML reports, drift metrics and quality reports | Persistent; no automatic expiry configured |

### Stable object tree

```text
mlite-datasets/
└── users/<user-id>/projects/<project-slug>-<project-id>/
    └── datasets/<dataset-slug>-<dataset-id>/
        └── versions/
            ├── v000001/data.csv
            └── v000002/data.csv

mlite-evaluations/
└── users/<user-id>/projects/<project-slug>-<project-id>/
    ├── datasets/<dataset-slug>-<dataset-id>/
    │   └── versions/v000001/quality/<UTC-date>-<evaluation-id>/report.json
    └── models/<model-slug>-<model-id>/
        └── drift/<UTC-date>-<evaluation-id>/
            ├── report.html
            └── metrics.json

mlflow-artifacts/
└── <native MLflow experiment/run artifact paths>
```

- Resource folders combine an ASCII lowercase slug and the complete immutable ID.
  The prefix is stored in PostgreSQL on first use. Renaming the display name or
  project slug does not rename the objects. Email addresses are not used in keys.
- A dataset or model without a project uses `users/<user-id>/projects/unassigned/`.
- Dataset uploads use `data.csv`, `data.parquet`, etc. The original filename,
  checksum, dimensions and version remain in PostgreSQL. No `manifest.json` is added.
- Each upload creates a separate immutable version. PostgreSQL serializes version
  allocation, and S3 conditional writes prevent overwriting an existing object.
  A storage failure fails the operation instead of saving a nonexistent S3 URI.
- Quality reports are archived as JSON; drift reports contain HTML and metrics JSON.
  If drift targets a deployment, its real `versions/v000001/` folder precedes
  `drift/`. Evaluations without a deployment do not invent a model version.
- MLflow artifacts and the `dvc-cache/` prefix retain their native layout.
- MinIO folders are virtual prefixes: they appear when the first file is uploaded.
  An empty bucket does not need placeholder files or pre-created folders.

### Migrating existing objects

The additive schema migration `0003_storage_layout` also runs during API startup.
Object moves are explicit operator actions. From the project root, with the
Python environment activated, preview the plan:

```bash
python -m packages.core.storage.migrate --local-compose
```

Apply it after reviewing the preview and pausing concurrent uploads:

```bash
python -m packages.core.storage.migrate --local-compose --apply \
  --backup-dir secrets/backups/storage-layout-local
```

For a non-Compose installation, omit `--local-compose` and configure `DATABASE_URL`
and the storage environment normally. `--local-compose` reads this checkout's
`.env` and connects through its localhost-published ports.

The migration backs up original bytes and a reference journal, copies and verifies
SHA-256, commits the reference changes, then verifies again before removing old
keys. It refuses to replace a destination with different bytes. Reuse the same
`--backup-dir` to resume an interrupted migration. Keep this directory private;
the default is under Git-ignored `secrets/backups/`.

Only add `--archive-unreferenced` when the old unreferenced objects have been
reviewed: they may have external consumers not recorded in MLite. Such files are
preserved under `legacy/unassigned/`, without assigning them to a user or inventing
version numbers. MLflow's bucket, registered legacy model artifacts and DVC's cache
are protected. A source still needed by a registered model is retained.

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

### Low-level object upload (installation operators)

Normal dataset uploads should use the authenticated dataset API, which allocates
the private prefix and next version. This SDK is for trusted installation code;
its object keys do not themselves enforce account permissions.
```python
from packages.core.storage import get_storage_client

storage = get_storage_client()

# Upload a local file with automated SHA-256 computation
result = storage.upload_file(
    local_path="data/raw/transactions.csv",
    s3_key="users/<user-id>/projects/<project-slug>-<project-id>/datasets/<dataset-slug>-<dataset-id>/versions/v000001/data.csv",
    bucket_name="mlite-datasets",
    overwrite=False,
)

print(result["s3_uri"])
print(result["sha256"])  # 66f466b4...
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
    s3_key=result["s3_key"],
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
- **Username**: your `.env` value for `MINIO_ROOT_USER`
- **Password**: your `.env` value for `MINIO_ROOT_PASSWORD`
