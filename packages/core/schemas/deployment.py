"""Pydantic v2 schemas for Deployment API requests and responses."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from packages.core.models.deployment import DeploymentStatus


class DeploymentCreate(BaseModel):
    """Payload to deploy a registered model version to Docker."""

    model_name: str = Field(..., min_length=1, max_length=200, description="Name of the registered model")
    model_version: int = Field(..., ge=1, description="Version number of the registered model")
    port: int | None = Field(None, ge=1024, le=65535, description="Optional custom host port (default auto-allocated)")
    project_id: str | None = Field(None, description="Optional associated project ID")
    config: dict[str, Any] | None = Field(default_factory=dict, description="Deployment configuration flags")


class DeploymentResponse(BaseModel):
    """Detailed response for a single deployment."""

    id: str
    project_id: str | None
    model_name: str
    model_version: int
    container_id: str | None
    port: int
    endpoint_url: str
    status: DeploymentStatus
    error_message: str | None
    config: dict[str, Any] | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class DeploymentListResponse(BaseModel):
    """Paginated or listed response of deployments."""

    deployments: list[DeploymentResponse]
    total: int


class DeploymentMetricResponse(BaseModel):
    """Resource utilization and health metric point."""

    id: str
    deployment_id: str
    cpu_percent: float
    memory_mb: float
    memory_limit_mb: float
    requests_count: int
    error_count: int
    latency_p50_ms: float | None
    latency_p95_ms: float | None
    timestamp: datetime

    model_config = {"from_attributes": True}
