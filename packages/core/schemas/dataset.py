"""Pydantic v2 schemas for Dataset requests and responses."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field

from packages.core.models.dataset import DatasetFormat


class DatasetCreate(BaseModel):
    """Payload to register a new logical dataset."""

    name: str = Field(..., min_length=1, max_length=200, description="Dataset name")
    project_id: str | None = Field(None, description="Associated project UUID")
    format: DatasetFormat = Field(default=DatasetFormat.CSV, description="File format")
    description: str | None = Field(None, description="Dataset description")


class DatasetVersionCreate(BaseModel):
    """Metadata supplied when registering or uploading a new dataset version."""

    dataset_id: str | None = Field(None, description="Target dataset UUID")
    file_path: str | None = Field(None, description="Local path to file to upload and inspect")
    s3_key: str | None = Field(None, description="Pre-existing S3 key if already uploaded")
    description: str | None = Field(None, description="Version changelog/notes")
    row_count: int | None = Field(None, description="Row count")
    column_count: int | None = Field(None, description="Column count")
    size_bytes: int | None = Field(None, description="File size in bytes")
    sha256_hash: str | None = Field(None, description="SHA-256 hash")


class DatasetVersionResponse(BaseModel):
    """Detailed response for a single dataset version."""

    id: str
    dataset_id: str
    version_num: int
    hash_sha256: str
    row_count: int
    column_count: int
    size_bytes: int
    schema_json: dict[str, Any] | None = None  # type: ignore[assignment]
    s3_key: str | None = None
    description: str | None = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DatasetResponse(BaseModel):
    """Detailed response for a dataset including latest version info."""

    id: str
    project_id: str | None
    name: str
    format: DatasetFormat
    description: str | None
    created_at: datetime
    updated_at: datetime
    latest_version: DatasetVersionResponse | None = None

    model_config = {"from_attributes": True}


class DatasetListResponse(BaseModel):
    """Listing of registered datasets."""

    datasets: list[DatasetResponse]
    total: int


class DatasetInspectionResponse(BaseModel):
    """Inferred schema and statistical summary of a tabular file."""

    hash_sha256: str
    format: str
    row_count: int
    column_count: int
    size_bytes: int
    columns: list[dict[str, Any]]
    sample_records: list[dict[str, Any]]
