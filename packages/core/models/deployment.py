"""Deployment SQLAlchemy models — Deployment and DeploymentMetric."""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    Float,
    DateTime,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.core.db.base import Base, UUIDMixin, TimestampMixin


class DeploymentStatus(str, enum.Enum):
    """Lifecycle status of a model deployment container."""

    PENDING = "PENDING"
    RUNNING = "RUNNING"
    STOPPED = "STOPPED"
    FAILED = "FAILED"


class Deployment(Base, UUIDMixin, TimestampMixin):
    """An active or historical model inference container deployment."""

    __tablename__ = "deployments"

    project_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    model_name: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True, doc="Name of the deployed model"
    )
    model_version: Mapped[int] = mapped_column(
        Integer, nullable=False, doc="Version of the deployed model"
    )
    container_id: Mapped[str | None] = mapped_column(
        String(128), nullable=True, index=True, doc="Docker container ID"
    )
    port: Mapped[int] = mapped_column(
        Integer, nullable=False, doc="Host port mapped to container inference port"
    )
    endpoint_url: Mapped[str] = mapped_column(
        String(500), nullable=False, doc="Base URL for prediction requests"
    )
    status: Mapped[DeploymentStatus] = mapped_column(
        SAEnum(DeploymentStatus, name="deployment_status", create_constraint=True),
        default=DeploymentStatus.PENDING,
        server_default="PENDING",
        nullable=False,
    )
    error_message: Mapped[str | None] = mapped_column(
        Text, nullable=True, doc="Startup or runtime crash error details"
    )
    config: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, doc="Deployment configuration options (e.g. env, limits)"
    )

    # Relationships
    metrics: Mapped[list["DeploymentMetric"]] = relationship(
        "DeploymentMetric", back_populates="deployment", cascade="all, delete-orphan"
    )


class DeploymentMetric(Base, UUIDMixin):
    """Point-in-time health and resource metrics for an active deployment."""

    __tablename__ = "deployment_metrics"

    deployment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("deployments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    cpu_percent: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    memory_mb: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    memory_limit_mb: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    requests_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    error_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    latency_p50_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    latency_p95_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
    )

    # Relationships
    deployment: Mapped["Deployment"] = relationship(
        "Deployment", back_populates="metrics"
    )
