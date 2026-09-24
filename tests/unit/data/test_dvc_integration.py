"""Unit tests for DVCManager integration and MinIO remote configuration (Issue #16)."""

from pathlib import Path
from unittest.mock import MagicMock, patch
import pytest

from packages.data.dvc_manager import DVCManager


class TestDVCManager:
    """Test DVC project initialization, remote configuration, and commands."""

    def test_dvc_not_installed_handling(self):
        with patch("shutil.which", return_value=None):
            dvc = DVCManager()
            assert dvc.is_dvc_installed is False

            res = dvc.init_project()
            assert res["success"] is False
            assert "DVC is not installed" in res["error"]

    def test_dvc_init_project_success(self, tmp_path):
        with patch("shutil.which", return_value="/usr/local/bin/dvc"):
            with patch("subprocess.run") as mock_run:
                mock_run.return_value = MagicMock(returncode=0, stdout="", stderr="")

                dvc = DVCManager(
                    project_dir=tmp_path,
                    minio_endpoint="http://localhost:9000",
                    access_key="admin",
                    secret_key="password",
                )
                assert dvc.is_dvc_installed is True

                res = dvc.init_project()
                assert res["success"] is True
                assert res["remote_name"] == "minio"
                assert "s3://mlite-datasets/dvc-cache" in res["remote_url"]
                assert res["endpoint"] == "http://localhost:9000"

    def test_dvc_add_file_not_found(self, tmp_path):
        with patch("shutil.which", return_value="/usr/local/bin/dvc"):
            dvc = DVCManager(project_dir=tmp_path)
            res = dvc.add(tmp_path / "non_existent.csv")
            assert res["success"] is False
            assert "Target does not exist" in res["error"]

    def test_dvc_push_and_pull(self, tmp_path):
        with patch("shutil.which", return_value="/usr/local/bin/dvc"):
            with patch("subprocess.run") as mock_run:
                mock_run.return_value = MagicMock(returncode=0, stdout="Pushing...", stderr="")
                dvc = DVCManager(project_dir=tmp_path)

                push_res = dvc.push()
                assert push_res["success"] is True

                mock_run.return_value = MagicMock(returncode=0, stdout="Pulling...", stderr="")
                pull_res = dvc.pull()
                assert pull_res["success"] is True
