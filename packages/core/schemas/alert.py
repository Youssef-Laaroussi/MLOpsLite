"""Pydantic v2 schemas for Alert management."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator

from packages.core.models.alert import AlertSeverity, AlertStatus


class AlertCreate(BaseModel):
    project_id: Optional[str] = None
    model_name: Optional[str] = None
    deployment_id: Optional[str] = None
    event_type: str = Field(default="MONITORING_ALERT", description="Event type: DATA_DRIFT, PERFORMANCE_DROP, etc.")
    severity: AlertSeverity = Field(default=AlertSeverity.WARNING)
    title: str = Field(..., max_length=300)
    message: Optional[str] = None
    description: Optional[str] = None
    details_json: Optional[Dict[str, Any]] = None

    @model_validator(mode="before")
    @classmethod
    def populate_message_and_event_type(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("message") and data.get("description"):
                data["message"] = data["description"]
            elif not data.get("description") and data.get("message"):
                data["description"] = data["message"]
            if not data.get("event_type"):
                data["event_type"] = "MONITORING_ALERT"
        return data


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
