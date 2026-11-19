"""Artifact downloads preserve contents, experiment ownership and temporary-file cleanup."""

from pathlib import Path
from types import SimpleNamespace
from unittest.mock import MagicMock
from zipfile import ZipFile

import pytest
from fastapi import HTTPException
from mlflow.exceptions import MlflowException
from mlflow.protos.databricks_pb2 import RESOURCE_DOES_NOT_EXIST

from apps.api.routers.experiments import download_run_artifact


@pytest.fixture
def artifact_client(monkeypatch):
    client = MagicMock()
    client.get_run.return_value.info.experiment_id = "12"
    monkeypatch.setattr(
        "packages.tracking.mlflow_client.MLiteMLflowManager",
        lambda **kwargs: SimpleNamespace(client=client),
    )
    return client


def download(path):
    return download_run_artifact(
        "12", "run-1", path=path, settings=SimpleNamespace(mlflow_tracking_uri="mock")
    )


@pytest.mark.parametrize("directory", [False, True])
def test_download_preserves_artifact_and_cleans_up(artifact_client, directory):
    def create_artifact(run_id, path, workspace):
        target = Path(workspace) / path
        if directory:
            target.mkdir(parents=True)
            (target / "metrics.json").write_text('{"accuracy": 0.98}')
        else:
            target.parent.mkdir(parents=True, exist_ok=True)
            target.write_text('{"accuracy": 0.98}')
        return str(target)

    artifact_client.download_artifacts.side_effect = create_artifact
    response = download("reports" if directory else "reports/metrics.json")
    result = Path(response.path)
    if directory:
        assert response.filename == "reports.zip"
        with ZipFile(result) as archive:
            assert archive.read("reports/metrics.json") == b'{"accuracy": 0.98}'
    else:
        assert response.filename == "metrics.json"
        assert result.read_text() == '{"accuracy": 0.98}'
    workspace = Path(artifact_client.download_artifacts.call_args.args[2])
    response.background.func(*response.background.args, **response.background.kwargs)
    assert not workspace.exists()


@pytest.mark.parametrize("path", ["../private", "/etc/passwd", "model/../../private", "model\\private", ".", "./"])
def test_invalid_paths_are_rejected(artifact_client, path):
    with pytest.raises(HTTPException) as error:
        download(path)
    assert error.value.status_code == 400
    artifact_client.download_artifacts.assert_not_called()


def test_run_from_another_experiment_is_rejected(artifact_client):
    artifact_client.get_run.return_value.info.experiment_id = "other"
    with pytest.raises(HTTPException) as error:
        download("model")
    assert error.value.status_code == 404
    artifact_client.download_artifacts.assert_not_called()


def test_failed_download_cleans_up(artifact_client):
    def fail(run_id, path, workspace):
        (Path(workspace) / "partial").write_text("partial")
        raise MlflowException("missing", error_code=RESOURCE_DOES_NOT_EXIST)

    artifact_client.download_artifacts.side_effect = fail
    with pytest.raises(HTTPException) as error:
        download("model")
    assert error.value.status_code == 404
    assert not Path(artifact_client.download_artifacts.call_args.args[2]).exists()


def test_download_cannot_return_a_file_outside_workspace(artifact_client, tmp_path):
    external = tmp_path / "private.txt"
    external.write_text("private")
    artifact_client.download_artifacts.return_value = str(external)
    with pytest.raises(HTTPException) as error:
        download("model")
    assert error.value.status_code == 502
    assert external.read_text() == "private"
    assert not Path(artifact_client.download_artifacts.call_args.args[2]).exists()
