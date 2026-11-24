"""Installation-local setup state. Never infer administrator privileges from user counts."""

from datetime import datetime

from sqlalchemy import CheckConstraint, DateTime, Integer, String
from sqlalchemy.orm import Mapped, mapped_column

from packages.core.db.base import Base


class InstanceState(Base):
    __tablename__ = "instance_state"
    __table_args__ = (CheckConstraint("id = 1", name="single_instance_state"),)

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    setup_token_hash: Mapped[str | None] = mapped_column(String(64), nullable=True)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True), nullable=True)
