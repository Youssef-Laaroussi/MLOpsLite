"""Pydantic v2 schemas for Dataset requests and responses."""

from datetime import datetime
from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field

from packages.core.models.dataset import DatasetFormat


class DatasetCreate(BaseModel):
    """Payload to register a new logical dataset."""

    name: str = Field(..., min_length=1, max_length=200, description="Dataset name")
    project_id: Optional[str] = Field(None, description="Associated project UUID")
    format: DatasetFormat = Field(default=DatasetFormat.CSV, description="File format")
    description: Optional[str] = Field(None, description="Dataset description")


class DatasetVersionCreate(BaseModel):
    """Metadata supplied when registering or uploading a new dataset version."""

    dataset_id: str = Field(..., description="Target dataset UUID")
    file_path: Optional[str] = Field(None, description="Local path to file to upload and inspect")
    s3_key: Optional[str] = Field(None, description="Pre-existing S3 key if already uploaded")
    description: Optional[str] = Field(None, description="Version changelog/notes")


class DatasetVersionResponse(BaseModel):
    """Detailed response for a single dataset version."""

    id: str
    dataset_id: str
    version_num: int
    hash_sha256: str
    row_count: int
    column_count: int
    size_bytes: int
    schema_json: Optional[Dict[str, Any]] = None
    s3_key: Optional[str] = None
    description: Optional[str] = None
    created_at: datetime

    model_config = {"from_attributes": True}


class DatasetResponse(BaseModel):
    """Detailed response for a dataset including latest version info."""

    id: str
    project_id: Optional[str]
    name: str
    format: DatasetFormat
    description: Optional[str]
    created_at: datetime
    updated_at: datetime
    latest_version: Optional[DatasetVersionResponse] = None

    model_config = {"from_attributes": True}


class DatasetListResponse(BaseModel):
    """Listing of registered datasets."""

    datasets: List[DatasetResponse]
    total: int


class DatasetInspectionResponse(BaseModel):
    """Inferred schema and statistical summary of a tabular file."""

    hash_sha256: str
    format: str
    row_count: int
    column_count: int
    size_bytes: int
    columns: List[Dict[str, Any]]
    sample_records: List[Dict[str, Any]]
