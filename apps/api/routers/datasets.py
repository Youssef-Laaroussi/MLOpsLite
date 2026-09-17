"""Dataset management REST endpoints (Issue #15).

Provides dataset registration, schema extraction, MinIO synchronization, and versioning.
"""

from pathlib import Path
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.core.schemas.dataset import (
    DatasetCreate,
    DatasetResponse,
    DatasetListResponse,
    DatasetVersionCreate,
    DatasetVersionResponse,
    DatasetInspectionResponse,
)
from packages.data.parser import TabularDataParser
from packages.data.service import DatasetService

router = APIRouter(prefix="/api/v1/datasets", tags=["Datasets"])


def _get_service(session: AsyncSession = Depends(get_db)) -> DatasetService:
    return DatasetService(session)


@router.post("/", response_model=DatasetResponse, status_code=status.HTTP_201_CREATED)
async def create_dataset(
    payload: DatasetCreate,
    service: DatasetService = Depends(_get_service),
) -> Any:
    """Register a new logical dataset."""
    dataset = await service.create_dataset(
        name=payload.name,
        project_id=payload.project_id,
        format=payload.format,
        description=payload.description,
    )
    return dataset


@router.get("/", response_model=DatasetListResponse)
async def list_datasets(
    project_id: Optional[str] = Query(None, description="Filter by project UUID"),
    service: DatasetService = Depends(_get_service),
) -> Any:
    """List registered datasets."""
    datasets = await service.list_datasets(project_id=project_id)
    return {
        "datasets": datasets,
        "total": len(datasets),
    }


@router.get("/inspect", response_model=DatasetInspectionResponse)
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
    service: DatasetService = Depends(_get_service),
) -> Any:
    """Get metadata for a specific dataset."""
    dataset = await service.get_dataset(dataset_id)
    if dataset is None:
        raise NotFoundError("Dataset", dataset_id)
    return dataset


@router.post("/{dataset_id}/versions", response_model=DatasetVersionResponse, status_code=status.HTTP_201_CREATED)
async def create_dataset_version(
    dataset_id: str,
    payload: DatasetVersionCreate,
    service: DatasetService = Depends(_get_service),
) -> Any:
    """Upload and register a new version for a dataset."""
    try:
        version = await service.register_version(
            dataset_id=dataset_id,
            file_path=payload.file_path,
            s3_key=payload.s3_key,
            description=payload.description,
        )
        return version
    except ValueError as exc:
        raise NotFoundError("Dataset", dataset_id)
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Version registration failed: {exc}",
        )


@router.get("/{dataset_id}/versions", response_model=list[DatasetVersionResponse])
async def list_dataset_versions(
    dataset_id: str,
    service: DatasetService = Depends(_get_service),
) -> Any:
    """List all versions for a given dataset."""
    dataset = await service.get_dataset(dataset_id)
    if dataset is None:
        raise NotFoundError("Dataset", dataset_id)

    versions = await service.get_versions(dataset_id)
    return versions
