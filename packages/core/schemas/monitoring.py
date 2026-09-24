"""Pydantic v2 schemas for Monitoring and Data Quality."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator

from packages.core.models.monitoring import DataQualityStatus, DriftSeverity


class DataQualityRuleConfig(BaseModel):
    """Configurable thresholds for data quality checks."""

    max_null_percentage: float = Field(5.0, ge=0.0, le=100.0)
    max_duplicate_percentage: float = Field(1.0, ge=0.0, le=100.0)
    required_columns: Optional[List[str]] = None
    column_ranges: Optional[Dict[str, Dict[str, float]]] = None


class DataQualityReportResponse(BaseModel):
    id: str
    dataset_id: str
    score: float
    status: DataQualityStatus
    rows_count: int
    cols_count: int
    null_percentage: float
    duplicate_percentage: float
    failed_constraints: Optional[List[Dict[str, Any]]] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DriftCheckRequest(BaseModel):
    model_name: str
    deployment_id: Optional[str] = None
    reference_dataset_id: Optional[str] = None
    current_dataset_id: Optional[str] = None
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
    deployment_id: Optional[str]
    drift_share: float
    drift_status: DriftSeverity
    drifted_features: Optional[List[str]] = None
    metrics: Optional[Dict[str, Any]] = None
    html_report_path: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class FeedbackRequest(BaseModel):
    """Delayed feedback ground-truth label ingestion."""

    prediction_id: str
    ground_truth: Optional[Any] = None
    actual_label: Optional[Any] = None
    deployment_id: Optional[str] = None
    predicted_value: Optional[Any] = None
    latency_ms: Optional[float] = None

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
    deployment_id: Optional[str]
    task_type: str
    sample_count: int
    metrics: Dict[str, Any]
    baseline_metrics: Optional[Dict[str, Any]] = None
    degraded: bool
    created_at: datetime

    model_config = {"from_attributes": True}
