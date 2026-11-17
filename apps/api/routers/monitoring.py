"""Monitoring and observability REST endpoints (Issues #18, #19, #20)."""

import asyncio
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
from packages.core.models.dataset import DatasetVersion
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

    def read_dataset() -> pd.DataFrame:
        storage = get_storage_client()
        location = version.s3_key
        if location.startswith("s3://"):
            bucket, _, key = location[5:].partition("/")
        else:
            bucket, key = storage.default_bucket, location
        body = storage._s3.get_object(Bucket=bucket, Key=key)["Body"]
        try:
            content = io.BytesIO(body.read())
        finally:
            body.close()
        if key.lower().endswith((".parquet", ".pq")):
            return pd.read_parquet(content).head(limit)
        if key.lower().endswith((".json", ".jsonl")):
            return pd.read_json(content, lines=key.lower().endswith(".jsonl")).head(limit)
        return pd.read_csv(content, nrows=limit)

    try:
        return await asyncio.to_thread(read_dataset)
    except Exception as exc:
        logger.warning("Could not read dataset %s: %s", dataset_id, type(exc).__name__)
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Could not read dataset {dataset_id} from storage.",
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
        .where(Deployment.model_name == active_model, DeploymentMetric.requests_count > 0)
        .order_by(DeploymentMetric.timestamp.desc())
        .limit(15)
    )
    tel_res = await db.execute(telemetry_q)
    raw_telemetry = list(tel_res.scalars().all())
    telemetry_points = [
        TelemetryMetricPoint(
            time=m.timestamp.strftime("%b %d, %H:%M UTC") if m.timestamp else "--",
            p50=round(m.latency_p50_ms, 3) if m.latency_p50_ms is not None else None,
            p95=round(m.latency_p95_ms, 3) if m.latency_p95_ms is not None else None,
            p99=None,
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
    """Compare the latest versions of two explicitly selected datasets."""
    ref_df = await _load_dataframe_from_dataset(payload.reference_dataset_id, db, limit=payload.sample_limit)
    curr_df = (
        ref_df.copy()
        if payload.current_dataset_id == payload.reference_dataset_id
        else await _load_dataframe_from_dataset(payload.current_dataset_id, db, limit=payload.sample_limit)
    )
    if ref_df.empty or curr_df.empty or not set(ref_df.columns).intersection(curr_df.columns):
        raise HTTPException(422, "Both datasets must contain rows and share at least one column.")

    detector = DataDriftDetector(session=db, default_drift_threshold=payload.drift_threshold)
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

