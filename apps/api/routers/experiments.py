"""Experiment / training-run endpoints (scaffold).

Full CRUD implemented in Issue #9.
"""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/experiments", tags=["Experiments"])


@router.get("/")
async def list_experiments() -> dict[str, Any]:
    """List experiments. (scaffold – completed in Issue #9)"""
    return {"experiments": [], "total": 0}
