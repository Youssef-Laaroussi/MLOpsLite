"""Project SQLAlchemy model."""

import enum

from sqlalchemy import Enum as SAEnum
from sqlalchemy import ForeignKey, Index, String, Text, text
from sqlalchemy.orm import Mapped, mapped_column

from packages.core.db.base import Base, TimestampMixin, UUIDMixin


class ProjectStatus(str, enum.Enum):
    """Project lifecycle status."""

    ACTIVE = "active"
    ARCHIVED = "archived"


class ProjectRole(str, enum.Enum):
    OWNER = "OWNER"
    MEMBER = "MEMBER"


class ProjectMembership(Base, TimestampMixin):
    """Project permissions are separate from an account's instance-wide role."""

    __tablename__ = "project_memberships"
    __table_args__ = (
        Index(
            "one_owner_per_project", "project_id", unique=True,
            postgresql_where=text("project_role = 'OWNER'"),
            sqlite_where=text("project_role = 'OWNER'"),
        ),
    )

    project_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True,
    )
    user_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True, index=True,
    )
    project_role: Mapped[ProjectRole] = mapped_column(
        SAEnum(ProjectRole, name="project_role", create_constraint=True), nullable=False,
    )


class Project(Base, UUIDMixin, TimestampMixin):
    """ML Project entity — root context for datasets, experiments, and models."""

    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(
        String(100), nullable=False, doc="Human-readable project name"
    )
    slug: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
        doc="URL-safe unique project identifier (^[a-z0-9-_]{3,50}$)",
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True, doc="Project description")
    git_url: Mapped[str | None] = mapped_column(
        String(500), nullable=True, doc="Git repository URL"
    )
    default_branch: Mapped[str] = mapped_column(
        String(100), default="main", doc="Default Git branch"
    )
    config_yaml: Mapped[str | None] = mapped_column(
        Text, nullable=True, doc="Raw mlite.yaml content"
    )
    status: Mapped[ProjectStatus] = mapped_column(
        SAEnum(ProjectStatus, name="project_status", create_constraint=True),
        default=ProjectStatus.ACTIVE,
        nullable=False,
        doc="Project lifecycle status",
    )
