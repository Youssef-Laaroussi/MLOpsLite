# #29 — Add integration test suite for PostgreSQL, MLflow, and MinIO

> **Milestone:** M7 — Quality & CI/CD  
> **Priority:** `P1`  
> **Labels:** `testing` `P1`  

---

## Problem
Unit tests mock external dependencies, which means connection pool exhaustion, SQL schema discrepancies, MLflow tracking API mismatches, or S3 permission issues will only surface in production.

## Objective
Build an automated integration test suite in `tests/integration/` that executes real end-to-end interactions against real PostgreSQL, MLflow, and MinIO instances spun up via Testcontainers or Docker Compose.

## Proposed solution
Implement integration fixtures that connect to live local test services. Validate: 1) SQLAlchemy async queries & migrations on PostgreSQL; 2) Tracking run logging and artifact uploads to MLflow & MinIO; 3) Presigned URL generation and binary retrieval from MinIO; 4) Model registry stage transitions.

## Technical requirements
- Test environment configuration pointing to test databases (`mlite_test_db`) and test buckets.
- Automated setup/teardown hooks creating and cleaning test database tables per test session.
- Integration test modules: `test_db_integration.py`, `test_mlflow_integration.py`, `test_minio_integration.py`, `test_api_integration.py`.
- Docker-based runner: can execute inside CI using test service containers.

## Acceptance criteria
- `pytest tests/integration` passes 100% against running Docker Compose services.
- Verifies real binary file upload, retrieval, and SHA-256 verification against MinIO.
- Verifies real MLflow experiment tracking and SQL query performance.
- Clean teardown: leaves no lingering test records or orphan buckets.

## Tests
- Execute `pytest tests/integration` against active `docker compose` instance.
- Validate database rollback between test cases using transaction isolation.

## Documentation
- Document integration test runner instructions in `docs/contributing/integration_tests.md`.
- Include Docker compose test profile instructions.

## Dependencies
Issue #2 (Docker Compose), Issue #3 (PostgreSQL), Issue #4 (MLflow), Issue #5 (MinIO).
