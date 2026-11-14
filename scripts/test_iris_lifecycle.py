"""Run the Iris acceptance scenario against a local Compose stack."""

import json
import os
import subprocess
import sys
import tempfile
import time
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[1]
IRIS = ROOT / "examples/iris"
API = os.getenv("MLITE_API_URL", "http://localhost:8000")
PORT = int(os.getenv("IRIS_TEST_PORT", "8100"))


def checked(response: httpx.Response) -> dict:
    response.raise_for_status()
    return response.json()


def wait_ready(client: httpx.Client, url: str) -> None:
    for _ in range(60):
        try:
            response = client.get(url, timeout=2)
            if response.is_success:
                return
        except httpx.RequestError:
            pass
        time.sleep(1)
    raise RuntimeError(f"Service never became ready: {url}")


def upload(client: httpx.Client, project_id: str, name: str, path: Path) -> str:
    dataset = checked(client.post("/datasets/", json={
        "name": name, "project_id": project_id, "format": "CSV",
    }))
    with path.open("rb") as file:
        version = checked(client.post(f"/datasets/{dataset['id']}/upload", files={
            "file": (path.name, file, "text/csv"),
        }))
    assert version["version_num"] == 1 and version["row_count"] > 0
    return dataset["id"]


def main() -> None:
    suffix = str(time.time_ns())
    model_name = f"iris-ci-{suffix}"
    with httpx.Client(base_url=f"{API}/api/v1", timeout=90) as client:
        wait_ready(client, f"{API}/health")
        credentials = {
            "username": os.environ.get("ADMIN_USER", "admin"),
            "password": os.environ.get("ADMIN_PASSWORD", "admin123456"),
        }
        token = checked(client.post("/auth/login", json=credentials))["access_token"]
        client.headers["Authorization"] = f"Bearer {token}"
        project = checked(client.post("/projects/", json={"name": model_name, "slug": model_name}))
        dataset = upload(client, project["id"], f"{model_name}-data", IRIS / "data/iris.csv")

        with tempfile.TemporaryDirectory() as tmp:
            result_file = Path(tmp) / "run.json"
            subprocess.run(
                [sys.executable, str(IRIS / "src/train.py")],
                check=True, env={**os.environ, "IRIS_RUN_RESULT": str(result_file)},
            )
            run = json.loads(result_file.read_text())
        model = checked(client.post("/models/register", json={
            "name": model_name, "run_id": run["run_id"], "project_slug": project["slug"],
        }))
        version = model["version"]
        assert "accuracy" in model["metrics"]
        lineage = checked(client.get(f"/models/{model_name}/versions/{version}/lineage"))
        assert lineage["model_artifact_present"] and lineage["matching_datasets"]
        promotion = checked(client.post(
            f"/models/{model_name}/versions/{version}/promote", json={"stage": "PRODUCTION"},
        ))
        assert promotion["promoted"] is True
        deployment = checked(client.post("/deployments/", json={
            "model_name": model_name, "model_version": version, "port": PORT,
        }))
        assert deployment["status"] == "RUNNING", deployment.get("error_message")
        try:
            endpoint = f"http://localhost:{PORT}"
            wait_ready(client, f"{endpoint}/ready")
            with httpx.Client() as serving:
                result = checked(serving.post(f"{endpoint}/predict", json={
                    "inputs": [[5.1, 3.5, 1.4, 0.2]],
                }))
            assert result["predictions"] == [0] and result["version"] == str(version)
            drift = checked(client.post("/monitoring/drift/check", json={
                "model_name": model_name, "reference_dataset_id": dataset, "current_dataset_id": dataset,
            }))
            assert drift["drift_share"] == 0
            report = client.get(f"/monitoring/reports/{drift['id']}/html")
            report.raise_for_status()
            assert "text/html" in report.headers["content-type"]
            print("Iris acceptance passed: upload, training, lineage, serving, drift and report.")
        finally:
            client.post(f"/deployments/{deployment['id']}/stop").raise_for_status()


if __name__ == "__main__":
    main()
