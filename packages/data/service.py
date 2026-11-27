"""Dataset service — business logic for dataset registry, versioning, and MinIO storage."""

import logging
import tempfile
from pathlib import Path

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.errors import NotFoundError
from packages.core.models.dataset import (
    Dataset,
    DatasetFormat,
    DatasetVersion,
)
from packages.core.storage.client import StorageClient, get_storage_client
from packages.core.storage.layout import dataset_version_key, resource_prefix
from packages.data.parser import TabularDataParser

logger = logging.getLogger(__name__)


class DatasetService:
    """Manages dataset records, version increments, and storage uploads."""

    def __init__(
        self,
        session: AsyncSession,
        storage_client: StorageClient | None = None,
    ) -> None:
        self.session = session
        self.storage = storage_client or get_storage_client()

    async def dataset_name_exists(self, name: str, project_id: str | None) -> bool:
        """Check for a name in the same workspace or among unassigned datasets."""
        query = select(Dataset.id).where(Dataset.name == name, Dataset.project_id == project_id)
        return await self.session.scalar(query.limit(1)) is not None

    async def create_dataset(
        self,
        name: str,
        project_id: str | None = None,
        format: DatasetFormat = DatasetFormat.CSV,
        description: str | None = None,
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
        file_path: str | Path | None = None,
        s3_key: str | None = None,
        description: str | None = None,
        original_filename: str | None = None,
    ) -> DatasetVersion:
        """Store an immutable file under the dataset's stable version namespace."""
        dataset = await self.get_dataset(dataset_id)
        if dataset is None:
            raise NotFoundError("Dataset", dataset_id)

        if s3_key and file_path:
            raise ValueError("Choose a local file or an existing object, not both.")
        prefix = await resource_prefix(self.session, dataset, "datasets")
        if s3_key:
            bucket, key = self.storage.default_bucket, s3_key
            if key.startswith("s3://"):
                bucket, _, key = key[5:].partition("/")
            if bucket != self.storage.default_bucket or not key.startswith(prefix + "/") or ".." in Path(key).parts:
                raise ValueError("Choose an object in this dataset's private storage prefix.")
            with tempfile.TemporaryDirectory(prefix="mlite-version-") as directory:
                source = Path(directory) / ("data" + Path(key).suffix)
                self.storage.download_file(key, source, bucket_name=bucket)
                return await self.register_version(dataset_id, file_path=source, description=description,
                                                   original_filename=original_filename or Path(key).name)
        if not file_path or not Path(file_path).is_file():
            raise ValueError("An existing local file or stored dataset object is required.")

        # Serialize allocation so concurrent uploads cannot overwrite one version.
        await self.session.execute(select(Dataset.id).where(Dataset.id == dataset.id).with_for_update())
        v_res = await self.session.execute(select(func.max(DatasetVersion.version_num)).where(
            DatasetVersion.dataset_id == dataset.id,
        ))
        next_version = (v_res.scalar() or 0) + 1

        # 1. Parse metadata & SHA-256
        if file_path and Path(file_path).is_file():
            meta = TabularDataParser.inspect(file_path)
            sha256 = meta["hash_sha256"]
            row_count = meta["row_count"]
            column_count = meta["column_count"]
            size_bytes = meta["size_bytes"]
            schema_json = {"columns": meta["columns"]}
            filename = (original_filename or Path(file_path).name).replace("\\", "/").split("/")[-1][:255]

            target_key = dataset_version_key(prefix, next_version, filename)
            if self.storage.file_exists(target_key):
                if self.storage.object_sha256(target_key) != sha256:
                    raise ValueError("This stored version already contains different bytes.")
            else:
                self.storage.upload_file(file_path, target_key, overwrite=False)
            final_s3_key = f"s3://{self.storage.default_bucket}/{target_key}"

        version = DatasetVersion(
            dataset_id=dataset.id,
            version_num=next_version,
            original_filename=filename,
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
        project_id: str | None = None,
    ) -> list[Dataset]:
        """List registered datasets, optionally filtered by project, enriched with latest version details."""
        query = select(Dataset).order_by(Dataset.created_at.desc())
        if project_id:
            query = query.where(Dataset.project_id == project_id)
        result = await self.session.execute(query)
        datasets = list(result.scalars().all())

        if datasets:
            for d in datasets:
                versions = await self.get_versions(d.id)
                setattr(d, "versions_count", len(versions))
                if versions:
                    latest = versions[0]
                    setattr(d, "latest_version", latest)
                    setattr(d, "version_num", latest.version_num)
                    setattr(d, "row_count", latest.row_count)
                    setattr(d, "column_count", latest.column_count)
                    setattr(d, "size_bytes", latest.size_bytes)
                    setattr(d, "hash_sha256", latest.hash_sha256)
                    setattr(d, "s3_key", latest.s3_key)
                else:
                    setattr(d, "latest_version", None)
                    setattr(d, "version_num", None)
                    setattr(d, "row_count", 0)
                    setattr(d, "column_count", 0)
                    setattr(d, "size_bytes", 0)
                    setattr(d, "hash_sha256", None)
                    setattr(d, "s3_key", None)

        return datasets

    async def get_dataset(self, dataset_id: str) -> Dataset | None:
        """Fetch dataset by ID, enriched with latest version details."""
        result = await self.session.execute(select(Dataset).where(Dataset.id == dataset_id))
        d = result.scalar_one_or_none()
        if d:
            versions = await self.get_versions(d.id)
            setattr(d, "versions_count", len(versions))
            if versions:
                latest = versions[0]
                setattr(d, "latest_version", latest)
                setattr(d, "version_num", latest.version_num)
                setattr(d, "row_count", latest.row_count)
                setattr(d, "column_count", latest.column_count)
                setattr(d, "size_bytes", latest.size_bytes)
                setattr(d, "hash_sha256", latest.hash_sha256)
                setattr(d, "s3_key", latest.s3_key)
            else:
                setattr(d, "latest_version", None)
                setattr(d, "version_num", None)
                setattr(d, "row_count", 0)
                setattr(d, "column_count", 0)
                setattr(d, "size_bytes", 0)
                setattr(d, "hash_sha256", None)
                setattr(d, "s3_key", None)
        return d

    async def get_dataset_by_name(self, name: str, project_id: str | None = None) -> Dataset | None:
        """Fetch dataset by name."""
        query = select(Dataset).where(Dataset.name == name)
        if project_id:
            query = query.where(Dataset.project_id == project_id)
        result = await self.session.execute(query)
        d = result.scalar_one_or_none()
        if d:
            versions = await self.get_versions(d.id)
            setattr(d, "versions_count", len(versions))
            if versions:
                latest = versions[0]
                setattr(d, "latest_version", latest)
                setattr(d, "version_num", latest.version_num)
                setattr(d, "row_count", latest.row_count)
                setattr(d, "column_count", latest.column_count)
                setattr(d, "size_bytes", latest.size_bytes)
                setattr(d, "hash_sha256", latest.hash_sha256)
                setattr(d, "s3_key", latest.s3_key)
        return d


    async def get_versions(self, dataset_id: str) -> list[DatasetVersion]:
        """Fetch all versions of a dataset ordered by version descending."""
        query = (
            select(DatasetVersion)
            .where(DatasetVersion.dataset_id == dataset_id)
            .order_by(DatasetVersion.version_num.desc())
        )
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def delete_dataset(self, dataset_id: str) -> bool:
        """Delete a dataset and its versions from the database."""
        result = await self.session.execute(select(Dataset).where(Dataset.id == dataset_id))
        d = result.scalar_one_or_none()
        if not d:
            return False
        # Delete associated versions first
        versions = await self.get_versions(dataset_id)
        for v in versions:
            await self.session.delete(v)
        await self.session.delete(d)
        await self.session.commit()
        return True
