"""Pydantic v2 schemas for Alert management."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from packages.core.models.alert import AlertSeverity, AlertStatus


class AlertCreate(BaseModel):
    project_id: Optional[str] = None
    model_name: Optional[str] = None
    deployment_id: Optional[str] = None
    event_type: str = Field(..., description="Event type: DATA_DRIFT, PERFORMANCE_DROP, etc.")
    severity: AlertSeverity = Field(default=AlertSeverity.WARNING)
    title: str = Field(..., max_length=300)
    message: str
    details_json: Optional[Dict[str, Any]] = None


class AlertResponse(BaseModel):
    id: str
    project_id: Optional[str] = None
    model_name: Optional[str] = None
    deployment_id: Optional[str] = None
    event_type: str
    severity: AlertSeverity
    title: str
    message: str
    details_json: Optional[Dict[str, Any]] = None
    status: AlertStatus
    acknowledged_by: Optional[str] = None
    created_at: datetime
    resolved_at: Optional[datetime] = None

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    alerts: List[AlertResponse]
    total: int
