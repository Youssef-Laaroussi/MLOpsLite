# ⚠️ API Error Handling & Status Codes

> **Component:** `docs/api/errors.md`, `apps/api/errors.py`  
> **Milestone:** M8 — Documentation & Examples (Issue #35)

---

## Overview

All MLite REST API endpoints return consistent, standardized JSON error responses. Every response includes the `X-Request-ID` header to facilitate distributed debugging across application logs.

---

## Standard Error Envelope

```json
{
  "error": "Error description message",
  "detail": null
}
```

---

## HTTP Status Codes

| HTTP Status | Error Type | Cause | Example Scenario |
| :---: | :--- | :--- | :--- |
| **`400`** | `BadRequestError` | Malformed request parameters | Negative page index or invalid limit |
| **`401`** | `Unauthorized` | Missing, invalid, or expired credentials | Expired JWT token or revoked API key |
| **`403`** | `Forbidden` | User lacks necessary RBAC permission | `VIEWER` attempting to promote a model |
| **`404`** | `NotFoundError` | Target resource does not exist | Invalid project slug or model version |
| **`405`** | `MethodNotAllowed`| HTTP method prohibited | Attempting `DELETE` on immutable audit logs |
| **`409`** | `ConflictError` | Resource already exists | Duplicate project name or registered username |
| **`422`** | `ValidationError`| Pydantic schema validation failure | Missing required field or type mismatch |
| **`500`** | `MLiteAPIError` | Unhandled internal server error | Database connectivity crash |

---

## Validation Error Format (`422 Unprocessable Entity`)

When a request payload fails schema validation, FastAPI returns detailed field-level error locations:

```json
{
  "error": "Validation error",
  "detail": [
    {
      "loc": ["body", "model_version"],
      "msg": "Input should be greater than 0",
      "type": "greater_than",
      "ctx": {"gt": 0}
    },
    {
      "loc": ["body", "stage"],
      "msg": "Field required",
      "type": "missing"
    }
  ]
}
```

---

## Insufficient Permissions Format (`403 Forbidden`)

```json
{
  "detail": "Missing permission: 'model:promote'. Your role 'DEVELOPER' does not have this capability."
}
```

---

## Request Tracing with `X-Request-ID`

Every request processed by MLite is assigned an RFC 4122 UUID header:
```http
HTTP/1.1 404 Not Found
Date: Fri, 18 Sep 2026 19:15:00 GMT
Content-Type: application/json
X-Request-ID: d3b07384-d113-49d7-849c-d2c67676fb1c

{
  "error": "Model version 'fraud-model v9' not found",
  "detail": null
}
```
Include the `X-Request-ID` when searching API container logs:
```bash
docker compose logs mlite-api | grep "d3b07384-d113-49d7-849c-d2c67676fb1c"
```
