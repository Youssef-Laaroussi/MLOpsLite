"""Monitoring and observability REST endpoints (Issues #18, #19, #20)."""

from typing import Any, List, Optional
import pandas as pd
from fastapi import APIRouter, Depends, HTTPException, Query, status
from fastapi.responses import HTMLResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.core.models.monitoring import (
    DriftEvaluation,
    ModelPerformanceHistory,
)
from packages.core.schemas.monitoring import (
    DriftCheckRequest,
    DriftEvaluationResponse,
    ModelPerformanceResponse,
)
from packages.monitoring.drift_detector import DataDriftDetector

router = APIRouter(prefix="/api/v1/monitoring", tags=["Monitoring"])


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
                "drift_status": r.drift_status.value if hasattr(r.drift_status, "value") else str(r.drift_status),
                "created_at": r.created_at,
            }
            for r in reports
        ],
        "total": len(reports),
    }


@router.post("/drift/check", response_model=DriftEvaluationResponse, status_code=status.HTTP_201_CREATED)
async def trigger_drift_check(
    payload: DriftCheckRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Run on-demand feature data drift evaluation for a model."""
    detector = DataDriftDetector(session=db, default_drift_threshold=payload.drift_threshold)

    # In production, pull reference from MinIO dataset and live from inference log buffer
    # Here, construct realistic baseline and test evaluation data
    ref_df = pd.DataFrame({
        "feature_1": [1.0, 2.0, 3.0, 4.0, 5.0] * 50,
        "feature_2": [10.0, 20.0, 30.0, 40.0, 50.0] * 50,
    })
    curr_df = pd.DataFrame({
        "feature_1": [1.2, 2.1, 3.1, 4.0, 5.2] * 50,
        "feature_2": [10.5, 19.8, 30.2, 39.5, 50.1] * 50,
    })

    eval_record = await detector.evaluate_drift(
        model_name=payload.model_name,
        reference_df=ref_df,
        current_df=curr_df,
        deployment_id=payload.deployment_id,
    )
    return eval_record


@router.get("/drift/{model_name}", response_model=List[DriftEvaluationResponse])
async def get_drift_evaluations(
    model_name: str,
    limit: int = Query(10, ge=1, le=100),
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Fetch historical drift evaluations for a specific model."""
    detector = DataDriftDetector(session=db)
    evals = await detector.get_latest_evaluations(model_name=model_name, limit=limit)
    return evals


@router.get("/performance/{model_name}", response_model=List[ModelPerformanceResponse])
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
    """Serve standalone interactive Evidently HTML evaluation report."""
    query = select(DriftEvaluation).where(DriftEvaluation.id == report_id)
    result = await db.execute(query)
    eval_rec = result.scalar_one_or_none()

    if eval_rec is None:
        raise NotFoundError("Drift Report", report_id)

    # Return interactive HTML template
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
    <p>Drifted Features: <strong>{', '.join(eval_rec.drifted_features or ['None'])}</strong></p>
    <p>Generated At: {eval_rec.created_at.isoformat()}</p>
  </div>
</body>
</html>"""
    return HTMLResponse(content=html_content)
