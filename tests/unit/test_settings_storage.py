"""Storage inventory is paginated, explicit about partial results, and admin-only."""
from types import SimpleNamespace
from unittest.mock import MagicMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from apps.api.routers.settings_storage import (
    BucketCreate,
    create_storage_bucket,
    router,
    storage_snapshot,
)
from apps.api.routers.settings_storage import (
    test_storage_connection as probe_connection,
)
from packages.core.models.user import UserRole
from packages.core.storage.client import StorageError


@pytest.fixture
def storage():
    s3 = MagicMock()
    s3.list_buckets.return_value = {"Buckets": [{"Name": "mlflow-artifacts"}]}
    return SimpleNamespace(_s3=s3, endpoint_url="http://user:password@minio:9000/?secret=hidden", default_bucket="mlite-datasets", bucket_exists=MagicMock(return_value=False), create_bucket=MagicMock(return_value=True))


def test_inventory_paginates_measures_objects_and_hides_endpoint_credentials(storage):
    storage._s3.list_objects_v2.side_effect = [
        {"Contents": [{"Key": "datasets/train.csv", "Size": 10}], "IsTruncated": True, "NextContinuationToken": "next"},
        {"Contents": [{"Key": "run/artifacts/model/model.pkl", "Size": 20}, {"Key": "run/artifacts/metrics.json", "Size": 5}], "IsTruncated": False},
    ]
    result = storage_snapshot(storage)
    assert result["endpoint"] == "http://minio:9000/"
    assert result["used_bytes"] == 35
    assert result["categories"] == {"datasets": 10, "models": 20, "artifacts": 5, "other": 0}
    assert result["buckets"][0]["objects"] == 3
    assert result["complete"] is True
    assert result["capacity_bytes"] is None
    assert storage._s3.list_objects_v2.call_args.kwargs["ContinuationToken"] == "next"


def test_bounded_scan_is_reported_as_partial(storage):
    storage._s3.list_objects_v2.return_value = {"Contents": [{"Key": "file", "Size": 2}], "IsTruncated": True, "NextContinuationToken": "next"}
    result = storage_snapshot(storage)
    assert result["complete"] is False
    assert result["buckets"][0]["complete"] is False
    assert result["used_bytes"] == 20
    assert storage._s3.list_objects_v2.call_count == 10


def test_unreadable_bucket_is_not_reported_as_an_empty_complete_bucket(storage):
    storage._s3.list_objects_v2.side_effect = RuntimeError("Denied")
    result = storage_snapshot(storage)
    assert result["buckets"][0]["available"] is False
    assert result["complete"] is False


@pytest.mark.parametrize("operation", [storage_snapshot, probe_connection])
def test_connection_errors_do_not_expose_storage_credentials(storage, operation):
    storage._s3.list_buckets.side_effect = RuntimeError("secret-access-key")
    with pytest.raises(HTTPException) as error:
        operation(storage)
    assert error.value.status_code == 502
    assert "secret-access-key" not in error.value.detail


@pytest.mark.parametrize("name", ["UPPERCASE", "ab", "bad..bucket", "bad.-bucket", "192.168.1.1", "xn--bucket", "bucket--x-s3"])
def test_bucket_name_validation(name):
    with pytest.raises(ValidationError):
        BucketCreate(name=name)


def test_create_bucket_uses_explicit_name_and_rejects_duplicates(storage):
    assert create_storage_bucket(BucketCreate(name="new-bucket"), storage, SimpleNamespace(id="admin")) == {"name": "new-bucket"}
    storage.create_bucket.assert_called_once_with("new-bucket")
    storage.bucket_exists.return_value = True
    with pytest.raises(HTTPException) as error:
        create_storage_bucket(BucketCreate(name="new-bucket"), storage, SimpleNamespace(id="admin"))
    assert error.value.status_code == 409
    assert storage.create_bucket.call_count == 1


def test_create_failure_is_not_reported_as_success(storage):
    storage.create_bucket.side_effect = StorageError("internal secret")
    with pytest.raises(HTTPException) as error:
        create_storage_bucket(BucketCreate(name="new-bucket"), storage, SimpleNamespace(id="admin"))
    assert error.value.status_code == 502
    assert "internal secret" not in error.value.detail


@pytest.mark.asyncio
async def test_storage_router_requires_administrator():
    guard = router.dependencies[0].dependency
    with pytest.raises(HTTPException) as error:
        await guard(current_user=SimpleNamespace(role=UserRole.USER))
    assert error.value.status_code == 403


def test_inventory_has_a_global_page_budget(storage):
    storage._s3.list_buckets.return_value = {"Buckets": [{"Name": f"bucket-{index:02}"} for index in range(30)]}
    storage._s3.list_objects_v2.return_value = {"Contents": [], "IsTruncated": False}
    result = storage_snapshot(storage)
    assert storage._s3.list_objects_v2.call_count == 25
    assert len(result["buckets"]) == 30
    assert result["complete"] is False
