"""Health-check and system status endpoints."""

import logging
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends

from apps.api.config import Settings
from apps.api.dependencies import get_app_settings

router = APIRouter(prefix="/api/v1", tags=["System"])

logger = logging.getLogger("mlite.api")


@router.get("/health")
async def health_check(
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    """Liveness probe – returns service status, version, and server time."""
    return {
        "status": "healthy",
        "version": settings.app_version,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/ready")
async def readiness_check() -> dict[str, Any]:
    """Readiness probe – checks dependent subsystems.

    In the minimal form this just signals "ready"; downstream issues
    (#7–#10) will extend this to ping PostgreSQL, MinIO, and MLflow.
    """
    checks: dict[str, str] = {
        "database": "ok",
        "storage": "ok",
        "tracking": "ok",
    }
    overall = all(v == "ok" for v in checks.values())
    return {
        "status": "ready" if overall else "degraded",
        "checks": checks,
        "timestamp": datetime.now(timezone.utc).isoformat(),
    }


@router.get("/info")
async def app_info(
    settings: Settings = Depends(get_app_settings),
) -> dict[str, Any]:
    """Return application metadata and configuration summary."""
    return {
        "name": settings.app_name,
        "version": settings.app_version,
        "debug": settings.debug,
        "docs_url": "/docs",
        "redoc_url": "/redoc",
    }
