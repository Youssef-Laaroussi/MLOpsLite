# MLite REST API — Overview

> **Base URL:** `http://localhost:8000`
> **OpenAPI Schema:** [`/openapi.json`](http://localhost:8000/openapi.json)
> **Interactive Docs:** [`/docs`](http://localhost:8000/docs) (Swagger UI) | [`/redoc`](http://localhost:8000/redoc)

---

## API Versioning Strategy

All feature endpoints are namespaced under **`/api/v1/`**:

```
/api/v1/health         → System health probes
/api/v1/projects/      → ML project management
/api/v1/datasets/      → Dataset lifecycle
/api/v1/experiments/   → Experiment tracking
/api/v1/models/        → Model registry
/api/v1/deployments/   → Deployment engine
/api/v1/monitoring/    → Monitoring reports
/api/v1/alerts/        → Alerting configuration
```

When a breaking change is introduced, a new version prefix (`/api/v2/`) will
be added while keeping `v1` available for backward compatibility during a
deprecation window.

---

## Standard Response Envelope

### Success

```json
{
  "status": "healthy",
  "version": "0.1.0",
  "timestamp": "2025-01-15T10:30:00Z"
}
```

### Error

All errors follow a uniform JSON structure:

```json
{
  "error": "Resource 'abc-123' not found",
  "detail": null
}
```

### Validation Error (422)

```json
{
  "error": "Validation error",
  "detail": [
    {
      "loc": ["body", "name"],
      "msg": "Field required",
      "type": "missing"
    }
  ]
}
```

---

## Error Codes

| HTTP Code | Error Type              | Description                          |
| --------- | ----------------------- | ------------------------------------ |
| `200`     | —                       | Success                              |
| `201`     | —                       | Resource created                     |
| `404`     | `NotFoundError`         | Resource not found                   |
| `409`     | `ConflictError`         | Duplicate / conflicting resource     |
| `422`     | `RequestValidationError`| Pydantic validation failure          |
| `500`     | `MLiteAPIError`         | Internal server error (sanitized)    |

Every error response includes an `X-Request-ID` header for traceability.

---

## Headers

| Header          | Direction | Description                            |
| --------------- | --------- | -------------------------------------- |
| `X-Request-ID`  | Both      | Auto-generated UUID for request tracing |
| `Authorization` | Request   | `Bearer <token>` (Issue #25)           |
| `Content-Type`  | Both      | `application/json`                     |

---

## Running Locally

```bash
# Hot-reload development server
uvicorn apps.api.main:app --reload --host 0.0.0.0 --port 8000

# Via Makefile
make api-dev

# Via Docker Compose
docker compose up api
```

Then open:
- **Swagger UI:** http://localhost:8000/docs
- **ReDoc:** http://localhost:8000/redoc
- **Health:** http://localhost:8000/api/v1/health
- **Readiness:** http://localhost:8000/api/v1/ready

---

## Authentication (Planned — Issue #25)

Authentication is not yet implemented. Once Issue #25 is completed:

1. Obtain a JWT token via `POST /api/v1/auth/login`.
2. Include the token in the `Authorization: Bearer <token>` header.
3. API keys will also be supported for CI/CD pipelines.

---

## CORS Policy

The API accepts cross-origin requests from any origin by default during
development. In production, restrict `MLITE_ALLOWED_ORIGINS` to your
frontend domain:

```env
MLITE_ALLOWED_ORIGINS='["https://mlite.example.com"]'
```
