"""MLite FastAPI Application Entrypoint.

Creates the ASGI application with:
- Centralized pydantic-settings configuration
- Modular router registration (health, projects, datasets, experiments)
- Global exception handling
- Request-ID & request-logging middleware
- CORS configuration
- OpenAPI / Swagger UI
"""

import asyncio
import logging
from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager, suppress

from fastapi import Depends, FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.openapi.docs import get_redoc_html, get_swagger_ui_html
from fastapi.openapi.utils import get_openapi
from fastapi.responses import JSONResponse

from apps.api.config import get_settings
from apps.api.errors import register_exception_handlers
from apps.api.middleware import register_middleware
from apps.api.routers import (
    admin_workspaces,
    alerts,
    audit,
    auth,
    contact,
    datasets,
    deployments,
    experiments,
    health,
    models,
    monitoring,
    projects,
    rollback,
    settings_storage,
    setup,
)
from packages.core.models.user import UserRole
from packages.core.security.dependencies import require_role
from packages.core.security.workspace_dependencies import get_workspace_db

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

    from packages.core.db.session import engine
    from packages.core.services.instance_service import initialize_instance

    configured_code = settings.setup_token.get_secret_value() if settings.setup_token else ""
    code = await initialize_instance(engine, configured_code)
    if code:
        logger.warning(
            "MLite is not configured. Open /setup and use this installation-local code: %s "
            "(one use; recover with 'mlite instance setup-code').", code,
        )

    from packages.core.db.session import async_session_factory
    from packages.deployment.supervisor import collect_inference_telemetry
    from packages.deployment.upgrade_serving import secure_running_deployments

    await secure_running_deployments(async_session_factory)

    tasks = [asyncio.create_task(collect_inference_telemetry())]
    if settings.evaluation_interval_seconds > 0:
        from apps.worker.evaluation import evaluate_periodically
        tasks.append(asyncio.create_task(evaluate_periodically(settings.evaluation_interval_seconds)))
    try:
        yield
    finally:
        for task in tasks:
            task.cancel()
        with suppress(asyncio.CancelledError):
            await asyncio.gather(*tasks)
    logger.info("🛑  %s shutting down", settings.app_name)


# ── Application factory ────────────────────────────────────────
def create_app() -> FastAPI:
    """Build and return the fully-configured FastAPI application."""
    settings = get_settings()

    is_prod = settings.environment.lower() in ("production", "prod")

    app = FastAPI(
        title=settings.app_name,
        description=(
            "**MLite** – Lightweight Self-Hosted MLOps Platform REST API.\n\n"
            "Manage ML projects, datasets, experiments, model registry, "
            "deployments, and monitoring from a single unified API."
        ),
        version=settings.app_version,
        docs_url="/docs" if not is_prod else None,
        redoc_url="/redoc" if not is_prod else None,
        openapi_url="/openapi.json" if not is_prod else None,
        lifespan=lifespan,
        license_info={"name": "Apache 2.0", "url": "https://www.apache.org/licenses/LICENSE-2.0"},
        contact={
            "name": "Youssef Laaroussi",
            "url": "https://github.com/Youssef-Laaroussi/MLOpsLite",
        },
    )

    # ── CORS ────────────────────────────────────────────────
    origins = settings.allowed_origins
    has_wildcard = "*" in origins
    app.add_middleware(
        CORSMiddleware,
        allow_origins=origins,
        allow_credentials=not has_wildcard,  # Security: never allow credentials with wildcard '*'
        allow_methods=["*"],
        allow_headers=["*"],
    )

    # ── Middleware stack ────────────────────────────────────
    register_middleware(app)

    # ── Exception handlers ──────────────────────────────────
    register_exception_handlers(app)

    # Setup is locally authorized. Operational routers require an authenticated account.
    app.include_router(health.router)
    app.include_router(auth.router)
    app.include_router(setup.router)
    app.include_router(settings_storage.router)
    app.include_router(contact.router)
    app.include_router(audit.router)
    app.include_router(admin_workspaces.router)
    app.include_router(rollback.router, dependencies=[Depends(get_workspace_db)])
    protected = [Depends(get_workspace_db)]
    for r in (projects, datasets, experiments, models, deployments, monitoring, alerts):
        app.include_router(r.router, dependencies=protected)

    # ── Admin-only Documentation in Production ────────────────
    if is_prod:
        admin_doc_deps = [Depends(require_role(UserRole.ADMIN))]

        @app.get("/admin/docs", include_in_schema=False, dependencies=admin_doc_deps)
        async def admin_swagger_ui():
            return get_swagger_ui_html(
                openapi_url="/admin/openapi.json",
                title=f"{settings.app_name} - Admin Swagger Docs",
            )

        @app.get("/admin/redoc", include_in_schema=False, dependencies=admin_doc_deps)
        async def admin_redoc_ui():
            return get_redoc_html(
                openapi_url="/admin/openapi.json",
                title=f"{settings.app_name} - Admin ReDoc",
            )

        @app.get("/admin/openapi.json", include_in_schema=False, dependencies=admin_doc_deps)
        async def admin_openapi_schema():
            return JSONResponse(
                get_openapi(
                    title=app.title,
                    version=app.version,
                    routes=app.routes,
                    description=app.description,
                )
            )

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
