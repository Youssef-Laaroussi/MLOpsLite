# #6 — Create FastAPI core application with modular routing and OpenAPI schema

> **Milestone:** M0 — Project Setup  
> **Priority:** `P0`  
> **Labels:** `backend` `P0`  

---

## Problem
The platform needs a centralized REST API serving the CLI, React frontend, and external systems. Without an initialized FastAPI skeleton with standard error handling, CORS, lifespan management, and versioned routing, subsequent feature modules cannot be developed concurrently.

## Objective
Scaffold `apps/api` with FastAPI, Pydantic v2 validation, centralized exception handlers, structured JSON logging, CORS policies, lifespan handlers for DB/MinIO connections, and `/health` and `/ready` probes.

## Proposed solution
Create `apps/api/main.py` using FastAPI's application factory pattern. Establish `/api/v1` router namespace with modular sub-routers (`projects`, `datasets`, `experiments`, `models`, `deployments`, `monitoring`, `alerts`). Add global error handlers converting SQLAlchemy and validation errors into uniform JSON error payloads.

## Technical requirements
- FastAPI >= 0.111.0 with Pydantic v2.
- Lifespan async context manager for starting and closing DB connection pools and background workers.
- CORS middleware configured to accept requests from frontend dev server (`http://localhost:3000`).
- Uniform response envelope and standard error schema: `{"error": {"code": str, "message": str, "details": list}}`.
- OpenAPI documentation enabled at `/docs` (Swagger) and `/redoc`.
- Endpoints: `GET /health` (liveness), `GET /ready` (readiness checking DB and MinIO connectivity).

## Acceptance criteria
- `GET /health` returns HTTP 200 with `{status: 'ok', version: '0.1.0'}`.
- `GET /ready` returns HTTP 200 only when PostgreSQL and MinIO are reachable; returns 503 if any service is down.
- `/docs` renders the interactive Swagger UI correctly.
- Unhandled exceptions return HTTP 500 with a sanitized JSON payload and request ID.

## Tests
- Unit tests in `tests/unit/api/test_health.py` validating `/health` and `/ready` endpoints.
- Test CORS preflight requests and custom error handling responses.

## Documentation
- Create `docs/api/overview.md` describing the API versioning strategy, response formats, and error codes.
- Document how to run the API locally with hot-reload (`uvicorn apps.api.main:app --reload`).

## Dependencies
Issue #1, Issue #3, Issue #5.
