"""Pydantic v2 schemas for Monitoring and Data Quality."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, model_validator

from packages.core.models.monitoring import DataQualityStatus, DriftSeverity


class DataQualityRuleConfig(BaseModel):
    """Configurable thresholds for data quality checks."""

    max_null_percentage: float = Field(5.0, ge=0.0, le=100.0)
    max_duplicate_percentage: float = Field(1.0, ge=0.0, le=100.0)
    required_columns: list[str] | None = None
    column_ranges: dict[str, dict[str, float]] | None = None


class DataQualityReportResponse(BaseModel):
    id: str
    dataset_id: str
    score: float
    status: DataQualityStatus
    rows_count: int
    cols_count: int
    null_percentage: float
    duplicate_percentage: float
    failed_constraints: list[dict[str, Any]] | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DriftCheckRequest(BaseModel):
    model_name: str
    deployment_id: str | None = None
    reference_dataset_id: str | None = None
    current_dataset_id: str | None = None
    drift_threshold: float = Field(0.20, ge=0.01, le=1.0)
    sample_limit: int = Field(5000, ge=50, le=100000)

    @model_validator(mode="before")
    @classmethod
    def handle_threshold_alias(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "threshold" in data and "drift_threshold" not in data:
                data["drift_threshold"] = data["threshold"]
        return data

    @property
    def threshold(self) -> float:
        return self.drift_threshold


class DriftEvaluationResponse(BaseModel):
    id: str
    model_name: str
    deployment_id: str | None
    drift_share: float
    drift_status: DriftSeverity
    drifted_features: list[str] | None = None
    metrics: dict[str, Any] | None = None
    html_report_path: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackRequest(BaseModel):
    """Delayed feedback ground-truth label ingestion."""

    prediction_id: str
    ground_truth: Any | None = None
    actual_label: Any | None = None
    deployment_id: str | None = None
    predicted_value: Any | None = None
    latency_ms: float | None = None

    @model_validator(mode="before")
    @classmethod
    def handle_actual_label_alias(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if "actual_label" in data and "ground_truth" not in data:
                data["ground_truth"] = data["actual_label"]
            elif "ground_truth" in data and "actual_label" not in data:
                data["actual_label"] = data["ground_truth"]
        return data


class ModelPerformanceResponse(BaseModel):
    id: str
    model_name: str
    deployment_id: str | None
    task_type: str
    sample_count: int
    metrics: dict[str, Any]
    baseline_metrics: dict[str, Any] | None = None
    degraded: bool
    created_at: datetime

    model_config = {"from_attributes": True}
