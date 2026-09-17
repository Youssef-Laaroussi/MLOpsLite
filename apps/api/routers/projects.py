"""Project management endpoints (scaffold).

Full CRUD is implemented in Issue #7; this file provides the router
placeholder so that modular routing is established from the start.
"""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


@router.get("/")
async def list_projects() -> dict[str, Any]:
    """List all ML projects. (scaffold – will be completed in Issue #7)"""
    return {"projects": [], "total": 0}
