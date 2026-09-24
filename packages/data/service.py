"""Dataset service — business logic for dataset registry, versioning, and MinIO storage."""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.dataset import (
    Dataset,
    DatasetVersion,
    DatasetFormat,
)
from packages.core.storage.client import StorageClient, get_storage_client
from packages.data.parser import TabularDataParser

logger = logging.getLogger(__name__)


class DatasetService:
    """Manages dataset records, version increments, and storage uploads."""

    def __init__(
        self,
        session: AsyncSession,
        storage_client: Optional[StorageClient] = None,
    ) -> None:
        self.session = session
        self.storage = storage_client or get_storage_client()

    async def create_dataset(
        self,
        name: str,
        project_id: Optional[str] = None,
        format: DatasetFormat = DatasetFormat.CSV,
        description: Optional[str] = None,
    ) -> Dataset:
        """Create a new dataset entry."""
        dataset = Dataset(
            name=name,
            project_id=project_id,
            format=format,
            description=description,
        )
        self.session.add(dataset)
        await self.session.flush()
        await self.session.refresh(dataset)
        return dataset

    async def register_version(
        self,
        dataset_id: str,
        file_path: Optional[str | Path] = None,
        s3_key: Optional[str] = None,
        description: Optional[str] = None,
    ) -> DatasetVersion:
        """Inspect schema, deduplicate via SHA-256, upload to MinIO, and create version."""
        dataset = await self.get_dataset(dataset_id)
        if dataset is None:
            raise ValueError(f"Dataset {dataset_id} not found")

        # 1. Parse metadata & SHA-256
        if file_path and Path(file_path).is_file():
            meta = TabularDataParser.inspect(file_path)
            sha256 = meta["hash_sha256"]
            row_count = meta["row_count"]
            column_count = meta["column_count"]
            size_bytes = meta["size_bytes"]
            schema_json = {"columns": meta["columns"]}
            filename = Path(file_path).name

            # 2. Upload to MinIO with content-addressed path
            target_key = s3_key or f"{dataset.name}/{sha256}/{filename}"
            try:
                # Content deduplication: check if already exists in storage
                if not self.storage.file_exists(target_key):
                    upload_res = self.storage.upload_file(file_path, target_key)
                    final_s3_key = upload_res["s3_uri"]
                else:
                    final_s3_key = f"s3://{self.storage.default_bucket}/{target_key}"
            except Exception as e:
                logger.warning("MinIO upload failed (proceeding with local key): %s", e)
                final_s3_key = f"s3://mlite-datasets/{target_key}"
        else:
            # Metadata only / remote registered file
            sha256 = "0" * 64
            row_count = 0
            column_count = 0
            size_bytes = 0
            schema_json = {}
            final_s3_key = s3_key or f"s3://mlite-datasets/{dataset.name}/v1"

        # 3. Determine next sequential version number
        v_res = await self.session.execute(
            select(func.max(DatasetVersion.version_num)).where(
                DatasetVersion.dataset_id == dataset.id
            )
        )
        max_ver = v_res.scalar() or 0
        next_version = max_ver + 1

        version = DatasetVersion(
            dataset_id=dataset.id,
            version_num=next_version,
            hash_sha256=sha256,
            row_count=row_count,
            column_count=column_count,
            size_bytes=size_bytes,
            schema_json=schema_json,
            s3_key=final_s3_key,
            description=description,
        )
        self.session.add(version)
        await self.session.flush()
        await self.session.refresh(version)
        return version

    async def list_datasets(
        self,
        project_id: Optional[str] = None,
    ) -> List[Dataset]:
        """List registered datasets, optionally filtered by project."""
        query = select(Dataset).order_by(Dataset.created_at.desc())
        if project_id:
            query = query.where(Dataset.project_id == project_id)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_dataset(self, dataset_id: str) -> Optional[Dataset]:
        """Fetch dataset by ID."""
        result = await self.session.execute(
            select(Dataset).where(Dataset.id == dataset_id)
        )
        return result.scalar_one_or_none()

    async def get_dataset_by_name(self, name: str, project_id: Optional[str] = None) -> Optional[Dataset]:
        """Fetch dataset by name."""
        query = select(Dataset).where(Dataset.name == name)
        if project_id:
            query = query.where(Dataset.project_id == project_id)
        result = await self.session.execute(query)
        return result.scalar_one_or_none()

    async def get_versions(self, dataset_id: str) -> List[DatasetVersion]:
        """Fetch all versions of a dataset ordered by version descending."""
        query = (
            select(DatasetVersion)
            .where(DatasetVersion.dataset_id == dataset_id)
            .order_by(DatasetVersion.version_num.desc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_version(self, dataset_id: str, version_num: int) -> Optional[DatasetVersion]:
        """Fetch specific version of a dataset."""
        query = select(DatasetVersion).where(
            DatasetVersion.dataset_id == dataset_id,
            DatasetVersion.version_num == version_num,
        )
        result = await self.session.execute(query)
        return result.scalar_one_or_none()
