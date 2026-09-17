# FastAPI Core Application Architecture

> Issue #6 – Modular routing, OpenAPI schema, middleware, and error handling.

## Overview

The API layer follows an **application-factory pattern** (`create_app()`) that
cleanly separates configuration, routing, middleware, and error handling into
dedicated modules.

```
apps/api/
├── __init__.py
├── config.py          # pydantic-settings (env-backed)
├── dependencies.py    # FastAPI Depends() providers
├── errors.py          # Exception classes + global handlers
├── main.py            # Application factory + Uvicorn entrypoint
├── middleware.py       # Request-ID, logging
└── routers/
    ├── __init__.py
    ├── health.py       # /api/v1/health, /ready, /info
    ├── projects.py     # /api/v1/projects (scaffold)
    ├── datasets.py     # /api/v1/datasets (scaffold)
    └── experiments.py  # /api/v1/experiments (scaffold)
```

## Configuration (`config.py`)

All tunables are loaded via **pydantic-settings** from environment variables
(prefixed `MLITE_`) or a `.env` file:

| Setting            | Env Variable              | Default                      |
| ------------------ | ------------------------- | ---------------------------- |
| `app_name`         | `MLITE_APP_NAME`          | `MLite API`                  |
| `debug`            | `MLITE_DEBUG`             | `false`                      |
| `database_url`     | `MLITE_DATABASE_URL`      | `postgresql+asyncpg://…`     |
| `minio_endpoint`   | `MLITE_MINIO_ENDPOINT`    | `http://localhost:9000`      |
| `mlflow_tracking_uri` | `MLITE_MLFLOW_TRACKING_URI` | `http://localhost:5000` |

The `get_settings()` function is `@lru_cache`-decorated and safe for use
as a FastAPI dependency.

## Routing

Every domain entity has its own `APIRouter` registered with a versioned
prefix (`/api/v1/…`). The application factory includes all routers at
startup:

```python
app.include_router(health.router)
app.include_router(projects.router)
app.include_router(datasets.router)
app.include_router(experiments.router)
```

Legacy `/health` and `/ready` endpoints are retained for backward
compatibility but excluded from the generated OpenAPI schema.

## Middleware

| Middleware            | Purpose                                  |
| --------------------- | ---------------------------------------- |
| `RequestIDMiddleware` | Injects `X-Request-ID` for traceability  |
| `RequestLoggingMiddleware` | Logs method, path, status, duration |
| `CORSMiddleware`      | Configurable CORS (defaults to `*`)      |

## Error Handling

Three global exception handlers ensure every error surfaces as JSON:

| Exception                | HTTP Code | Response Shape                    |
| ------------------------ | --------- | --------------------------------- |
| `MLiteAPIError`          | Custom    | `{"error": "…", "detail": …}`    |
| `RequestValidationError` | 422       | `{"error": "…", "detail": […]}`  |
| Unhandled `Exception`    | 500       | `{"error": "Internal server error"}` |

Domain exceptions (`NotFoundError`, `ConflictError`) subclass
`MLiteAPIError` for convenience.

## Dependency Injection

`dependencies.py` exports reusable `Depends()` callables:

- **`get_db()`** – Async DB session with commit/rollback
- **`get_storage()`** – Configured `StorageClient` instance
- **`get_app_settings()`** – Typed `Settings` object

## Running

```bash
# Development
uvicorn apps.api.main:app --reload --host 0.0.0.0 --port 8000

# Via Makefile
make api-dev
```

The OpenAPI docs are served at `/docs` (Swagger UI) and `/redoc`.
