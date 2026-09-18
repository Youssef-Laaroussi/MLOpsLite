# 🔄 Integration Testing Guide

> **Component:** `tests/integration/`, `docker-compose.yml`  
> **Milestone:** M7 — Quality & CI/CD (Issue #29)  
> **Focus:** Real PostgreSQL, MinIO, and MLflow service verification

---

## Overview

While unit tests exercise business logic with fast in-memory mocks, the **Integration Test Suite** (`tests/integration/`) verifies real inter-service communications, database schemas, object storage transfers, and tracking server operations.

```
┌─────────────────────────────────────────────────────────────┐
│                 MLite Integration Test Suite                │
└──────────────┬──────────────┬──────────────┬────────────────┘
               │              │              │
               ▼              ▼              ▼
       ┌──────────────┐┌──────────────┐┌──────────────┐
       │  PostgreSQL  ││    MinIO     ││    MLflow    │
       │   (Port 5432)││  (Port 9000) ││  (Port 5000) │
       └──────────────┘└──────────────┘└──────────────┘
```

---

## Test Suite Structure

| Test File | Target Service | Capabilities Verified |
| :--- | :--- | :--- |
| `test_db_integration.py` | PostgreSQL 16 | Async session pool, migrations, table relationships, transaction rollback |
| `test_minio_integration.py`| MinIO S3 | Binary data upload, SHA-256 validation, download, presigned URLs, object deletion |
| `test_mlflow_integration.py`| MLflow Server | Experiment registration, parameter/metric logging, run artifacts |
| `test_api_integration.py` | FastAPI + DB | Authenticated endpoint CRUD, RBAC permission denial (403), audit log persistence |
| `test_rollback.py` | Rollback Engine | Controlled container port swap, health verification abort, audit logging |
| `test_security.py` | Security Engine | 401 unauthenticated rejection, API key hashing/revocation, audit log immutability |

---

## Running Integration Tests

### 1. Launch Test Infrastructure with Docker Compose
Start the prerequisite services in the background:
```bash
docker compose up -d mlite-db mlite-storage minio-create-buckets mlflow
```

Verify services are healthy:
```bash
docker compose ps
```

### 2. Execute the Integration Test Suite
Run Pytest targeting the integration folder:
```bash
pytest tests/integration/ -v
```

### 3. Run Specific Service Tests
```bash
# Run PostgreSQL integration tests
pytest tests/integration/test_db_integration.py

# Run MinIO S3 integration tests
pytest tests/integration/test_minio_integration.py

# Run API & security integration tests
pytest tests/integration/test_api_integration.py
```

### 4. Teardown
When finished, stop the test services:
```bash
docker compose down -v
```

---

## CI/CD Pipeline Integration

In GitHub Actions (`.github/workflows/tests.yml`), integration tests run automatically against native runner service containers for PostgreSQL and MinIO without requiring full Docker daemon virtualization.
