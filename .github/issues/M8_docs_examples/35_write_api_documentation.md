# #35 — Write REST API reference with OpenAPI interactive documentation

> **Milestone:** M8 — Documentation & Examples  
> **Priority:** `P1`  
> **Labels:** `docs` `P1`  

---

## Problem
Developers integrating MLite with external CI/CD systems, custom frontend apps, or internal tools need a formal, detailed REST API reference explaining request/response envelopes, authentication, and HTTP status codes.

## Objective
Publish complete REST API documentation in `docs/api/`, integrate Swagger/Redoc interactive schemas, and provide curl, Python, and TypeScript client examples for all endpoints.

## Proposed solution
Document all API resource groups: Projects, Datasets, Experiments, Models, Deployments, Monitoring, Alerts, and Audit Logs. Export the OpenAPI JSON schema and embed interactive documentation in MkDocs. Document authentication headers, error formats, and rate limiting.

## Technical requirements
- Resource documentation: `/api/v1/projects`, `/api/v1/datasets`, `/api/v1/models`, `/api/v1/deployments`, `/api/v1/monitoring`, `/api/v1/alerts`.
- Interactive Swagger UI at `/docs` and Redoc at `/redoc`.
- JSON payload schemas documented for all request bodies and query parameters.
- Standard error responses documented with HTTP status codes: 400, 401, 403, 404, 409, 422, 500.

## Acceptance criteria
- All endpoints are documented with sample requests (curl, Python) and actual response JSON.
- OpenAPI schema validates without errors or missing docstrings in FastAPI route functions.
- Authentication flow (Bearer token and X-API-Key) is clearly explained with examples.

## Tests
- Test OpenAPI schema generation and validate against OpenAPI 3.1 specification via schema validator.
- Verify that route changes trigger doc updates via CI test.

## Documentation
- `docs/api/overview.md`.
- `docs/api/endpoints/` (individual resource markdown files).
- `docs/api/errors.md`.

## Dependencies
Issue #6 (FastAPI Core), Issue #7 (Project API).
