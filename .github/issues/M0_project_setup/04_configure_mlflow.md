# #4 — Configure MLflow tracking server and artifact integration

> **Milestone:** M0 — Project Setup  
> **Priority:** `P0`  
> **Labels:** `mlflow` `P0`  

---

## Problem
MLite leverages MLflow as its tracking and registry engine, but MLflow's default setup uses a local file store and local directory artifacts, which do not scale and fail in containerized environments. MLflow must be backed by PostgreSQL for metadata and MinIO for artifact storage.

## Objective
Configure a standalone MLflow 2.15+ container connected to PostgreSQL (`mlflow_db`) and MinIO (`s3://mlflow-artifacts`), providing an operational tracking server for all MLite training experiments and model registrations.

## Proposed solution
Add an `mlflow` service in `docker-compose.yml` running `mlflow server` with `--backend-store-uri` pointing to PostgreSQL and `--default-artifact-root` pointing to the MinIO S3 bucket. Inject S3 compatibility credentials (`AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `MLFLOW_S3_ENDPOINT_URL`).

## Technical requirements
- MLflow Docker container (Python 3.12 with `mlflow>=2.15.0`, `psycopg2-binary`, `boto3`).
- Backend store URI: `postgresql://mlite_user:${DB_PASSWORD}@mlite-db:5432/mlflow_db`.
- Default artifact root: `s3://mlflow-artifacts/`.
- Environment variables: `MLFLOW_S3_ENDPOINT_URL=http://mlite-storage:9000`, `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_DEFAULT_REGION=us-east-1`.
- Healthcheck verifying HTTP 200 on `http://localhost:5000/health`.

## Acceptance criteria
- MLflow tracking UI is reachable at `http://localhost:5000`.
- Python script using `mlflow.set_tracking_uri('http://localhost:5000')` can log parameters, metrics, and models.
- Logged model artifacts are stored inside MinIO bucket `mlflow-artifacts` and visible via MinIO Console.
- Experiment and run records are stored in PostgreSQL table `experiments` and `runs`.

## Tests
- Create integration test `tests/integration/test_mlflow_connection.py` that starts a dummy run, logs metrics, artifacts, and verifies presence in MinIO.
- Validate MLflow health endpoint with `curl -f http://localhost:5000/health`.

## Documentation
- Add `docs/architecture/mlflow.md` describing the tracking URI setup, MinIO artifact bucket structure, and UI access.
- Include code snippets showing how MLite client hooks into MLflow.

## Dependencies
Issue #2, Issue #3, Issue #5.
