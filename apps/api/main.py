"""MLite FastAPI Application Entrypoint.

Creates the ASGI application with:
- Centralized pydantic-settings configuration
- Modular router registration (health, projects, datasets, experiments)
- Global exception handling
- Request-ID & request-logging middleware
- CORS configuration
- OpenAPI / Swagger UI
"""

import logging
from contextlib import asynccontextmanager
from collections.abc import AsyncGenerator
from typing import Any

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from apps.api.config import get_settings
from apps.api.errors import register_exception_handlers
from apps.api.middleware import register_middleware
from apps.api.routers import (
    health,
    projects,
    datasets,
    experiments,
    models,
    deployments,
    monitoring,
    alerts,
    rollback,
)

logger = logging.getLogger("mlite.api")


# ── Lifespan ────────────────────────────────────────────────────
@asynccontextmanager
async def lifespan(_app: FastAPI) -> AsyncGenerator[None, None]:
    """Application startup / shutdown lifecycle hook."""
    settings = get_settings()
    logging.basicConfig(
        level=settings.log_level,
        format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    )
    logger.info(
        "🚀  %s v%s starting (debug=%s)",
        settings.app_name,
        settings.app_version,
        settings.debug,
    )
    yield
    logger.info("🛑  %s shutting down", settings.app_name)


# ── Application factory ────────────────────────────────────────
def create_app() -> FastAPI:
    """Build and return the fully-configured FastAPI application."""
    settings = get_settings()

    app = FastAPI(
        title=settings.app_name,
        description=(
            "**MLite** – Lightweight Self-Hosted MLOps Platform REST API.\n\n"
            "Manage ML projects, datasets, experiments, model registry, "
            "deployments, and monitoring from a single unified API."
        ),
        version=settings.app_version,
        docs_url="/docs",
        redoc_url="/redoc",
        openapi_url="/openapi.json",
        lifespan=lifespan,
        license_info={"name": "Apache 2.0", "url": "https://www.apache.org/licenses/LICENSE-2.0"},
        contact={
            "name": "Youssef Laaroussi",
            "url": "https://github.com/Youssef-Laaroussi/MLOpsLite",
        },
    )

    # ── CORS ────────────────────────────────────────────────
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.allowed_origins,
        allow_credentials=True,
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Middleware stack ────────────────────────────────────
    register_middleware(app)

    # ── Exception handlers ──────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ─────────────────────────────────────────────
    app.include_router(health.router)
    app.include_router(projects.router)
    app.include_router(datasets.router)
    app.include_router(experiments.router)
    app.include_router(models.router)
    app.include_router(deployments.router)
    app.include_router(monitoring.router)
    app.include_router(alerts.router)
    app.include_router(rollback.router)

    # ── Legacy root health (backward-compat) ────────────────
    @app.get("/health", tags=["Health"], include_in_schema=False)
    async def root_health() -> dict[str, str]:
        return {"status": "ok", "version": settings.app_version}

    @app.get("/ready", tags=["Health"], include_in_schema=False)
    async def root_ready() -> dict[str, str]:
        return {"status": "ready"}

    return app


# Module-level instance used by Uvicorn: `uvicorn apps.api.main:app`
app: FastAPI = create_app()
