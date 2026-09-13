# #7 — Implement project management API and workspace lifecycle

> **Milestone:** M1 — Core MLOps  
> **Priority:** `P0`  
> **Labels:** `feature` `P0`  

---

## Problem
MLite operates on discrete Machine Learning projects. Currently, there is no domain model, database table, or REST endpoint to create, list, retrieve, update, or archive projects, preventing downstream entities (datasets, experiments, models, deployments) from having a valid parent context.

## Objective
Implement complete project management capabilities in `apps/api/routers/projects.py` backed by SQLAlchemy models, Pydantic v2 schemas, filesystem workspace scaffolding, and YAML configuration validation.

## Proposed solution
Create `Project` SQL entity with unique slug, name, description, git_url, and status. Expose CRUD endpoints under `/api/v1/projects` with pagination, filtering, and sorting. Include service logic that validates `mlite.yaml` specifications and manages project root metadata.

## Technical requirements
- SQLAlchemy model `Project` in `packages/core/models/project.py` with columns: `id`, `name`, `slug` (unique indexed), `description`, `git_url`, `default_branch`, `config_yaml`, `status` (active/archived), `created_at`, `updated_at`.
- Pydantic schemas: `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, `ProjectListResponse`.
- Endpoints: `POST /api/v1/projects`, `GET /api/v1/projects`, `GET /api/v1/projects/{slug_or_id}`, `PATCH /api/v1/projects/{slug_or_id}`, `DELETE /api/v1/projects/{slug_or_id}`.
- Validation: regex enforcement on project slug (`^[a-z0-9-_]{3,50}$`), duplicate slug conflict detection (HTTP 409).

## Acceptance criteria
- Creating a project via `POST /api/v1/projects` returns 201 Created with auto-generated UUID and validated slug.
- Retrieving `/api/v1/projects` returns paginated list with total count and metadata.
- Attempting to create a project with an existing slug returns HTTP 409 Conflict with descriptive message.
- Deleting a project marks it as archived without hard-deleting associated historical metrics.

## Tests
- Unit tests in `tests/unit/api/test_projects.py` testing creation, validation rules, updates, and idempotency.
- Integration test verifying PostgreSQL cascade constraints and pagination queries.

## Documentation
- Document Project REST API specifications in `docs/api/projects.md` with request/response JSON samples.
- Provide Python client snippets for creating and fetching projects.

## Dependencies
Issue #3 (PostgreSQL), Issue #6 (FastAPI application).
