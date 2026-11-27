"""Dataset management REST endpoints (Issue #15).

Provides dataset registration, schema extraction, MinIO synchronization, and versioning.
"""

import shutil
import tempfile
from pathlib import Path
from typing import Any

from fastapi import APIRouter, Depends, File, Form, HTTPException, Query, UploadFile, status
from sqlalchemy import select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import ConflictError, NotFoundError
from packages.core.models.monitoring import DataQualityReport
from packages.core.models.user import User, UserRole
from packages.core.schemas.dataset import (
    DatasetCreate,
    DatasetInspectionResponse,
    DatasetListResponse,
    DatasetResponse,
    DatasetVersionCreate,
    DatasetVersionResponse,
)
from packages.core.schemas.monitoring import DataQualityReportResponse
from packages.core.security.dependencies import get_current_user, require_role
from packages.data.parser import TabularDataParser
from packages.data.service import DatasetService

router = APIRouter(prefix="/api/v1/datasets", tags=["Datasets"])


def _get_service(session: AsyncSession = Depends(get_db)) -> DatasetService:
    return DatasetService(session)


async def _dataset_response(dataset: Any, user: User, service: DatasetService) -> DatasetResponse:
    response = DatasetResponse.model_validate(dataset)
    response.has_storage_reference = bool(response.s3_key or (response.latest_version and response.latest_version.s3_key))
    report = (await service.session.execute(select(DataQualityReport).where(
        DataQualityReport.dataset_id == dataset.id,
    ).order_by(DataQualityReport.created_at.desc()).limit(1))).scalar_one_or_none()
    if report and (not response.latest_version or report.created_at >= response.latest_version.created_at):
        response.quality_score = report.score
        response.quality_report = DataQualityReportResponse.model_validate(report)
    if user.role != UserRole.ADMIN:
        response.s3_key = None
        if response.latest_version is not None:
            response.latest_version.s3_key = None
    return response


def _version_response(version: Any, user: User) -> DatasetVersionResponse:
    response = DatasetVersionResponse.model_validate(version)
    if user.role != UserRole.ADMIN:
        response.s3_key = None
    return response


@router.post("/", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_dataset(
    payload: DatasetCreate,
    current_user: User = Depends(get_current_user),
    service: DatasetService = Depends(_get_service),
) -> Any:
    """Register a new logical dataset."""
    if await service.dataset_name_exists(payload.name, payload.project_id):
        raise ConflictError(f'A dataset named "{payload.name}" already exists in this workspace.')
    try:
        dataset = await service.create_dataset(
            name=payload.name,
            project_id=payload.project_id,
            format=payload.format,
            description=payload.description,
        )
    except IntegrityError as exc:
        if getattr(exc.orig, "sqlstate", None) != "23505":
            raise
        raise ConflictError(f'A dataset named "{payload.name}" already exists.') from exc
    return await _dataset_response(dataset, current_user, service)


@router.get("/", response_model=DatasetListResponse)
async def list_datasets(
    project_id: str | None = Query(None, description="Filter by project UUID"),
    current_user: User = Depends(get_current_user),
    service: DatasetService = Depends(_get_service),
) -> Any:
    """List registered datasets."""
    datasets = await service.list_datasets(project_id=project_id)
    return {
        "datasets": [await _dataset_response(dataset, current_user, service) for dataset in datasets],
        "total": len(datasets),
    }


@router.get("/inspect", response_model=DatasetInspectionResponse, dependencies=[Depends(require_role(UserRole.ADMIN))])
async def inspect_dataset(
    file_path: str = Query(..., description="Local path to CSV, Parquet, or JSON file"),
) -> Any:
    """Extract schema, column types, null counts, and row counts from a tabular file."""
    path = Path(file_path)
    if not path.is_file():
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"File not found: {file_path}",
        )
    try:
        return TabularDataParser.inspect(path)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Failed to inspect file: {exc}",
        )


@router.get("/{dataset_id}", response_model=DatasetResponse)
async def get_dataset(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    service: DatasetService = Depends(_get_service),
) -> Any:
    """Get metadata for a specific dataset."""
    dataset = await service.get_dataset(dataset_id)
    if dataset is None:
        raise NotFoundError("Dataset", dataset_id)
    return await _dataset_response(dataset, current_user, service)


@router.post(
    "/{dataset_id}/versions",
    response_model=DatasetVersionResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_dataset_version(
    dataset_id: str,
    payload: DatasetVersionCreate,
    current_user: User = Depends(get_current_user),
    service: DatasetService = Depends(_get_service),
) -> Any:
    """Upload and register a new version for a dataset."""
    if payload.file_path and current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Server file paths are reserved for installation administrators. Upload your file instead.")
    if payload.s3_key:
        prefix = f"users/{current_user.id}/datasets/{dataset_id}/"
        key = payload.s3_key
        if key.startswith("s3://"):
            bucket, _, key = key[5:].partition("/")
            if bucket != service.storage.default_bucket:
                raise HTTPException(422, "Choose an object in your dataset's private storage prefix.")
        if not key.startswith(prefix) or ".." in Path(key).parts:
            raise HTTPException(422, "Choose an object in your dataset's private storage prefix.")
    try:
        version = await service.register_version(
            dataset_id=dataset_id,
            file_path=payload.file_path,
            s3_key=payload.s3_key,
            description=payload.description,
        )
        return _version_response(version, current_user)
    except ValueError:
        raise NotFoundError("Dataset", dataset_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Version registration failed: {exc}",
        )


@router.get("/{dataset_id}/versions", response_model=list[DatasetVersionResponse])
async def list_dataset_versions(
    dataset_id: str,
    current_user: User = Depends(get_current_user),
    service: DatasetService = Depends(_get_service),
) -> Any:
    """List all versions for a given dataset."""
    dataset = await service.get_dataset(dataset_id)
    if dataset is None:
        raise NotFoundError("Dataset", dataset_id)

    versions = await service.get_versions(dataset_id)
    return [_version_response(version, current_user) for version in versions]


@router.post(
    "/{dataset_id}/validate",
    response_model=DataQualityReportResponse,
    status_code=status.HTTP_201_CREATED,
)
async def validate_dataset(
    dataset_id: str,
    file_path: str | None = Query(None, description="Optional explicit file path to validate"),
    max_null_pct: float = Query(5.0, ge=0.0, le=100.0),
    max_dup_pct: float = Query(1.0, ge=0.0, le=100.0),
    service: DatasetService = Depends(_get_service),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Run automated data quality checks and persist validation report."""
    from packages.core.models.monitoring import DataQualityReport, DataQualityStatus
    from packages.monitoring.quality import DataQualityEngine

    if file_path and current_user.role != UserRole.ADMIN:
        raise HTTPException(403, "Server file paths are reserved for installation administrators.")

    dataset = await service.get_dataset(dataset_id)
    if dataset is None:
        raise NotFoundError("Dataset", dataset_id)

    # Upload staging files are removed immediately. Validate the persisted object,
    # preserving its suffix so CSV, JSON and Parquet are parsed correctly.
    with tempfile.TemporaryDirectory(prefix="mlite-quality-") as directory:
        target_file = file_path
        if not target_file:
            versions = await service.get_versions(dataset_id)
            if not versions or not versions[0].s3_key:
                raise HTTPException(status_code=400, detail="No stored dataset version available to validate")
            location = versions[0].s3_key
            bucket = service.storage.default_bucket
            key = location
            if location.startswith("s3://"):
                bucket, _, key = location[5:].partition("/")
            target_file = str(Path(directory) / ("dataset" + Path(key).suffix))
            try:
                service.storage.download_file(key, target_file, bucket_name=bucket)
            except Exception as exc:
                raise HTTPException(502, "Could not download the stored dataset for validation.") from exc

        eval_result = DataQualityEngine.evaluate(
            file_path=target_file,
            max_null_pct=max_null_pct,
            max_dup_pct=max_dup_pct,
        )

    report = DataQualityReport(
        dataset_id=dataset.id,
        score=eval_result["score"],
        status=DataQualityStatus(eval_result["status"]),
        rows_count=eval_result["rows_count"],
        cols_count=eval_result["cols_count"],
        null_percentage=eval_result["null_percentage"],
        duplicate_percentage=eval_result["duplicate_percentage"],
        failed_constraints=eval_result["failed_constraints"],
        report_json=eval_result,
    )
    db.add(report)
    await db.flush()
    await db.refresh(report)
    return report



@router.post("/{dataset_id}/upload", response_model=DatasetVersionResponse, status_code=status.HTTP_201_CREATED)
async def upload_dataset_file(
    dataset_id: str,
    file: UploadFile = File(..., description="CSV, Parquet, or JSON tabular data file"),
    description: str | None = Form(None),
    current_user: User = Depends(get_current_user),
    service: DatasetService = Depends(_get_service),
) -> Any:
    """Upload a real data file, extract schema, hash SHA-256, store in MinIO S3, and create a version."""
    dataset = await service.get_dataset(dataset_id)
    if dataset is None:
        raise NotFoundError("Dataset", dataset_id)

    # Save uploaded bytes to a temporary staging file
    suffix = Path(file.filename or "data.csv").suffix
    with tempfile.NamedTemporaryFile(delete=False, suffix=suffix) as tmp:
        tmp_path = Path(tmp.name)
        shutil.copyfileobj(file.file, tmp)

    try:
        version = await service.register_version(
            dataset_id=dataset_id,
            file_path=tmp_path,
            description=description or f"Uploaded {file.filename}",
        )
        return _version_response(version, current_user)
    finally:
        if tmp_path.exists():
            tmp_path.unlink()


@router.get("/dvc/status", dependencies=[Depends(require_role(UserRole.ADMIN))])
async def get_dvc_status() -> dict[str, Any]:
    """Return DVC configuration and local CLI availability to administrators."""
    from packages.data.dvc_manager import DVCManager
    mgr = DVCManager()
    return {
        "is_installed": mgr.is_dvc_installed,
        "remote_name": mgr.DEFAULT_REMOTE_NAME,
        "remote_bucket": mgr.DEFAULT_BUCKET,
        "remote_prefix": mgr.DEFAULT_PREFIX,
        "minio_endpoint": mgr.minio_endpoint,
        "dvc_dir_exists": (Path(".") / ".dvc").exists(),
    }


@router.delete("/{dataset_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_dataset(
    dataset_id: str,
    service: DatasetService = Depends(_get_service),
) -> None:
    """Delete a dataset and its versions."""
    deleted = await service.delete_dataset(dataset_id)
    if not deleted:
        raise NotFoundError("Dataset", dataset_id)

