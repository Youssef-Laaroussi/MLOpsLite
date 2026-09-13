# #11 — Implement Docker model packaging and deployment engine

> **Milestone:** M2 — Deployment  
> **Priority:** `P1`  
> **Labels:** `deployment` `P1`  

---

## Problem
Deploying trained models into isolated runtime environments typically requires writing custom Dockerfiles, configuring web servers, and managing port allocations manually. Small teams need single-command model deployment (`mlite deploy <model> --version <v>`) without complex Kubernetes manifests.

## Objective
Build `packages/deployment` to package registered models into lightweight Docker containers dynamically, orchestrate them via local Docker daemon/Compose, and register the running deployment in MLite's database.

## Proposed solution
Implement a Docker model packaging template based on Python 3.12 slim, Uvicorn, and FastAPI. The deployment engine downloads the model artifact from MinIO, injects an inference server wrapper, builds or uses a pre-built standardized serving image, runs the container on an allocated local port, and updates the deployment record in PostgreSQL.

## Technical requirements
- Standardized inference container base image `mlite/serving:latest` containing runtime ML dependencies.
- Dynamic port allocation engine tracking used host ports (starting at range 8100-8200).
- Docker SDK for Python (`docker` library) to manage container lifecycles (`create`, `start`, `stop`, `remove`).
- Database entity `Deployment` in `packages/core/models/deployment.py`: `id`, `project_id`, `model_name`, `model_version`, `container_id`, `port`, `endpoint_url`, `status` (PENDING, RUNNING, STOPPED, FAILED), `created_at`.
- CLI command: `mlite deploy <model-name> --version <v> [--port <p>]`.

## Acceptance criteria
- Executing `mlite deploy fraud-detector --version 1` spins up a dedicated container serving inference.
- Deployed container status is visible via `docker ps` and via `mlite deployment list`.
- Stopping a deployment via `mlite deployment stop <id>` terminates and cleans up the Docker container.
- If deployment fails during startup, the container is safely halted and error logs are stored in the database.

## Tests
- Integration test `tests/integration/test_model_deployment.py` packaging a test Scikit-learn model, launching container, and verifying container state.
- Unit test for dynamic port allocation and collision avoidance.

## Documentation
- Write `docs/deployment/docker_serving.md` explaining container architecture, resource constraints, and networking.
- Provide CLI commands reference for `mlite deploy` and `mlite deployment list`.

## Dependencies
Issue #10 (Model Registry), Issue #5 (MinIO Storage).
