"""Administrator storage settings: read-only inventory and explicit bucket creation."""

import ipaddress
import logging
import re
from typing import Any
from urllib.parse import urlsplit, urlunsplit

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel, Field, field_validator

from apps.api.dependencies import get_storage
from packages.core.models.user import User, UserRole
from packages.core.security.dependencies import get_current_user, require_role
from packages.core.storage.client import StorageClient, StorageError

router = APIRouter(
    prefix="/api/v1/settings/storage", tags=["Storage Settings"],
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
logger = logging.getLogger(__name__)


class BucketCreate(BaseModel):
    name: str = Field(min_length=3, max_length=63)
    model_config = {"extra": "forbid"}

    @field_validator("name")
    @classmethod
    def valid_bucket_name(cls, value: str) -> str:
        if (
            not re.fullmatch(r"[a-z0-9][a-z0-9.-]*[a-z0-9]", value)
            or any(part in value for part in ("..", ".-", "-."))
            or value.startswith(("xn--", "sthree-", "amzn-s3-demo-"))
            or value.endswith(("-s3alias", "--ol-s3", ".mrap", "--x-s3", "--table-s3"))
        ):
            raise ValueError("Use a valid lowercase S3 bucket name.")
        try:
            ipaddress.ip_address(value)
        except ValueError:
            return value
        raise ValueError("Bucket names cannot be IP addresses.")


def _public_endpoint(endpoint: str) -> str:
    """Exclude credentials, query parameters and fragments from endpoint metadata."""
    parsed = urlsplit(endpoint)
    host = parsed.hostname or ""
    if ":" in host:
        host = f"[{host}]"
    authority = f"{host}:{parsed.port}" if parsed.port else host
    return urlunsplit((parsed.scheme, authority, parsed.path, "", ""))


def _bucket_kind(name: str, dataset_bucket: str) -> str:
    if name == dataset_bucket or "dataset" in name.lower():
        return "datasets"
    if "model" in name.lower():
        return "models"
    if "artifact" in name.lower() or "mlflow" in name.lower():
        return "artifacts"
    return "other"


def _object_kind(bucket_kind: str, key: str) -> str:
    segments = key.lower().split("/")
    if "datasets" in segments or bucket_kind == "datasets":
        return "datasets"
    if "model" in segments or "models" in segments or bucket_kind == "models":
        return "models"
    return "artifacts" if bucket_kind == "artifacts" or "artifacts" in segments else "other"


@router.get("/")
def storage_snapshot(storage: StorageClient = Depends(get_storage)) -> dict[str, Any]:
    """Measure object bytes with bounded pagination; explicitly flag partial scans."""
    try:
        inventory = storage._s3.list_buckets().get("Buckets", [])
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not connect to object storage.") from exc

    inventory = sorted(inventory, key=lambda bucket: bucket["Name"])
    categories = dict.fromkeys(("datasets", "models", "artifacts", "other"), 0)
    buckets = []
    remaining_pages = 25
    for bucket in inventory[:50]:
        name = bucket["Name"]
        kind = _bucket_kind(name, storage.default_bucket)
        count = size = 0
        complete = False
        available = True
        continuation = None
        try:
            for _ in range(min(10, remaining_pages)):
                remaining_pages -= 1
                arguments: dict[str, Any] = {"Bucket": name, "MaxKeys": 1000}
                if continuation:
                    arguments["ContinuationToken"] = continuation
                page = storage._s3.list_objects_v2(**arguments)
                for item in page.get("Contents", []):
                    object_size = int(item.get("Size", 0))
                    count += 1
                    size += object_size
                    categories[_object_kind(kind, item["Key"])] += object_size
                if not page.get("IsTruncated", False):
                    complete = True
                    break
                continuation = page.get("NextContinuationToken")
                if not continuation:
                    break
        except Exception:
            available = False
        buckets.append({"name": name, "kind": kind, "objects": count, "size_bytes": size,
                        "complete": complete, "available": available})
    return {
        "storage_type": "MinIO / S3 Compatible", "endpoint": _public_endpoint(storage.endpoint_url),
        "default_bucket": storage.default_bucket, "connected": True,
        "buckets": buckets, "categories": categories,
        "used_bytes": sum(bucket["size_bytes"] for bucket in buckets),
        "capacity_bytes": None,
        "complete": len(inventory) <= 50 and all(bucket["complete"] for bucket in buckets),
    }


@router.post("/test")
def test_storage_connection(storage: StorageClient = Depends(get_storage)) -> dict[str, Any]:
    try:
        storage._s3.list_buckets()
    except Exception as exc:
        raise HTTPException(status_code=502, detail="Could not connect to object storage.") from exc
    return {"connected": True, "message": "Object storage connection verified."}


@router.post("/buckets", status_code=201)
def create_storage_bucket(
    payload: BucketCreate,
    storage: StorageClient = Depends(get_storage),
    current_user: User = Depends(get_current_user),
) -> dict[str, str]:
    try:
        if storage.bucket_exists(payload.name):
            raise HTTPException(status_code=409, detail="This bucket already exists.")
        storage.create_bucket(payload.name)
    except StorageError as exc:
        raise HTTPException(status_code=502, detail="Could not create this storage bucket.") from exc
    logger.info("Storage bucket created: bucket=%s user_id=%s", payload.name, current_user.id)
    return {"name": payload.name}
