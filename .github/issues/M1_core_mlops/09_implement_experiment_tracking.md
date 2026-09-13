# #9 — Implement experiment tracking engine and training run runner

> **Milestone:** M1 — Core MLOps  
> **Priority:** `P0`  
> **Labels:** `mlflow` `P0`  

---

## Problem
Training runs are frequently unrepeatable because hyperparameters, code versions (git commit), dataset hashes, and metrics are not captured automatically. While MLflow exists, users still need manual integration code in every script to attach project context.

## Objective
Build `packages/tracking` and CLI command `mlite experiment run` to automatically instrument ML training runs, capturing git SHAs, dataset versions, parameters, metrics, artifacts, and training duration into MLflow and MLite API.

## Proposed solution
Implement a high-level Python tracking wrapper `mlite.track` (context manager & decorator) and a CLI executor `mlite experiment run <script.py>`. The executor sets the `MLFLOW_TRACKING_URI`, registers the run under the active MLite project, inspects git state, and logs environment metadata.

## Technical requirements
- `packages/tracking/tracker.py`: Context manager `with mlite.start_run() as run:` wrapping `mlflow.start_run`.
- Automatic metadata collection: Git commit hash, git dirty status, Python version, OS platform, execution start/end time.
- Methods: `log_param(key, value)`, `log_metric(key, value, step=None)`, `log_metrics(dict)`, `log_artifact(local_path)`.
- CLI commands: `mlite experiment run <script>` and `mlite experiment list --project <name>`.
- API endpoints in `apps/api/routers/experiments.py` proxying and indexing MLflow experiment metadata.

## Acceptance criteria
- Running `mlite experiment run src/train.py` executes user training and attaches run to the project in MLflow.
- Logged parameters and metrics appear both in MLflow tracking server and MLite API.
- Artifacts (weights, plots, checkpoints) are uploaded to MinIO under `s3://mlflow-artifacts/<run_id>/`.
- `mlite experiment list` prints a formatted table of recent runs, metrics, and git commits.

## Tests
- Integration test `tests/integration/test_experiment_tracking.py` executing a dummy Scikit-Learn script and asserting logged metrics.
- Unit tests for metadata extraction (Git SHA, dirty tree detection).

## Documentation
- Write `docs/experiments/tracking.md` demonstrating Python SDK and CLI tracking workflows.
- Provide sample Scikit-learn training script with MLite tracking.

## Dependencies
Issue #4 (MLflow), Issue #7 (Project API), Issue #8 (CLI).
