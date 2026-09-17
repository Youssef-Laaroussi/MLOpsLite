"""Alerting endpoints (scaffold).

Full implementation will be completed in Issues #21–#22.
"""

from typing import Any

from fastapi import APIRouter

router = APIRouter(prefix="/api/v1/alerts", tags=["Alerts"])


@router.get("/")
async def list_alerts() -> dict[str, Any]:
    """List active alerts. (scaffold – completed in Issues #21–#22)"""
    return {"alerts": [], "total": 0}
