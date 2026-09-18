"""SQLAlchemy models for rollback operations and auto-rollback policies."""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column

from packages.core.db.base import Base, UUIDMixin, TimestampMixin


class RollbackStatus(str, enum.Enum):
    """Rollback operation lifecycle status."""

    PENDING = "PENDING"
    IN_PROGRESS = "IN_PROGRESS"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"
    ABORTED = "ABORTED"
    PENDING_APPROVAL = "PENDING_APPROVAL"


class RollbackTrigger(str, enum.Enum):
    """How the rollback was initiated."""

    MANUAL = "MANUAL"
    AUTOMATIC = "AUTOMATIC"
    CLI = "CLI"
    API = "API"


class RollbackRecord(Base, UUIDMixin, TimestampMixin):
    """Permanent audit log entry for a rollback operation."""

    __tablename__ = "rollback_records"

    deployment_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("deployments.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    model_name: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True, doc="Name of the model being rolled back"
    )
    from_version: Mapped[int] = mapped_column(
        Integer, nullable=False, doc="Version that was active before rollback"
    )
    to_version: Mapped[int] = mapped_column(
        Integer, nullable=False, doc="Target version to roll back to"
    )
    reason: Mapped[str] = mapped_column(
        Text, nullable=False, default="Manual rollback", doc="Operator or system reason"
    )
    trigger: Mapped[RollbackTrigger] = mapped_column(
        SAEnum(RollbackTrigger, name="rollback_trigger", create_constraint=True),
        default=RollbackTrigger.MANUAL,
        nullable=False,
    )
    status: Mapped[RollbackStatus] = mapped_column(
        SAEnum(RollbackStatus, name="rollback_status", create_constraint=True),
        default=RollbackStatus.PENDING,
        nullable=False,
    )
    initiated_by: Mapped[str] = mapped_column(
        String(100), default="system", nullable=False, doc="User or system entity that triggered rollback"
    )
    completed_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )
    error_message: Mapped[str | None] = mapped_column(
        Text, nullable=True, doc="Error details if rollback failed or was aborted"
    )
    details_json: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, doc="Additional metadata: health check results, metrics at time of rollback"
    )


class RollbackPolicy(Base, UUIDMixin, TimestampMixin):
    """Configurable auto-rollback policy for a model deployment."""

    __tablename__ = "rollback_policies"

    model_name: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True, doc="Model name this policy applies to"
    )
    deployment_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("deployments.id", ondelete="SET NULL"),
        nullable=True, index=True,
    )
    enabled: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
        doc="Auto-rollback is disabled by default for safety"
    )
    require_approval: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False,
        doc="If true, auto-rollback enters PENDING_APPROVAL instead of executing"
    )
    metric: Mapped[str] = mapped_column(
        String(100), default="error_rate", nullable=False,
        doc="Metric to evaluate: error_rate, latency_p95, accuracy, drift_share"
    )
    threshold: Mapped[float] = mapped_column(
        Float, nullable=False, default=0.05,
        doc="Threshold value — rollback triggers when metric exceeds this"
    )
    evaluation_window_seconds: Mapped[int] = mapped_column(
        Integer, default=300, nullable=False,
        doc="Sliding window in seconds for metric evaluation"
    )
    consecutive_violations: Mapped[int] = mapped_column(
        Integer, default=3, nullable=False,
        doc="Number of consecutive windows that must breach before triggering"
    )
    cooldown_hours: Mapped[int] = mapped_column(
        Integer, default=24, nullable=False,
        doc="Rate limit: max 1 auto-rollback per deployment per N hours"
    )
    last_triggered_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True,
        doc="Timestamp of last auto-rollback trigger (for oscillation guard)"
    )
    violation_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False,
        doc="Current consecutive violation counter"
    )
