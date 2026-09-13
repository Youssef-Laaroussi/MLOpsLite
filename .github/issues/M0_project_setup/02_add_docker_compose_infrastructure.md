# #2 — Add Docker Compose infrastructure and environment configurations

> **Milestone:** M0 — Project Setup  
> **Priority:** `P0`  
> **Labels:** `setup` `P0`  

---

## Problem
MLite promises zero-cloud, single-command startup (`docker compose up -d`). Currently, there is no orchestration file defining the core service topology (PostgreSQL, MinIO, MLflow, FastAPI API, React UI), resulting in manual setup friction that prevents rapid local evaluation.

## Objective
Create a robust, production-ready `docker-compose.yml` with health checks, named persistent volumes, an isolated internal bridge network, and comprehensive `.env.example` templates.

## Proposed solution
Define multi-container topology using Compose v2 specification: `mlite-db` (PostgreSQL 16), `mlite-storage` (MinIO with init-bucket helper), `mlflow` (Tracking server), `mlite-api` (FastAPI backend), and `mlite-ui` (React Vite frontend). Implement dependency order via `depends_on` with `condition: service_healthy` to ensure database and storage are completely ready before API and MLflow boot.

## Technical requirements
- Compose file version: Docker Compose v2 syntax (`docker-compose.yml`).
- Named volumes: `mlite_postgres_data`, `mlite_minio_data`, `mlite_mlflow_data`.
- Bridge network: `mlite-network` with DNS resolution for service names.
- Healthchecks configured for PostgreSQL (`pg_isready`), MinIO (`/minio/health/live`), MLflow (`/health`), and FastAPI (`/health`).
- `.env.example` file exposing non-sensitive default values for ports, credentials, and endpoints.
- Dockerfiles for `apps/api` and `apps/web` with multi-stage builds for minimal image sizes.

## Acceptance criteria
- Running `docker compose up -d` boots all infrastructure services cleanly without race conditions.
- `docker compose ps` displays all services in `healthy` status within 60 seconds.
- Restarting the compose stack retains all database tables and MinIO buckets intact.
- Zero cloud credentials required to boot the entire stack.

## Tests
- Execute shell verification script `bash scripts/test_compose_up.sh`.
- Run HTTP curl probes against all exposed ports (PostgreSQL: 5432, MinIO: 9000/9001, MLflow: 5000, API: 8000, UI: 3000).

## Documentation
- Create `docs/getting-started/docker.md` describing network layout, port mappings, and volume backup instructions.
- Document environment variable overrides in `docs/getting-started/configuration.md`.

## Dependencies
Issue #1 (Repository structure).
