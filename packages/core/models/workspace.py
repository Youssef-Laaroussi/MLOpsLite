"""Installation accounts own resources independently of their administrator role."""

from sqlalchemy import ForeignKey, String
from sqlalchemy.orm import Mapped, mapped_column

from packages.core.db.base import Base, TimestampMixin


class ResourceOwnerMixin:
    # NULL is reserved for unresolved legacy records. Workspace queries never
    # expose them; administrators can explicitly assign them through recovery.
    owner_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("users.id", ondelete="RESTRICT"), nullable=True, index=True,
    )


class WorkspaceExperiment(ResourceOwnerMixin, Base, TimestampMixin):
    __tablename__ = "workspace_experiments"

    experiment_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(256), nullable=False)
    project_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True,
    )
