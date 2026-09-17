"""Monitoring and observability endpoints (scaffold).

Full implementation will be completed in Issues #17–#20.
"""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/monitoring", tags=["Monitoring"])


@router.get("/")
async def list_reports() -> dict[str, Any]:
    """List monitoring reports. (scaffold – completed in Issues #17–#20)"""
    return {"reports": [], "total": 0}
