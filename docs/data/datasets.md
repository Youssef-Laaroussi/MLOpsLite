# Dataset Management & Schema Tracking

> Lineage, versioning, SHA-256 content addressing, and schema inference for machine learning data.

---

## Overview

MLite ensures that training data is tracked with the same rigor as model weights and code. Every dataset version is immutable, content-hashed with SHA-256, and stored in MinIO object storage under the `mlite-datasets` bucket.

---

## Supported File Formats

| Format | Parsing Engine | Schema Inference | Content Hashing |
|---|---|---|---|
| **CSV / TSV** | Polars Fast CSV Reader | Inferred column types + null counts | SHA-256 block streaming |
| **Parquet** | Polars Arrow Engine | Native Arrow data types | SHA-256 block streaming |
| **JSON / JSONL** | Polars JSON Engine | Inferred record attributes | SHA-256 block streaming |

---

## Storage & Content Deduplication

Datasets are stored using content-addressed naming:

```
s3://mlite-datasets/<dataset_name>/<sha256_hash>/<filename>
```

- **Zero Duplication**: Uploading the identical dataset across different training runs reuses the existing S3 key, saving storage and network bandwidth.
- **Audit Integrity**: Any row modification or null value injection changes the SHA-256 hash, creating an explicit next sequential version (e.g. `v1` $\to$ `v2`).

---

## CLI Reference

### 1. Register a Dataset & Create Version

```bash
# Register a CSV dataset
mlite data add ./data/credit_fraud_train.csv --name "fraud-train" --description "Q3 training cohort"

# Or register parquet
mlite data add ./data/features.parquet --name "user-features"
```

Output:
```
✓ Dataset version registered successfully!
Dataset: fraud-train (ID: a3f8219c)
Version: v1
SHA-256: 8f9b23c4a17e8890...
Rows: 142,500 | Columns: 32
Size: 18.4 MB
Storage: s3://mlite-datasets/fraud-train/8f9b23c4.../credit_fraud_train.csv
```

### 2. Inspect File Schema Locally

Before uploading, inspect column names, inferred data types, and null counts:

```bash
mlite data info ./data/credit_fraud_train.csv
```

### 3. List All Versioned Datasets

```bash
mlite data list
```

---

## REST API Endpoints

| Method | Path | Description |
|---|---|---|
| `POST` | `/api/v1/datasets/` | Create logical dataset container |
| `GET` | `/api/v1/datasets/` | List all datasets |
| `GET` | `/api/v1/datasets/{id}` | Get dataset details |
| `POST` | `/api/v1/datasets/{id}/versions` | Upload or register a new version |
| `GET` | `/api/v1/datasets/{id}/versions` | List all historical versions |
| `GET` | `/api/v1/datasets/inspect?file_path=...` | Inspect tabular file schema |
