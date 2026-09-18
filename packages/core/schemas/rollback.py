"""Pydantic v2 schemas for Rollback API requests and responses."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from packages.core.models.rollback import RollbackStatus, RollbackTrigger


# ── Rollback Request / Response ─────────────────────────────────

class RollbackRequest(BaseModel):
    """Payload to initiate a manual rollback."""

    target_version: int | None = Field(
        None,
        ge=1,
        description="Target model version to roll back to. If omitted, rolls back to previous version.",
    )
    reason: str = Field(
        "Manual rollback requested",
        min_length=1,
        max_length=1000,
        description="Reason for the rollback",
    )


class RollbackResponse(BaseModel):
    """Detailed response for a rollback operation."""

    id: str
    deployment_id: str | None
    model_name: str
    from_version: int
    to_version: int
    reason: str
    trigger: RollbackTrigger
    status: RollbackStatus
    initiated_by: str
    completed_at: datetime | None
    error_message: str | None
    details_json: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class RollbackListResponse(BaseModel):
    """List of rollback records."""

    rollbacks: list[RollbackResponse]
    total: int


# ── Auto-Rollback Policy Schemas ────────────────────────────────

class PolicyCreate(BaseModel):
    """Payload to create or update an auto-rollback policy."""

    model_name: str = Field(..., min_length=1, max_length=200)
    deployment_id: str | None = None
    enabled: bool = Field(False, description="Enable auto-rollback (disabled by default for safety)")
    require_approval: bool = Field(False, description="Require human approval before executing")
    metric: str = Field("error_rate", description="Metric to evaluate: error_rate, latency_p95, accuracy, drift_share")
    threshold: float = Field(0.05, ge=0.0, le=1.0, description="Breach threshold")
    evaluation_window_seconds: int = Field(300, ge=30, le=3600)
    consecutive_violations: int = Field(3, ge=1, le=20)
    cooldown_hours: int = Field(24, ge=1, le=168)


class PolicyResponse(BaseModel):
    """Response for an auto-rollback policy."""

    id: str
    model_name: str
    deployment_id: str | None
    enabled: bool
    require_approval: bool
    metric: str
    threshold: float
    evaluation_window_seconds: int
    consecutive_violations: int
    cooldown_hours: int
    last_triggered_at: datetime | None
    violation_count: int
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class PolicyListResponse(BaseModel):
    """List of auto-rollback policies."""

    policies: list[PolicyResponse]
    total: int
