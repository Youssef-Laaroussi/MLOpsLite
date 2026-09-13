"""
Script to generate all 40 world-class GitHub Issues for MLite.
Each issue strictly adheres to the 8 required sections:
- Problem
- Objective
- Proposed solution
- Technical requirements
- Acceptance criteria
- Tests
- Documentation
- Dependencies
"""

import os
import json
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent
ISSUES_DIR = BASE_DIR / ".github" / "issues"

ISSUES_DATA = [
    # ==========================================
    # Milestone 0: Project Setup (Issues #1 -> #6)
    # ==========================================
    {
        "number": 1,
        "title": "Initialize repository structure and monorepo workspace",
        "milestone": "M0 — Project Setup",
        "milestone_code": "M0_project_setup",
        "priority": "P0",
        "labels": ["setup", "P0"],
        "filename": "01_initialize_repository_structure.md",
        "problem": (
            "The MLite project currently lacks a formalized, modular repository structure. "
            "Without a clean monorepo architecture separating the backend API, worker, CLI, web UI, "
            "and shared core libraries, code sharing will lead to circular dependencies, packaging conflicts, "
            "and poor developer experience for external open-source contributors."
        ),
        "objective": (
            "Establish a production-grade Python 3.12+ workspace layout following the Cahier des Charges (Section 21). "
            "Configure modern packaging using `pyproject.toml`, establish developer toolchains (Ruff, MyPy, Pre-commit), "
            "and provide a standard `Makefile` for developer lifecycle commands."
        ),
        "proposed_solution": (
            "Create a clean monorepo layout divided into `apps/` (api, worker, cli, web) and `packages/` "
            "(core, data, tracking, registry, deployment, monitoring, alerting, rollback). "
            "Define an editable packaging layout with `pyproject.toml` so that subpackages can be imported seamlessly. "
            "Provide developer tasks in a `Makefile` (`make install`, `make lint`, `make test`, `make format`)."
        ),
        "technical_requirements": [
            "Root `pyproject.toml` targeting Python >= 3.12 with hatchling or setuptools backend.",
            "Directory layout: `apps/api/`, `apps/worker/`, `apps/cli/`, `apps/web/`, `packages/core/`, `packages/tracking/`, `packages/registry/`, `packages/deployment/`, `packages/monitoring/`, `packages/alerting/`, `packages/rollback/`.",
            "Ruff configuration in `pyproject.toml` with line length 100, select rules `E, W, F, I, B, C4, UP`.",
            "MyPy configuration in `pyproject.toml` with `strict = true` and typed package marker `py.typed`.",
            "`Makefile` with targets: `help`, `install`, `lint`, `format`, `test`, `clean`.",
            "`.editorconfig` for uniform indentation (2 spaces web/yaml, 4 spaces python)."
        ],
        "acceptance_criteria": [
            "`pip install -e .` succeeds in a clean Python 3.12 virtual environment (`yzmenv`).",
            "`make lint` and `make format` run cleanly across all apps and packages.",
            "All packages in `packages/` are importable from Python without `PYTHONPATH` hacks.",
            "The directory structure strictly aligns with Section 21 of the technical specifications."
        ],
        "tests": [
            "Add `tests/unit/test_project_structure.py` verifying required directory existence and package importability.",
            "Run `ruff check .` and `mypy packages apps` via `make lint`."
        ],
        "documentation": [
            "Update `README.md` with the verified monorepo directory tree.",
            "Add developer environment setup instructions in `CONTRIBUTING.md` explaining editable installs and `make` commands."
        ],
        "dependencies": "None (Root setup issue)."
    },
    {
        "number": 2,
        "title": "Add Docker Compose infrastructure and environment configurations",
        "milestone": "M0 — Project Setup",
        "milestone_code": "M0_project_setup",
        "priority": "P0",
        "labels": ["setup", "P0"],
        "filename": "02_add_docker_compose_infrastructure.md",
        "problem": (
            "MLite promises zero-cloud, single-command startup (`docker compose up -d`). "
            "Currently, there is no orchestration file defining the core service topology (PostgreSQL, MinIO, "
            "MLflow, FastAPI API, React UI), resulting in manual setup friction that prevents rapid local evaluation."
        ),
        "objective": (
            "Create a robust, production-ready `docker-compose.yml` with health checks, named persistent volumes, "
            "an isolated internal bridge network, and comprehensive `.env.example` templates."
        ),
        "proposed_solution": (
            "Define multi-container topology using Compose v2 specification: "
            "`mlite-db` (PostgreSQL 16), `mlite-storage` (MinIO with init-bucket helper), `mlflow` (Tracking server), "
            "`mlite-api` (FastAPI backend), and `mlite-ui` (React Vite frontend). "
            "Implement dependency order via `depends_on` with `condition: service_healthy` to ensure database and storage "
            "are completely ready before API and MLflow boot."
        ),
        "technical_requirements": [
            "Compose file version: Docker Compose v2 syntax (`docker-compose.yml`).",
            "Named volumes: `mlite_postgres_data`, `mlite_minio_data`, `mlite_mlflow_data`.",
            "Bridge network: `mlite-network` with DNS resolution for service names.",
            "Healthchecks configured for PostgreSQL (`pg_isready`), MinIO (`/minio/health/live`), MLflow (`/health`), and FastAPI (`/health`).",
            "`.env.example` file exposing non-sensitive default values for ports, credentials, and endpoints.",
            "Dockerfiles for `apps/api` and `apps/web` with multi-stage builds for minimal image sizes."
        ],
        "acceptance_criteria": [
            "Running `docker compose up -d` boots all infrastructure services cleanly without race conditions.",
            "`docker compose ps` displays all services in `healthy` status within 60 seconds.",
            "Restarting the compose stack retains all database tables and MinIO buckets intact.",
            "Zero cloud credentials required to boot the entire stack."
        ],
        "tests": [
            "Execute shell verification script `bash scripts/test_compose_up.sh`.",
            "Run HTTP curl probes against all exposed ports (PostgreSQL: 5432, MinIO: 9000/9001, MLflow: 5000, API: 8000, UI: 3000)."
        ],
        "documentation": [
            "Create `docs/getting-started/docker.md` describing network layout, port mappings, and volume backup instructions.",
            "Document environment variable overrides in `docs/getting-started/configuration.md`."
        ],
        "dependencies": "Issue #1 (Repository structure)."
    },
    {
        "number": 3,
        "title": "Configure PostgreSQL database and async SQLAlchemy/Alembic layer",
        "milestone": "M0 — Project Setup",
        "milestone_code": "M0_project_setup",
        "priority": "P0",
        "labels": ["backend", "P0"],
        "filename": "03_configure_postgresql.md",
        "problem": (
            "MLite requires persistent transactional storage for project metadata, dataset definitions, "
            "deployment states, monitoring records, and audit logs. Without an asynchronous ORM and database migration system, "
            "schema evolution cannot be safely managed."
        ),
        "objective": (
            "Configure PostgreSQL 16 as the primary relational store, establish an asynchronous database session factory "
            "using SQLAlchemy 2.0 with asyncpg, and configure Alembic for automated migrations."
        ),
        "proposed_solution": (
            "Initialize an automated database setup supporting two databases (`mlite_db` and `mlflow_db`). "
            "Implement `packages/core/db/` with `Base`, `get_async_session` dependency, connection pooling, "
            "and an Alembic migration environment in `apps/api/migrations` supporting async migrations."
        ),
        "technical_requirements": [
            "PostgreSQL 16 Alpine container with an initialization script creating both `mlite_db` and `mlflow_db` databases.",
            "SQLAlchemy >= 2.0 with `asyncpg` driver for non-blocking I/O.",
            "Connection pool settings: `pool_size=20`, `max_overflow=10`, `pool_pre_ping=True`, `pool_recycle=3600`.",
            "Alembic configured with async template (`alembic/env.py` using `run_migrations_online` via `asyncio`).",
            "Base entity mixin with `id` (UUIDv7 or auto-increment), `created_at` (UTC timestamp), and `updated_at`."
        ],
        "acceptance_criteria": [
            "PostgreSQL container starts and automatically initializes both databases with proper user permissions.",
            "`alembic upgrade head` executes without errors on a fresh database instance.",
            "SQLAlchemy async session dependency cleanly injects into FastAPI route handlers and commits/rollbacks automatically.",
            "Connection loss is automatically recovered via `pool_pre_ping`."
        ],
        "tests": [
            "Add integration test `tests/integration/test_database.py` connecting via asyncpg and verifying CRUD operations.",
            "Test Alembic migration rollback (`alembic downgrade -1`) and re-upgrade (`alembic upgrade head`)."
        ],
        "documentation": [
            "Write `docs/architecture/database.md` outlining the connection URL format, pooling guidelines, and Alembic CLI usage.",
            "Add instructions for adding new models and generating migrations."
        ],
        "dependencies": "Issue #1, Issue #2."
    },
    {
        "number": 4,
        "title": "Configure MLflow tracking server and artifact integration",
        "milestone": "M0 — Project Setup",
        "milestone_code": "M0_project_setup",
        "priority": "P0",
        "labels": ["mlflow", "P0"],
        "filename": "04_configure_mlflow.md",
        "problem": (
            "MLite leverages MLflow as its tracking and registry engine, but MLflow's default setup uses a local file store "
            "and local directory artifacts, which do not scale and fail in containerized environments. MLflow must be backed "
            "by PostgreSQL for metadata and MinIO for artifact storage."
        ),
        "objective": (
            "Configure a standalone MLflow 2.15+ container connected to PostgreSQL (`mlflow_db`) and MinIO (`s3://mlflow-artifacts`), "
            "providing an operational tracking server for all MLite training experiments and model registrations."
        ),
        "proposed_solution": (
            "Add an `mlflow` service in `docker-compose.yml` running `mlflow server` with `--backend-store-uri` pointing to PostgreSQL "
            "and `--default-artifact-root` pointing to the MinIO S3 bucket. Inject S3 compatibility credentials (`AWS_ACCESS_KEY_ID`, "
            "`AWS_SECRET_ACCESS_KEY`, `MLFLOW_S3_ENDPOINT_URL`)."
        ),
        "technical_requirements": [
            "MLflow Docker container (Python 3.12 with `mlflow>=2.15.0`, `psycopg2-binary`, `boto3`).",
            "Backend store URI: `postgresql://mlite_user:${DB_PASSWORD}@mlite-db:5432/mlflow_db`.",
            "Default artifact root: `s3://mlflow-artifacts/`.",
            "Environment variables: `MLFLOW_S3_ENDPOINT_URL=http://mlite-storage:9000`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION=us-east-1`.",
            "Healthcheck verifying HTTP 200 on `http://localhost:5000/health`."
        ],
        "acceptance_criteria": [
            "MLflow tracking UI is reachable at `http://localhost:5000`.",
            "Python script using `mlflow.set_tracking_uri('http://localhost:5000')` can log parameters, metrics, and models.",
            "Logged model artifacts are stored inside MinIO bucket `mlflow-artifacts` and visible via MinIO Console.",
            "Experiment and run records are stored in PostgreSQL table `experiments` and `runs`."
        ],
        "tests": [
            "Create integration test `tests/integration/test_mlflow_connection.py` that starts a dummy run, logs metrics, artifacts, and verifies presence in MinIO.",
            "Validate MLflow health endpoint with `curl -f http://localhost:5000/health`."
        ],
        "documentation": [
            "Add `docs/architecture/mlflow.md` describing the tracking URI setup, MinIO artifact bucket structure, and UI access.",
            "Include code snippets showing how MLite client hooks into MLflow."
        ],
        "dependencies": "Issue #2, Issue #3, Issue #5."
    },
    {
        "number": 5,
        "title": "Configure MinIO S3-compatible object storage and SDK client wrapper",
        "milestone": "M0 — Project Setup",
        "milestone_code": "M0_project_setup",
        "priority": "P0",
        "labels": ["storage", "P0"],
        "filename": "05_configure_minio.md",
        "problem": (
            "MLite requires self-hosted, S3-compatible storage for raw datasets, model weights, evaluation reports, and backups. "
            "Without an abstracted storage layer, code will become tightly coupled to local disk paths or proprietary cloud APIs."
        ),
        "objective": (
            "Deploy MinIO with automatic bucket initialization (`mlite-datasets`, `mlflow-artifacts`, `mlite-evaluations`), "
            "and create a lightweight, async-ready Python `StorageClient` in `packages/core/storage/`."
        ),
        "proposed_solution": (
            "Configure MinIO service in `docker-compose.yml` along with a lightweight `minio/mc` initialization container "
            "that creates the default buckets on startup. Implement `StorageClient` using `boto3` / `aioboto3` providing methods: "
            "`upload_file`, `download_file`, `generate_presigned_url`, `delete_file`, and `file_exists`."
        ),
        "technical_requirements": [
            "MinIO Server container running with ports 9000 (API) and 9001 (Web Console).",
            "Init bucket container (`minio/mc`) executing `mc mb --ignore-existing mlite/mlite-datasets`, `mlite/mlflow-artifacts`, `mlite/mlite-evaluations`.",
            "`packages/core/storage/client.py` wrapping S3 operations with retry logic, exponential backoff, and MD5/SHA256 checksum verification.",
            "Configurable S3 endpoint, credentials, and bucket names via environment variables."
        ],
        "acceptance_criteria": [
            "MinIO boots cleanly and all 3 required buckets are created automatically on launch.",
            "MinIO Web Console is accessible at `http://localhost:9001` with configured credentials.",
            "`StorageClient.upload_file()` successfully uploads a dataset file and computes matching SHA-256 hash.",
            "`StorageClient.generate_presigned_url()` returns a valid download URL with configurable expiration."
        ],
        "tests": [
            "Add integration test `tests/integration/test_storage_client.py` testing file upload, retrieval, checksum verification, and deletion.",
            "Verify MinIO healthcheck via `curl -f http://localhost:9000/minio/health/live`."
        ],
        "documentation": [
            "Create `docs/architecture/storage.md` with MinIO credentials configuration, bucket purposes, and SDK usage guide.",
            "Document how to access MinIO Console for manual inspection."
        ],
        "dependencies": "Issue #2."
    },
    {
        "number": 6,
        "title": "Create FastAPI core application with modular routing and OpenAPI schema",
        "milestone": "M0 — Project Setup",
        "milestone_code": "M0_project_setup",
        "priority": "P0",
        "labels": ["backend", "P0"],
        "filename": "06_create_fastapi_application.md",
        "problem": (
            "The platform needs a centralized REST API serving the CLI, React frontend, and external systems. "
            "Without an initialized FastAPI skeleton with standard error handling, CORS, lifespan management, and versioned routing, "
            "subsequent feature modules cannot be developed concurrently."
        ),
        "objective": (
            "Scaffold `apps/api` with FastAPI, Pydantic v2 validation, centralized exception handlers, structured JSON logging, "
            "CORS policies, lifespan handlers for DB/MinIO connections, and `/health` and `/ready` probes."
        ),
        "proposed_solution": (
            "Create `apps/api/main.py` using FastAPI's application factory pattern. "
            "Establish `/api/v1` router namespace with modular sub-routers (`projects`, `datasets`, `experiments`, `models`, `deployments`, `monitoring`, `alerts`). "
            "Add global error handlers converting SQLAlchemy and validation errors into uniform JSON error payloads."
        ),
        "technical_requirements": [
            "FastAPI >= 0.111.0 with Pydantic v2.",
            "Lifespan async context manager for starting and closing DB connection pools and background workers.",
            "CORS middleware configured to accept requests from frontend dev server (`http://localhost:3000`).",
            "Uniform response envelope and standard error schema: `{\"error\": {\"code\": str, \"message\": str, \"details\": list}}`.",
            "OpenAPI documentation enabled at `/docs` (Swagger) and `/redoc`.",
            "Endpoints: `GET /health` (liveness), `GET /ready` (readiness checking DB and MinIO connectivity)."
        ],
        "acceptance_criteria": [
            "`GET /health` returns HTTP 200 with `{status: 'ok', version: '0.1.0'}`.",
            "`GET /ready` returns HTTP 200 only when PostgreSQL and MinIO are reachable; returns 503 if any service is down.",
            "`/docs` renders the interactive Swagger UI correctly.",
            "Unhandled exceptions return HTTP 500 with a sanitized JSON payload and request ID."
        ],
        "tests": [
            "Unit tests in `tests/unit/api/test_health.py` validating `/health` and `/ready` endpoints.",
            "Test CORS preflight requests and custom error handling responses."
        ],
        "documentation": [
            "Create `docs/api/overview.md` describing the API versioning strategy, response formats, and error codes.",
            "Document how to run the API locally with hot-reload (`uvicorn apps.api.main:app --reload`)."
        ],
        "dependencies": "Issue #1, Issue #3, Issue #5."
    }
]

def main():
    print(f"Generating issue files...")
    # Will be populated with all 40 issues
    pass

if __name__ == "__main__":
    main()
