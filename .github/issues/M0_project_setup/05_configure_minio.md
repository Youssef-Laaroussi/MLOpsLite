# #5 — Configure MinIO S3-compatible object storage and SDK client wrapper

> **Milestone:** M0 — Project Setup  
> **Priority:** `P0`  
> **Labels:** `storage` `P0`  

---

## Problem
MLite requires self-hosted, S3-compatible storage for raw datasets, model weights, evaluation reports, and backups. Without an abstracted storage layer, code will become tightly coupled to local disk paths or proprietary cloud APIs.

## Objective
Deploy MinIO with automatic bucket initialization (`mlite-datasets`, `mlflow-artifacts`, `mlite-evaluations`), and create a lightweight, async-ready Python `StorageClient` in `packages/core/storage/`.

## Proposed solution
Configure MinIO service in `docker-compose.yml` along with a lightweight `minio/mc` initialization container that creates the default buckets on startup. Implement `StorageClient` using `boto3` / `aioboto3` providing methods: `upload_file`, `download_file`, `generate_presigned_url`, `delete_file`, and `file_exists`.

## Technical requirements
- MinIO Server container running with ports 9000 (API) and 9001 (Web Console).
- Init bucket container (`minio/mc`) executing `mc mb --ignore-existing mlite/mlite-datasets`, `mlite/mlflow-artifacts`, `mlite/mlite-evaluations`.
- `packages/core/storage/client.py` wrapping S3 operations with retry logic, exponential backoff, and MD5/SHA256 checksum verification.
- Configurable S3 endpoint, credentials, and bucket names via environment variables.

## Acceptance criteria
- MinIO boots cleanly and all 3 required buckets are created automatically on launch.
- MinIO Web Console is accessible at `http://localhost:9001` with configured credentials.
- `StorageClient.upload_file()` successfully uploads a dataset file and computes matching SHA-256 hash.
- `StorageClient.generate_presigned_url()` returns a valid download URL with configurable expiration.

## Tests
- Add integration test `tests/integration/test_storage_client.py` testing file upload, retrieval, checksum verification, and deletion.
- Verify MinIO healthcheck via `curl -f http://localhost:9000/minio/health/live`.

## Documentation
- Create `docs/architecture/storage.md` with MinIO credentials configuration, bucket purposes, and SDK usage guide.
- Document how to access MinIO Console for manual inspection.

## Dependencies
Issue #2.
