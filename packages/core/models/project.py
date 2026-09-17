"""Project SQLAlchemy model."""

from sqlalchemy import String, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column

from packages.core.db.base import Base, UUIDMixin, TimestampMixin

import enum


class ProjectStatus(str, enum.Enum):
    """Project lifecycle status."""

    ACTIVE = "active"
    ARCHIVED = "archived"


class Project(Base, UUIDMixin, TimestampMixin):
    """ML Project entity — root context for datasets, experiments, and models."""

    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(100), nullable=False, doc="Human-readable project name")
    slug: Mapped[str] = mapped_column(
        String(50),
        unique=True,
        index=True,
        nullable=False,
        doc="URL-safe unique project identifier (^[a-z0-9-_]{3,50}$)",
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True, doc="Project description")
    git_url: Mapped[str | None] = mapped_column(String(500), nullable=True, doc="Git repository URL")
    default_branch: Mapped[str] = mapped_column(
        String(100), default="main", server_default="main", doc="Default Git branch"
    )
    config_yaml: Mapped[str | None] = mapped_column(Text, nullable=True, doc="Raw mlite.yaml content")
    status: Mapped[ProjectStatus] = mapped_column(
        SAEnum(ProjectStatus, name="project_status", create_constraint=True),
        default=ProjectStatus.ACTIVE,
        server_default="active",
        nullable=False,
        doc="Project lifecycle status",
    )
