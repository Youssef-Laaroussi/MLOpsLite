# DVC Data Version Control Integration

> Reproducible Git-native dataset versioning backed by self-hosted MinIO object storage.

---

## Overview

While Git efficiently tracks source code changes, storing gigabyte-scale datasets inside Git leads to repository bloat and slow clone operations. MLite seamlessly integrates **Data Version Control (DVC)**:
1. **Lightweight Pointers**: Large dataset files are replaced by tiny `.dvc` text pointer files tracked in Git.
2. **MinIO Backend**: Data chunks and raw files are pushed directly to self-hosted MinIO object storage (`s3://mlite-datasets/dvc-cache`).
3. **Zero AWS Friction**: MLite automatically generates the S3 endpoint configuration pointing to your local or private MinIO instance.

---

## Workflow Diagram

```
Local Workspace                        Git Remote                       MinIO (S3)
───────────────                        ──────────                       ──────────
training_data.csv ──(dvc add)──> training_data.csv.dvc ──(git push)──> Repository
       │                                                                   ▲
       └────────────────────────(dvc push)─────────────────────────────────┘
                                Raw data chunks stored in s3://mlite-datasets/
```

---

## CLI Commands

### 1. Initialize DVC in an MLite Project

```bash
mlite data dvc-init
```

This automatically configures:
- DVC repository storage
- Default remote `minio` pointing to `http://localhost:9000` (or your configured `MINIO_ENDPOINT`)
- S3 credentials mapped from your `.env` or system environment

### 2. Track a Dataset

```bash
# Add file to DVC tracking
dvc add data/training_records.csv

# Git commit the lightweight pointer file
git add data/training_records.csv.dvc data/.gitignore
git commit -m "Track training data v1 via DVC"
```

### 3. Push Data to MinIO Remote Cache

```bash
mlite data push
```

### 4. Pull Historical Data on Another Machine

When checking out an older Git commit or cloning the repo on a teammate's machine:

```bash
git checkout <commit-sha>
mlite data pull
```

---

## Best Practices for Small Teams

- **Avoid Cloud Egress Costs**: Keeping raw training tensors and images on local NVMe MinIO eliminates AWS S3 egress and API request charges.
- **Pair with MLflow Runs**: Record the `.dvc` file SHA in MLflow experiment run parameters (`mlflow.log_param("data_dvc_hash", dvc_hash)`).
- **Graceful Fallback**: If a developer or CI worker does not have DVC installed, MLite provides clear guidance: `pip install dvc dvc-s3`.
