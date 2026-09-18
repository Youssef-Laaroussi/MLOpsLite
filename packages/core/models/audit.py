"""SQLAlchemy model for immutable audit logs (Issue #27)."""

import enum
from datetime import datetime, timezone

from sqlalchemy import (
    Enum as SAEnum,
    String,
    Text,
    DateTime,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column

from packages.core.db.base import Base, UUIDMixin


class AuditAction(str, enum.Enum):
    """Auditable action types."""

    # Projects
    PROJECT_CREATE = "PROJECT_CREATE"
    PROJECT_UPDATE = "PROJECT_UPDATE"
    PROJECT_DELETE = "PROJECT_DELETE"

    # Models
    MODEL_REGISTER = "MODEL_REGISTER"
    MODEL_PROMOTE = "MODEL_PROMOTE"
    MODEL_DELETE = "MODEL_DELETE"

    # Deployments
    DEPLOYMENT_CREATE = "DEPLOYMENT_CREATE"
    DEPLOYMENT_STOP = "DEPLOYMENT_STOP"
    DEPLOYMENT_ROLLBACK = "DEPLOYMENT_ROLLBACK"

    # Datasets
    DATASET_CREATE = "DATASET_CREATE"
    DATASET_DELETE = "DATASET_DELETE"

    # Alerts
    ALERT_ACKNOWLEDGE = "ALERT_ACKNOWLEDGE"
    ALERT_RESOLVE = "ALERT_RESOLVE"
    ALERT_CONFIG_UPDATE = "ALERT_CONFIG_UPDATE"

    # Users & Auth
    USER_CREATE = "USER_CREATE"
    USER_UPDATE = "USER_UPDATE"
    USER_DEACTIVATE = "USER_DEACTIVATE"
    USER_LOGIN = "USER_LOGIN"
    API_KEY_CREATE = "API_KEY_CREATE"
    API_KEY_REVOKE = "API_KEY_REVOKE"

    # Rollback
    ROLLBACK_EXECUTE = "ROLLBACK_EXECUTE"
    ROLLBACK_POLICY_CREATE = "ROLLBACK_POLICY_CREATE"
    ROLLBACK_POLICY_UPDATE = "ROLLBACK_POLICY_UPDATE"
    ROLLBACK_POLICY_DELETE = "ROLLBACK_POLICY_DELETE"
    AUTO_ROLLBACK_TRIGGER = "AUTO_ROLLBACK_TRIGGER"


class AuditLog(Base, UUIDMixin):
    """Immutable audit log entry — append-only, no update/delete allowed."""

    __tablename__ = "audit_logs"

    user_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True, doc="Acting user ID"
    )
    user_email: Mapped[str | None] = mapped_column(
        String(255), nullable=True, doc="Acting user email at time of action"
    )
    ip_address: Mapped[str | None] = mapped_column(
        String(45), nullable=True, doc="Client IP address (IPv4 or IPv6)"
    )
    action: Mapped[AuditAction] = mapped_column(
        SAEnum(AuditAction, name="audit_action", create_constraint=True),
        nullable=False, index=True,
    )
    resource_type: Mapped[str] = mapped_column(
        String(50), nullable=False, index=True,
        doc="Target resource type: project, model, deployment, etc."
    )
    resource_id: Mapped[str | None] = mapped_column(
        String(36), nullable=True, index=True, doc="UUID of the target resource"
    )
    resource_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True, doc="Human-readable resource identifier"
    )
    changes_json: Mapped[dict | None] = mapped_column(
        JSON, nullable=True,
        doc="Before/after diff or action metadata"
    )
    timestamp: Mapped[datetime] = mapped_column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False,
        index=True,
    )
