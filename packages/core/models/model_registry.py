"""Model Registry SQLAlchemy models — RegisteredModel and ModelVersion."""

import enum

from sqlalchemy import (
    Enum as SAEnum,
    ForeignKey,
    Integer,
    String,
    Text,
    Float,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.core.db.base import Base, UUIDMixin, TimestampMixin


class ModelStage(str, enum.Enum):
    """Model version lifecycle stage."""

    DEVELOPMENT = "DEVELOPMENT"
    CANDIDATE = "CANDIDATE"
    STAGING = "STAGING"
    PRODUCTION = "PRODUCTION"
    ARCHIVED = "ARCHIVED"


class RegisteredModel(Base, UUIDMixin, TimestampMixin):
    """A registered ML model with multiple versions."""

    __tablename__ = "registered_models"

    name: Mapped[str] = mapped_column(
        String(200), unique=True, index=True, nullable=False, doc="Unique model name"
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)
    project_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True
    )
    tags: Mapped[dict | None] = mapped_column(JSON, nullable=True)

    # Relationships
    versions: Mapped[list["ModelVersion"]] = relationship(
        "ModelVersion", back_populates="model", cascade="all, delete-orphan"
    )


class ModelVersion(Base, UUIDMixin, TimestampMixin):
    """A specific version of a registered model."""

    __tablename__ = "model_versions"

    model_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("registered_models.id", ondelete="CASCADE"), nullable=False
    )
    version: Mapped[int] = mapped_column(Integer, nullable=False, doc="Sequential version number")
    stage: Mapped[ModelStage] = mapped_column(
        SAEnum(ModelStage, name="model_stage", create_constraint=True),
        default=ModelStage.DEVELOPMENT,
        server_default="DEVELOPMENT",
        nullable=False,
    )
    mlflow_run_id: Mapped[str | None] = mapped_column(
        String(64), nullable=True, doc="MLflow run ID that produced this model"
    )
    mlflow_model_uri: Mapped[str | None] = mapped_column(
        String(500), nullable=True, doc="MLflow model artifact URI"
    )
    artifact_path: Mapped[str | None] = mapped_column(
        String(500), nullable=True, doc="S3/MinIO artifact path"
    )
    metrics: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, doc="Evaluation metrics snapshot"
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    model: Mapped["RegisteredModel"] = relationship(
        "RegisteredModel", back_populates="versions"
    )
