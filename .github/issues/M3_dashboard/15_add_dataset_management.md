# #15 — Add dataset management, schema inspection, and metadata tracking

> **Milestone:** M3 — Dashboard  
> **Priority:** `P1`  
> **Labels:** `data` `P1`  

---

## Problem
Machine learning experiments are only as reproducible as the datasets they use. Without formal dataset management, data files reside untracked in arbitrary local directories, making it impossible to audit which data distribution generated a specific production model.

## Objective
Implement dataset registration, versioning, SHA-256 integrity hashing, schema extraction (using Polars), and MinIO cloud-storage synchronization in `packages/data` and `apps/api/routers/datasets.py`.

## Proposed solution
Create `Dataset` and `DatasetVersion` database entities. Build CLI commands `mlite data register`, `mlite data list`, and `mlite data inspect`. Use Polars to parse CSV, Parquet, and JSON files, extracting row counts, column data types, null counts, and file hashes. Upload files to MinIO bucket `mlite-datasets`.

## Technical requirements
- Database entities: `Dataset` (id, project_id, name, format, description) and `DatasetVersion` (id, dataset_id, version_num, hash_sha256, row_count, column_count, schema_json, s3_key, created_at).
- Fast tabular parser using Polars (`polars.read_csv`, `polars.read_parquet`) with schema inference.
- REST API endpoints: `POST /api/v1/datasets`, `POST /api/v1/datasets/{id}/versions`, `GET /api/v1/datasets`, `GET /api/v1/datasets/{id}/versions`.
- CLI commands: `mlite data add <file_path> --project <name>`, `mlite data list`, `mlite data info <dataset_version_id>`.

## Acceptance criteria
- Registering a CSV or Parquet file computes an accurate SHA-256 hash and extracts column data types automatically.
- Dataset version files are safely uploaded to MinIO under `s3://mlite-datasets/<project>/<hash>/`.
- `mlite data list` displays all versioned datasets with row counts and file sizes.
- Duplicate uploads of identical content resolve to the same content hash without redundant storage.

## Tests
- Unit tests in `tests/unit/data/test_dataset_service.py` verifying schema parsing on CSV and Parquet files.
- Integration tests verifying MinIO upload and hash validation.

## Documentation
- Write `docs/data/datasets.md` explaining dataset lifecycle, supported formats, and schema tracking.
- Add CLI examples for registering new data versions before model training.

## Dependencies
Issue #3 (PostgreSQL), Issue #5 (MinIO Storage), Issue #7 (Project API).
