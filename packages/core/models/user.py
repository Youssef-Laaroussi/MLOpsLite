"""SQLAlchemy models for User accounts and API keys (Issue #25)."""

import enum
import hashlib
import secrets
from datetime import datetime, timezone

from sqlalchemy import (
    Enum as SAEnum,
    String,
    Text,
    Boolean,
    DateTime,
    JSON,
    ForeignKey,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.core.db.base import Base, UUIDMixin, TimestampMixin


class UserRole(str, enum.Enum):
    """User role for RBAC (Issue #26)."""

    ADMIN = "ADMIN"
    USER = "USER"
    # Legacy aliases mapped for full backwards-compatibility
    MAINTAINER = "MAINTAINER"
    DEVELOPER = "DEVELOPER"
    VIEWER = "VIEWER"


class User(Base, UUIDMixin, TimestampMixin):
    """A registered user account with role-based access."""

    __tablename__ = "users"

    email: Mapped[str] = mapped_column(
        String(255), unique=True, index=True, nullable=False, doc="Unique email address"
    )
    username: Mapped[str] = mapped_column(
        String(100), unique=True, index=True, nullable=False, doc="Unique username"
    )
    hashed_password: Mapped[str] = mapped_column(
        String(255), nullable=False, doc="Argon2/bcrypt hashed password"
    )
    full_name: Mapped[str | None] = mapped_column(
        String(200), nullable=True
    )
    role: Mapped[UserRole] = mapped_column(
        SAEnum(UserRole, name="user_role", create_constraint=True),
        default=UserRole.USER,
        server_default="USER",
        nullable=False,
    )
    is_active: Mapped[bool] = mapped_column(
        Boolean, default=True, server_default="true", nullable=False,
        doc="Deactivated users cannot authenticate"
    )

    # Relationships
    api_keys: Mapped[list["ApiKey"]] = relationship(
        "ApiKey", back_populates="user", cascade="all, delete-orphan"
    )


class ApiKey(Base, UUIDMixin, TimestampMixin):
    """Long-lived API key for headless CLI and CI/CD pipelines."""

    __tablename__ = "api_keys"

    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True, doc="Owning user ID"
    )
    name: Mapped[str] = mapped_column(
        String(100), nullable=False, doc="Human-readable key name (e.g. 'CI Pipeline')"
    )
    key_prefix: Mapped[str] = mapped_column(
        String(12), nullable=False, doc="First 8 chars of key for identification (mlite_xxxx)"
    )
    key_hash: Mapped[str] = mapped_column(
        String(64), unique=True, nullable=False, index=True,
        doc="SHA-256 hash of the full API key"
    )
    scopes: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, doc="Optional scope restrictions"
    )
    expires_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True, doc="Optional expiration date"
    )
    is_revoked: Mapped[bool] = mapped_column(
        Boolean, default=False, server_default="false", nullable=False,
        doc="Revoked keys are immediately invalid"
    )
    last_used_at: Mapped[datetime | None] = mapped_column(
        DateTime(timezone=True), nullable=True
    )

    # Relationships
    user: Mapped["User"] = relationship("User", back_populates="api_keys")

    @staticmethod
    def generate_key() -> tuple[str, str, str]:
        """Generate a new API key.

        Returns:
            Tuple of (full_key, key_prefix, key_hash)
        """
        raw = secrets.token_urlsafe(32)
        full_key = f"mlite_{raw}"
        key_prefix = full_key[:12]
        key_hash = hashlib.sha256(full_key.encode()).hexdigest()
        return full_key, key_prefix, key_hash
