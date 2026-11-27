# Dataset Management & Schema Tracking

> Lineage, immutable versions, SHA-256 integrity and schema inference for machine learning data.

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

## Storage & Version Integrity

Datasets are stored in stable, private version directories:

```
s3://mlite-datasets/users/<user-id>/projects/<project-slug>-<project-id>/datasets/<dataset-slug>-<dataset-id>/versions/v000001/data.csv
```

- Every registered upload gets the next version, including repeated content. Training
  runs can reference an existing version without uploading another copy.
- SHA-256 identifies equal content independently of the object key. Conditional
  writes prevent existing versions from being overwritten.
- Renaming a project or dataset leaves its stored prefix unchanged. The original
  uploaded filename is preserved as `original_filename` in version metadata.
- See the [storage tree and migration guide](../architecture/storage.md).

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
Storage: s3://mlite-datasets/users/<user-id>/projects/unassigned/datasets/fraud-train-<dataset-id>/versions/v000001/data.csv
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
