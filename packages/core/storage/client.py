"""S3-compatible object storage client for MinIO and cloud object stores."""

import hashlib
import os
from pathlib import Path
from typing import Any

import boto3
from botocore.client import Config
from botocore.exceptions import ClientError


class StorageError(Exception):
    """Base exception for storage client errors."""


class StorageClient:
    """Lightweight, resilient S3-compatible client for MinIO storage operations."""

    def __init__(
        self,
        endpoint_url: str | None = None,
        access_key: str | None = None,
        secret_key: str | None = None,
        region_name: str | None = None,
        default_bucket: str | None = None,
    ) -> None:
        self.endpoint_url = endpoint_url or os.getenv(
            "MINIO_ENDPOINT",
            os.getenv("S3_ENDPOINT_URL", "http://localhost:9000"),
        )
        self.access_key = access_key or os.getenv(
            "AWS_ACCESS_KEY_ID",
            os.getenv("MINIO_ROOT_USER", "mlite_minio_admin"),
        )
        self.secret_key = secret_key or os.getenv(
            "AWS_SECRET_ACCESS_KEY",
            os.getenv("MINIO_ROOT_PASSWORD", "mlite_minio_password"),
        )
        self.region_name = region_name or os.getenv("AWS_DEFAULT_REGION", "us-east-1")
        self.default_bucket = default_bucket or os.getenv(
            "MINIO_DATASETS_BUCKET", "mlite-datasets"
        )

        # Configure boto3 S3 client for MinIO path-style addressing
        self._s3 = boto3.client(
            "s3",
            endpoint_url=self.endpoint_url,
            aws_access_key_id=self.access_key,
            aws_secret_access_key=self.secret_key,
            region_name=self.region_name,
            config=Config(
                signature_version="s3v4",
                s3={"addressing_style": "path"},
                retries={"max_attempts": 3, "mode": "standard"},
            ),
        )

    @staticmethod
    def compute_sha256(file_path: str | Path) -> str:
        """Compute SHA-256 hash of a local file in streaming 64KB chunks."""
        path = Path(file_path)
        if not path.is_file():
            raise FileNotFoundError(f"File not found: {file_path}")

        hasher = hashlib.sha256()
        with open(path, "rb") as f:
            while chunk := f.read(65536):
                hasher.update(chunk)
        return hasher.hexdigest()

    def _resolve_bucket(self, bucket_name: str | None) -> str:
        """Resolve bucket name using explicit override or default bucket."""
        return bucket_name or self.default_bucket or "mlite-datasets"

    def upload_file(
        self,
        local_path: str | Path,
        s3_key: str,
        bucket_name: str | None = None,
        *,
        overwrite: bool = True,
    ) -> dict[str, Any]:
        """Upload a local file to MinIO/S3 and return metadata with SHA-256 hash."""
        path = Path(local_path)
        if not path.is_file():
            raise FileNotFoundError(f"Local file does not exist: {local_path}")

        bucket = self._resolve_bucket(bucket_name)
        sha256_hash = self.compute_sha256(path)
        file_size = path.stat().st_size

        try:
            with open(path, "rb") as data:
                self._s3.put_object(
                    Bucket=bucket,
                    Key=s3_key,
                    Body=data,
                    Metadata={"sha256": sha256_hash},
                    **({} if overwrite else {"IfNoneMatch": "*"}),
                )
        except ClientError as e:
            raise StorageError(f"Failed to upload {local_path} to {bucket}/{s3_key}: {e}") from e

        return {
            "bucket": bucket,
            "s3_key": s3_key,
            "s3_uri": f"s3://{bucket}/{s3_key}",
            "sha256": sha256_hash,
            "size_bytes": file_size,
        }

    def download_file(
        self,
        s3_key: str,
        local_path: str | Path,
        bucket_name: str | None = None,
    ) -> Path:
        """Download an S3 object to a destination on local disk."""
        dest = Path(local_path)
        dest.parent.mkdir(parents=True, exist_ok=True)
        bucket = self._resolve_bucket(bucket_name)

        try:
            self._s3.download_file(bucket, s3_key, str(dest))
        except ClientError as e:
            raise StorageError(f"Failed to download {bucket}/{s3_key} to {dest}: {e}") from e

        return dest

    def generate_presigned_url(
        self,
        s3_key: str,
        bucket_name: str | None = None,
        expiration_seconds: int = 3600,
    ) -> str:
        """Generate a presigned GET URL for secure, direct object retrieval."""
        bucket = self._resolve_bucket(bucket_name)
        try:
            url: str = self._s3.generate_presigned_url(
                ClientMethod="get_object",
                Params={"Bucket": bucket, "Key": s3_key},
                ExpiresIn=expiration_seconds,
            )
            return url
        except ClientError as e:
            raise StorageError(f"Failed to generate presigned URL for {bucket}/{s3_key}: {e}") from e

    def file_exists(self, s3_key: str, bucket_name: str | None = None) -> bool:
        """Check whether an object exists in the designated bucket."""
        bucket = self._resolve_bucket(bucket_name)
        try:
            self._s3.head_object(Bucket=bucket, Key=s3_key)
            return True
        except ClientError as e:
            if e.response.get("Error", {}).get("Code") in ("404", "NoSuchKey", "NotFound"):
                return False
            raise StorageError(f"Error checking existence of {bucket}/{s3_key}: {e}") from e

    def delete_file(self, s3_key: str, bucket_name: str | None = None) -> bool:
        """Delete an object from MinIO/S3."""
        bucket = self._resolve_bucket(bucket_name)
        try:
            self._s3.delete_object(Bucket=bucket, Key=s3_key)
            return True
        except ClientError as e:
            raise StorageError(f"Failed to delete {bucket}/{s3_key}: {e}") from e

    def list_files(self, prefix: str = "", bucket_name: str | None = None) -> list[str]:
        """List object keys under a given prefix."""
        bucket = self._resolve_bucket(bucket_name)
        try:
            pages = self._s3.get_paginator("list_objects_v2").paginate(Bucket=bucket, Prefix=prefix)
            return [item["Key"] for page in pages for item in page.get("Contents", [])]
        except ClientError as e:
            raise StorageError(f"Failed to list objects in {bucket}: {e}") from e

    def list_objects(self, prefix: str = "", bucket_name: str | None = None) -> list[str]:
        """Alias for list_files."""
        return self.list_files(prefix=prefix, bucket_name=bucket_name)

    def object_sha256(self, key: str, bucket_name: str | None = None) -> str:
        """Verify stored bytes rather than trusting ETags or user metadata."""
        body = self._s3.get_object(Bucket=self._resolve_bucket(bucket_name), Key=key)["Body"]
        digest = hashlib.sha256()
        try:
            for chunk in body.iter_chunks(chunk_size=1024 * 1024):
                digest.update(chunk)
        finally:
            body.close()
        return digest.hexdigest()

    def bucket_exists(self, bucket_name: str | None = None) -> bool:
        """Check whether an S3/MinIO bucket exists."""
        bucket = self._resolve_bucket(bucket_name)
        try:
            self._s3.head_bucket(Bucket=bucket)
            return True
        except ClientError:
            return False

    def create_bucket(self, bucket_name: str | None = None) -> bool:
        """Create an S3/MinIO bucket if not present."""
        bucket = self._resolve_bucket(bucket_name)
        try:
            self._s3.create_bucket(Bucket=bucket)
            return True
        except ClientError as e:
            raise StorageError(f"Failed to create bucket {bucket}: {e}") from e


def get_storage_client() -> StorageClient:
    """Dependency / factory returning a singleton or preconfigured StorageClient."""
    return StorageClient()
