"""SQLAlchemy models for Data Quality, Drift Detection, and Performance Monitoring."""

import enum
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional

from sqlalchemy import (
    Enum as SAEnum,
    ForeignKey,
    Integer,
    BigInteger,
    String,
    Text,
    Float,
    Boolean,
    DateTime,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column

from packages.core.db.base import Base, UUIDMixin, TimestampMixin


class DataQualityStatus(str, enum.Enum):
    """Data quality test outcome status."""

    PASS = "PASS"
    WARN = "WARN"
    FAIL = "FAIL"


class DriftSeverity(str, enum.Enum):
    """Evaluated data drift severity level."""

    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"


class DataQualityReport(Base, UUIDMixin, TimestampMixin):
    """Historical data quality validation report for a dataset version."""

    __tablename__ = "data_quality_reports"

    dataset_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    score: Mapped[float] = mapped_column(
        Float, nullable=False, doc="Composite quality score 0-100"
    )
    status: Mapped[DataQualityStatus] = mapped_column(
        SAEnum(DataQualityStatus, name="data_quality_status", create_constraint=True),
        default=DataQualityStatus.PASS,
        nullable=False,
    )
    rows_count: Mapped[int] = mapped_column(BigInteger, default=0, nullable=False)
    cols_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    null_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    duplicate_percentage: Mapped[float] = mapped_column(Float, default=0.0, nullable=False)
    failed_constraints: Mapped[list | None] = mapped_column(
        JSON, nullable=True, doc="List of failed constraints and error messages"
    )
    report_json: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, doc="Full detailed rule-by-rule evaluation metrics"
    )
    s3_report_key: Mapped[str | None] = mapped_column(
        String(500), nullable=True, doc="MinIO storage path for archived report"
    )


class DriftEvaluation(Base, UUIDMixin, TimestampMixin):
    """Historical feature data drift evaluation snapshot."""

    __tablename__ = "drift_evaluations"

    model_name: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True, doc="Target model name"
    )
    deployment_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("deployments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    drift_share: Mapped[float] = mapped_column(
        Float, nullable=False, doc="Proportion of drifted features (0.0 to 1.0)"
    )
    drift_status: Mapped[DriftSeverity] = mapped_column(
        SAEnum(DriftSeverity, name="drift_severity", create_constraint=True),
        default=DriftSeverity.LOW,
        nullable=False,
    )
    drifted_features: Mapped[list | None] = mapped_column(
        JSON, nullable=True, doc="Names of features exhibiting statistically significant drift"
    )
    metrics_json: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, doc="Per-feature p-values, test names, and divergence scores"
    )
    html_report_path: Mapped[str | None] = mapped_column(
        String(500), nullable=True, doc="S3 path to interactive Evidently HTML report"
    )


class ModelPerformanceHistory(Base, UUIDMixin, TimestampMixin):
    """Periodic performance metrics evaluation (Accuracy, F1, RMSE) against ground truth."""

    __tablename__ = "model_performance_history"

    model_name: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True
    )
    deployment_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("deployments.id", ondelete="SET NULL"), nullable=True, index=True
    )
    task_type: Mapped[str] = mapped_column(
        String(50), default="classification", nullable=False
    )
    sample_count: Mapped[int] = mapped_column(Integer, default=0, nullable=False)
    metrics_json: Mapped[dict] = mapped_column(
        JSON, nullable=False, doc="Calculated live metrics e.g. accuracy, f1, precision"
    )
    baseline_metrics_json: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, doc="Baseline evaluation metrics from Model Registry"
    )
    degraded: Mapped[bool] = mapped_column(
        Boolean, default=False, nullable=False, doc="True if metric dropped beyond threshold"
    )


class PredictionFeedback(Base, UUIDMixin, TimestampMixin):
    """Ground-truth feedback label matched to an inference prediction ID."""

    __tablename__ = "prediction_feedback"

    deployment_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("deployments.id", ondelete="CASCADE"), nullable=False, index=True
    )
    prediction_id: Mapped[str] = mapped_column(
        String(128), nullable=False, index=True, doc="Unique identifier of inference record"
    )
    ground_truth: Mapped[Any] = mapped_column(
        JSON, nullable=False, doc="Actual observed outcome or ground-truth label"
    )
    predicted_value: Mapped[Any] = mapped_column(
        JSON, nullable=True, doc="Model prediction recorded at inference time"
    )
    latency_ms: Mapped[float | None] = mapped_column(Float, nullable=True)
