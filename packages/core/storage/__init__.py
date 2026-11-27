"""MLite Storage package providing S3/MinIO client abstractions."""

from .client import StorageClient, get_storage_client

__all__ = [
    "StorageClient",
    "get_storage_client",
]
