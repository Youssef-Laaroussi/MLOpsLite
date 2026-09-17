"""Deployment management endpoints (scaffold).

Full lifecycle will be completed in Issue #11.
"""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/deployments", tags=["Deployments"])


@router.get("/")
async def list_deployments() -> dict[str, Any]:
    """List active deployments. (scaffold – completed in Issue #11)"""
    return {"deployments": [], "total": 0}
