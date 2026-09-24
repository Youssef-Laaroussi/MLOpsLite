"""Unit tests for MinIO/S3 StorageClient with mocking and checksum validation."""

from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from packages.core.storage.client import StorageClient, StorageError


def test_compute_sha256(tmp_path: Path) -> None:
    """Verify SHA-256 calculation matches expected hash."""
    test_file = tmp_path / "sample.txt"
    test_file.write_text("Hello MLite Object Storage", encoding="utf-8")

    expected_hash = "a58497b90dbfc187c2cd727e06cd6379530c44036daefba4f6430588d48b46ee"
    computed_hash = StorageClient.compute_sha256(test_file)
    assert computed_hash == expected_hash


def test_compute_sha256_missing_file() -> None:
    """Verify FileNotFoundError when computing hash of nonexistent file."""
    with pytest.raises(FileNotFoundError):
        StorageClient.compute_sha256("/nonexistent/file/path.csv")


@patch("boto3.client")
def test_upload_file(mock_boto_client: MagicMock, tmp_path: Path) -> None:
    """Verify file upload calls S3 put_object with correct metadata and SHA-256."""
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3

    client = StorageClient(default_bucket="test-bucket")
    test_file = tmp_path / "dataset.csv"
    test_file.write_text("col1,col2\n1,2\n3,4\n", encoding="utf-8")

    result = client.upload_file(test_file, s3_key="raw/dataset.csv")

    assert result["bucket"] == "test-bucket"
    assert result["s3_key"] == "raw/dataset.csv"
    assert result["s3_uri"] == "s3://test-bucket/raw/dataset.csv"
    assert "sha256" in result
    assert result["size_bytes"] == test_file.stat().st_size
    assert mock_s3.put_object.called


@patch("boto3.client")
def test_download_file(mock_boto_client: MagicMock, tmp_path: Path) -> None:
    """Verify file download calls S3 download_file."""
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3

    client = StorageClient(default_bucket="test-bucket")
    dest_file = tmp_path / "downloaded.csv"

    result = client.download_file("raw/dataset.csv", dest_file)
    assert result == dest_file
    mock_s3.download_file.assert_called_once_with("test-bucket", "raw/dataset.csv", str(dest_file))


@patch("boto3.client")
def test_generate_presigned_url(mock_boto_client: MagicMock) -> None:
    """Verify presigned URL generation."""
    mock_s3 = MagicMock()
    mock_s3.generate_presigned_url.return_value = "https://minio.local/test-bucket/model.pkl?sig=xyz"
    mock_boto_client.return_value = mock_s3

    client = StorageClient(default_bucket="test-bucket")
    url = client.generate_presigned_url("models/model.pkl", expiration_seconds=1800)

    assert "https://minio.local/test-bucket/model.pkl" in url
    mock_s3.generate_presigned_url.assert_called_once_with(
        ClientMethod="get_object",
        Params={"Bucket": "test-bucket", "Key": "models/model.pkl"},
        ExpiresIn=1800,
    )


@patch("boto3.client")
def test_file_exists(mock_boto_client: MagicMock) -> None:
    """Verify file existence checking returns boolean."""
    mock_s3 = MagicMock()
    mock_s3.head_object.return_value = {"ContentLength": 1024}
    mock_boto_client.return_value = mock_s3

    client = StorageClient(default_bucket="test-bucket")
    assert client.file_exists("existing/key.bin") is True


@patch("boto3.client")
def test_delete_file(mock_boto_client: MagicMock) -> None:
    """Verify file deletion calls S3 delete_object."""
    mock_s3 = MagicMock()
    mock_boto_client.return_value = mock_s3

    client = StorageClient(default_bucket="test-bucket")
    assert client.delete_file("old/key.bin") is True
    mock_s3.delete_object.assert_called_once_with(Bucket="test-bucket", Key="old/key.bin")


@patch("boto3.client")
def test_list_files(mock_boto_client: MagicMock) -> None:
    """Verify listing objects under prefix."""
    mock_s3 = MagicMock()
    mock_s3.list_objects_v2.return_value = {
        "Contents": [{"Key": "data/f1.csv"}, {"Key": "data/f2.csv"}]
    }
    mock_boto_client.return_value = mock_s3

    client = StorageClient(default_bucket="test-bucket")
    files = client.list_files(prefix="data/")
    assert files == ["data/f1.csv", "data/f2.csv"]
