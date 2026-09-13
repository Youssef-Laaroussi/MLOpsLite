# #10 — Implement centralized model registry with staging and promotion

> **Milestone:** M1 — Core MLOps  
> **Priority:** `P0`  
> **Labels:** `registry` `P0`  

---

## Problem
Data teams lack a formal governance process to designate which trained model artifact is candidate, staging, or production. Without an automated model registry, teams deploy models based on fragile file paths or ad-hoc naming conventions.

## Objective
Build the MLite Model Registry in `packages/registry` and `apps/api/routers/models.py`, managing model versions, stage transitions (`Development` → `Candidate` → `Staging` → `Production` → `Archived`), and metric comparisons.

## Proposed solution
Integrate MLflow Model Registry with MLite database metadata. Store model lineage, evaluation scores, and active stage in PostgreSQL. Provide CLI commands `mlite model register`, `mlite model list`, `mlite model compare`, and `mlite model promote`.

## Technical requirements
- PostgreSQL entity `RegisteredModel` and `ModelVersion` linking MLflow model names to MLite projects.
- Stage enum: `DEVELOPMENT`, `CANDIDATE`, `STAGING`, `PRODUCTION`, `ARCHIVED`.
- Automatic demotion rule: Promoting a model version to `PRODUCTION` automatically demotes the previous production version to `ARCHIVED` (or `STAGING`).
- Endpoints: `POST /api/v1/models/register`, `GET /api/v1/models`, `GET /api/v1/models/{name}/versions`, `POST /api/v1/models/{name}/versions/{v}/promote`, `GET /api/v1/models/compare`.
- CLI commands: `mlite model list`, `mlite model promote <name> --version <v> --stage <stage>`.

## Acceptance criteria
- Models can be registered directly from an MLflow `run_id`.
- Stage promotion cleanly transitions version status and logs promotion audit record.
- `mlite model compare v1 v2` outputs a side-by-side terminal comparison of accuracy, precision, recall, and F1.
- Only one model version per project can hold the active `PRODUCTION` stage simultaneously.

## Tests
- Unit tests in `tests/unit/test_model_registry.py` testing stage transitions and exclusivity constraints.
- Integration tests verifying synchronization between MLite DB and MLflow Model Registry.

## Documentation
- Write `docs/models/registry.md` detailing lifecycle stages, promotion criteria, and rollback preparation.
- Add CLI examples for registering and promoting candidate models.

## Dependencies
Issue #4 (MLflow), Issue #7 (Project API), Issue #9 (Experiment Tracking).
