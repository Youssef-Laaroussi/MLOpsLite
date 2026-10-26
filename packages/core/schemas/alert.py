"""Pydantic v2 schemas for Alert management."""

from datetime import datetime
from typing import Any, Literal

from pydantic import BaseModel, Field, HttpUrl, model_validator

from packages.core.models.alert import AlertSeverity, AlertStatus


class AlertCreate(BaseModel):
    project_id: str | None = None
    model_name: str | None = None
    deployment_id: str | None = None
    event_type: str = Field(
        default="MONITORING_ALERT", description="Event type: DATA_DRIFT, PERFORMANCE_DROP, etc."
    )
    severity: AlertSeverity = Field(default=AlertSeverity.WARNING)
    title: str = Field(..., max_length=300)
    message: str | None = None
    description: str | None = None
    details_json: dict[str, Any] | None = None

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
    project_id: str | None = None
    model_name: str | None = None
    deployment_id: str | None = None
    event_type: str
    severity: AlertSeverity
    title: str
    message: str
    details_json: dict[str, Any] | None = None
    status: AlertStatus
    acknowledged_by: str | None = None
    created_at: datetime
    resolved_at: datetime | None = None

    model_config = {"from_attributes": True}


class AlertListResponse(BaseModel):
    alerts: list[AlertResponse]
    total: int


RuleMetric = Literal["drift_share", "latency_p95_ms", "failed_deployments"]
RuleOperator = Literal[">", ">=", "<", "<="]
ChannelKind = Literal["SLACK", "DISCORD", "WEBHOOK"]


class AlertRuleCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    metric: RuleMetric
    operator: RuleOperator = ">"
    threshold: float
    model_name: str | None = None
    severity: AlertSeverity = AlertSeverity.WARNING
    enabled: bool = True


class AlertRuleUpdate(BaseModel):
    enabled: bool


class AlertRuleResponse(AlertRuleCreate):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


class RuleEvaluationResponse(BaseModel):
    evaluated: int
    triggered: list[AlertResponse]


class NotificationChannelCreate(BaseModel):
    name: str = Field(..., min_length=1, max_length=200)
    kind: ChannelKind
    url: HttpUrl


class NotificationChannelResponse(BaseModel):
    id: str
    name: str
    kind: ChannelKind
    url: str
    enabled: bool
    last_test_at: datetime | None = None
    last_test_ok: bool | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class AlertSummaryResponse(BaseModel):
    open_critical: int
    open_warning: int
    resolved_7d: int
    mttr_minutes: float | None = Field(None, description="None when no alert was ever resolved")
