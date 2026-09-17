"""Model registry endpoints (scaffold).

Full CRUD and promotion workflows will be completed in Issue #10.
"""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/models", tags=["Models"])


@router.get("/")
async def list_models() -> dict[str, Any]:
    """List registered models. (scaffold – completed in Issue #10)"""
    return {"models": [], "total": 0}
