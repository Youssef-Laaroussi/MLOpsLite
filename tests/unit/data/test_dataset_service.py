"""Unit tests for dataset schema extraction and DatasetService operations (Issue #15)."""

import csv
import tempfile
from pathlib import Path
import pytest
from unittest.mock import AsyncMock, MagicMock

from packages.core.models.dataset import Dataset, DatasetFormat
from packages.core.storage.client import StorageClient
from packages.data.parser import TabularDataParser, compute_sha256
from packages.data.service import DatasetService


@pytest.fixture
def sample_csv(tmp_path):
    """Generate a sample CSV file with headers, rows, and missing values."""
    csv_file = tmp_path / "test_data.csv"
    with open(csv_file, "w", newline="", encoding="utf-8") as f:
        writer = csv.writer(f)
        writer.writerow(["feature_a", "feature_b", "target"])
        writer.writerow([1.5, 10.0, 1])
        writer.writerow([2.5, "", 0])  # Missing feature_b
        writer.writerow([3.5, 30.0, 1])
    return csv_file


class TestTabularDataParser:
    """Test schema parsing and hash computation."""

    def test_compute_sha256(self, sample_csv):
        sha256, size_bytes = compute_sha256(sample_csv)
        assert len(sha256) == 64
        assert size_bytes > 0

    def test_inspect_csv_schema(self, sample_csv):
        meta = TabularDataParser.inspect(sample_csv)
        assert meta["format"] == "CSV"
        assert meta["row_count"] == 3
        assert meta["column_count"] == 3
        assert len(meta["columns"]) == 3
        assert len(meta["sample_records"]) == 3

        col_names = [c["name"] for c in meta["columns"]]
        assert "feature_a" in col_names
        assert "feature_b" in col_names
        assert "target" in col_names


@pytest.mark.asyncio
class TestDatasetService:
    """Test DatasetService logic with mocked database session and storage client."""

    async def test_create_dataset(self):
        session = AsyncMock()
        service = DatasetService(session=session)

        dataset = await service.create_dataset(
            name="fraud-transactions",
            project_id="proj-123",
            format=DatasetFormat.CSV,
            description="Training dataset for fraud detection",
        )

        assert dataset.name == "fraud-transactions"
        assert dataset.project_id == "proj-123"
        assert dataset.format == DatasetFormat.CSV
        session.add.assert_called_once()
        session.flush.assert_called_once()

    async def test_register_version_with_deduplication(self, sample_csv):
        session = AsyncMock()
        mock_storage = MagicMock(spec=StorageClient)
        mock_storage.default_bucket = "mlite-datasets"
        mock_storage.file_exists.return_value = False
        mock_storage.upload_file.return_value = {
            "s3_uri": "s3://mlite-datasets/fraud-transactions/test_data.csv"
        }

        # Mock existing dataset
        existing_ds = Dataset(
            id="ds-1",
            name="fraud-transactions",
            format=DatasetFormat.CSV,
        )

        # Mock max version query result (0 -> next version is 1)
        v_res = MagicMock()
        v_res.scalar.return_value = 0
        session.execute.return_value = v_res

        service = DatasetService(session=session, storage_client=mock_storage)
        service.get_dataset = AsyncMock(return_value=existing_ds)

        version = await service.register_version(
            dataset_id="ds-1",
            file_path=sample_csv,
            description="Initial version",
        )

        assert version.version_num == 1
        assert version.row_count == 3
        assert version.column_count == 3
        assert len(version.hash_sha256) == 64
        mock_storage.upload_file.assert_called_once()
