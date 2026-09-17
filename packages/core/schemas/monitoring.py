"""Pydantic v2 schemas for Monitoring and Data Quality."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

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
    drift_threshold: float = Field(0.20, ge=0.01, le=1.0)
    sample_limit: int = Field(5000, ge=50, le=100000)


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
    ground_truth: Any
    predicted_value: Optional[Any] = None
    latency_ms: Optional[float] = None


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
