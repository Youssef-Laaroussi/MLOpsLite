"""Dataset management endpoints (scaffold).

Full CRUD and upload flow will be completed in Issue #8.
"""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/datasets", tags=["Datasets"])


@router.get("/")
async def list_datasets() -> dict[str, Any]:
    """List registered datasets. (scaffold – completed in Issue #8)"""
    return {"datasets": [], "total": 0}
