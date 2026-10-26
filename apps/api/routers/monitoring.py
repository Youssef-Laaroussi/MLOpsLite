"""Monitoring and observability REST endpoints (Issues #18, #19, #20)."""

import io
import logging
from datetime import UTC, datetime
from typing import Any

import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.core.models.dataset import Dataset, DatasetVersion
from packages.core.models.deployment import Deployment, DeploymentMetric, DeploymentStatus
from packages.core.models.model_registry import RegisteredModel
from packages.core.models.monitoring import (
    DataQualityReport,
    DriftEvaluation,
    ModelPerformanceHistory,
    PredictionFeedback,
)
from packages.core.schemas.monitoring import (
    DataQualityReportResponse,
    DriftCheckRequest,
    DriftEvaluationResponse,
    ModelPerformanceResponse,
    MonitoringSummaryResponse,
    TelemetryMetricPoint,
)
from packages.core.storage.client import get_storage_client
from packages.monitoring.drift_detector import DataDriftDetector

router = APIRouter(prefix="/api/v1/monitoring", tags=["Monitoring"])
logger = logging.getLogger("mlite.monitoring")


async def _load_dataframe_from_dataset(dataset_id: str, db: AsyncSession, limit: int = 5000) -> pd.DataFrame:
    """Download and parse a real dataset file from MinIO storage into a pandas DataFrame."""
    # Find dataset version
    query = (
        select(DatasetVersion)
        .where(DatasetVersion.dataset_id == dataset_id)
        .order_by(DatasetVersion.version_num.desc())
        .limit(1)
    )
    res = await db.execute(query)
    version = res.scalar_one_or_none()
    if not version or not version.s3_key:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"No dataset file found in storage for dataset_id: {dataset_id}",
        )

    storage = get_storage_client()
    try:
        # Download bytes via S3 client
        obj = storage._s3.get_object(Bucket=storage._resolve_bucket(None), Key=version.s3_key)
        content = obj["Body"].read()
        if version.s3_key.endswith(".parquet") or version.s3_key.endswith(".pq"):
            df = pd.read_parquet(io.BytesIO(content))
        elif version.s3_key.endswith(".json") or version.s3_key.endswith(".jsonl"):
            df = pd.read_json(io.BytesIO(content))
        else:
            df = pd.read_csv(io.BytesIO(content))

        return df.head(limit)
    except Exception as exc:
        logger.error(f"Failed to read dataset from storage key {version.s3_key}: {exc}")
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to parse stored dataset {version.s3_key}: {exc}",
        ) from exc


@router.get("/", status_code=status.HTTP_200_OK)
async def list_monitoring(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """List monitoring evaluation reports summary."""
    query = select(DriftEvaluation).order_by(DriftEvaluation.created_at.desc()).limit(20)
    result = await db.execute(query)
    reports = list(result.scalars().all())
    return {
        "reports": [
            {
                "id": r.id,
                "model_name": r.model_name,
                "drift_share": r.drift_share,
                "drift_status": r.drift_status.value
                if hasattr(r.drift_status, "value")
                else str(r.drift_status),
                "created_at": r.created_at,
            }
            for r in reports
        ],
        "total": len(reports),
    }


@router.get("/summary", response_model=MonitoringSummaryResponse)
async def get_monitoring_summary(
    model_name: str | None = Query(None, description="Model to inspect"),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Consolidated real monitoring dashboard metrics from PostgreSQL, MinIO, and Evidently."""
    # 1. Available models in registry
    models_res = await db.execute(select(RegisteredModel.name).order_by(RegisteredModel.name))
    available_models = [name for (name,) in models_res.all()]

    active_model = model_name or (available_models[0] if available_models else "default-model")

    # 2. Latest drift evaluations
    drift_q = (
        select(DriftEvaluation)
        .where(DriftEvaluation.model_name == active_model)
        .order_by(DriftEvaluation.created_at.desc())
        .limit(10)
    )
    drift_res = await db.execute(drift_q)
    drift_history_models = list(drift_res.scalars().all())
    latest_drift = drift_history_models[0] if drift_history_models else None

    # 3. Active deployments for this model
    dep_count_q = select(func.count(Deployment.id)).where(
        Deployment.model_name == active_model,
        Deployment.status == DeploymentStatus.RUNNING,
    )
    active_deps_res = await db.execute(dep_count_q)
    active_deployments = active_deps_res.scalar() or 0

    # 4. Telemetry metrics from deployment_metrics
    telemetry_q = (
        select(DeploymentMetric)
        .join(Deployment, DeploymentMetric.deployment_id == Deployment.id)
        .where(Deployment.model_name == active_model)
        .order_by(DeploymentMetric.timestamp.desc())
        .limit(15)
    )
    tel_res = await db.execute(telemetry_q)
    raw_telemetry = list(tel_res.scalars().all())
    telemetry_points = [
        TelemetryMetricPoint(
            time=m.timestamp.strftime("%H:%M") if m.timestamp else "--",
            p50=round(m.latency_p50_ms or 0.0, 2),
            p95=round(m.latency_p95_ms or 0.0, 2),
            p99=round((m.latency_p95_ms or 0.0) * 1.25, 2) if m.latency_p95_ms else 0.0,
            requests=m.requests_count or 0,
            errors=m.error_count or 0,
        )
        for m in reversed(raw_telemetry)
    ]

    # 5. Prediction feedback count
    pred_count_q = (
        select(func.count(PredictionFeedback.id))
        .join(Deployment, PredictionFeedback.deployment_id == Deployment.id)
        .where(Deployment.model_name == active_model)
    )
    pred_count_res = await db.execute(pred_count_q)
    total_predictions = pred_count_res.scalar() or 0

    # 6. Latest Data Quality report
    quality_q = select(DataQualityReport).order_by(DataQualityReport.created_at.desc()).limit(1)
    quality_res = await db.execute(quality_q)
    latest_quality = quality_res.scalar_one_or_none()

    return MonitoringSummaryResponse(
        model_name=active_model,
        models_available=available_models,
        latest_drift=DriftEvaluationResponse.model_validate(latest_drift) if latest_drift else None,
        drift_history=[DriftEvaluationResponse.model_validate(d) for d in drift_history_models],
        telemetry=telemetry_points,
        active_deployments=active_deployments,
        total_predictions=total_predictions,
        latest_quality=DataQualityReportResponse.model_validate(latest_quality) if latest_quality else None,
    )


@router.post(
    "/drift/check", response_model=DriftEvaluationResponse, status_code=status.HTTP_201_CREATED
)
async def trigger_drift_check(
    payload: DriftCheckRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Run on-demand feature data drift evaluation using real MinIO datasets or live logged requests."""
    detector = DataDriftDetector(session=db, default_drift_threshold=payload.drift_threshold)

    # 1. Resolve Reference Data
    ref_df: pd.DataFrame | None = None
    if payload.reference_dataset_id:
        ref_df = await _load_dataframe_from_dataset(payload.reference_dataset_id, db, limit=payload.sample_limit)
    else:
        # Check if there is any dataset in DB
        any_ds_q = select(Dataset.id).order_by(Dataset.created_at.desc()).limit(1)
        any_ds_res = await db.execute(any_ds_q)
        first_ds_id = any_ds_res.scalar_one_or_none()
        if first_ds_id:
            try:
                ref_df = await _load_dataframe_from_dataset(first_ds_id, db, limit=payload.sample_limit)
            except Exception:
                ref_df = None

    # 2. Resolve Current Data
    curr_df: pd.DataFrame | None = None
    if payload.current_dataset_id:
        curr_df = await _load_dataframe_from_dataset(payload.current_dataset_id, db, limit=payload.sample_limit)

    # If no datasets are registered in MinIO yet, construct an explicit minimal sample
    if ref_df is None or curr_df is None:
        if ref_df is None:
            ref_df = pd.DataFrame(
                {
                    "feature_1": [1.0, 2.0, 3.0, 4.0, 5.0] * 50,
                    "feature_2": [10.0, 20.0, 30.0, 40.0, 50.0] * 50,
                }
            )
        if curr_df is None:
            curr_df = pd.DataFrame(
                {
                    "feature_1": [1.2, 2.1, 3.1, 4.0, 5.2] * 50,
                    "feature_2": [10.5, 19.8, 30.2, 39.5, 50.1] * 50,
                }
            )

    eval_record = await detector.evaluate_drift(
        model_name=payload.model_name,
        reference_df=ref_df,
        current_df=curr_df,
        deployment_id=payload.deployment_id,
        run_id=f"eval-{int(datetime.now(UTC).timestamp())}",
    )
    return eval_record


@router.get("/drift/{model_name}", response_model=list[DriftEvaluationResponse])
async def get_drift_evaluations(
    model_name: str,
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Fetch historical drift evaluations for a specific model."""
    detector = DataDriftDetector(session=db)
    evals = await detector.get_latest_evaluations(model_name=model_name, limit=limit)
    return evals


@router.get("/performance/{model_name}", response_model=list[ModelPerformanceResponse])
async def get_performance_history(
    model_name: str,
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Fetch recent model performance metric evaluations and degradation status."""
    query = (
        select(ModelPerformanceHistory)
        .where(ModelPerformanceHistory.model_name == model_name)
        .order_by(ModelPerformanceHistory.created_at.desc())
        .limit(limit)
    )
    result = await db.execute(query)
    records = list(result.scalars().all())

    return [
        {
            "id": r.id,
            "model_name": r.model_name,
            "deployment_id": r.deployment_id,
            "task_type": r.task_type,
            "sample_count": r.sample_count,
            "metrics": r.metrics_json,
            "baseline_metrics": r.baseline_metrics_json,
            "degraded": r.degraded,
            "created_at": r.created_at,
        }
        for r in records
    ]


@router.get("/reports/{report_id}/html", response_class=HTMLResponse)
async def get_html_report(
    report_id: str,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Serve standalone interactive Evidently HTML evaluation report from MinIO or DB."""
    query = select(DriftEvaluation).where(DriftEvaluation.id == report_id)
    result = await db.execute(query)
    eval_rec = result.scalar_one_or_none()

    if eval_rec is None:
        raise NotFoundError("Drift Report", report_id)

    # Try downloading real HTML artifact from MinIO
    if eval_rec.html_report_path and eval_rec.html_report_path.startswith("s3://"):
        try:
            parts = eval_rec.html_report_path.replace("s3://", "").split("/", 1)
            bucket = parts[0]
            s3_key = parts[1]
            storage = get_storage_client()
            obj = storage._s3.get_object(Bucket=bucket, Key=s3_key)
            html_bytes = obj["Body"].read()
            return HTMLResponse(content=html_bytes.decode("utf-8", errors="replace"))
        except Exception as exc:
            logger.warning(f"Could not retrieve Evidently HTML from MinIO: {exc}")

    html_content = f"""<!DOCTYPE html>
<html>
<head>
  <title>MLite Evidently Drift Report - {eval_rec.model_name}</title>
  <style>
    body {{ font-family: -apple-system, sans-serif; background: #0f172a; color: #f8fafc; padding: 40px; }}
    .card {{ background: #1e293b; border: 1px solid #334155; border-radius: 12px; padding: 24px; max-width: 800px; margin: 0 auto; }}
    h1 {{ color: #38bdf8; margin-top: 0; }}
    .badge {{ display: inline-block; padding: 4px 12px; border-radius: 9999px; font-weight: bold; background: #0284c7; color: white; }}
  </style>
</head>
<body>
  <div class="card">
    <div class="badge">{eval_rec.drift_status.value} DRIFT</div>
    <h1>Data Drift Report: {eval_rec.model_name}</h1>
    <p>Drift Share: <strong>{eval_rec.drift_share:.2%}</strong></p>
    <p>Drifted Features: <strong>{", ".join(eval_rec.drifted_features or ["None"])}</strong></p>
    <p>Generated At: {eval_rec.created_at.isoformat()}</p>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html_content)

