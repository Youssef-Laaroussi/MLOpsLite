"""Two-account HTTP attacks against real SQL; remote MLflow is a deterministic fixture."""

from pathlib import Path
from types import SimpleNamespace

import pytest
from fastapi import Request
from httpx import ASGITransport, AsyncClient
from sqlalchemy import select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from sqlalchemy.orm import Session

from apps.api.dependencies import get_db
from apps.api.main import create_app
from packages.core.models.alert import Alert
from packages.core.models.monitoring import (
    DataQualityReport,
    DriftEvaluation,
    ModelPerformanceHistory,
)
from packages.core.models.user import User
from packages.core.security.dependencies import get_current_user
from tests.unit.security.test_workspace_isolation import database  # noqa: F401


class Experiments(list):
    token = None


class Tracking:
    def __init__(self):
        self.experiments = {"exp-" + user: SimpleNamespace(
            experiment_id="exp-" + user, name="external-" + user, artifact_location="s3://private/" + user,
            lifecycle_stage="active", creation_time=1, tags={"mlite.project": user},
        ) for user in ("a", "b", "admin")}
        self.deleted = []
        self.artifact_reads = []

    def search_experiments(self, **_kwargs):
        return Experiments(self.experiments.values())

    def get_experiment(self, identifier):
        return self.experiments[identifier]

    def get_run(self, identifier):
        user = identifier.removeprefix("run-")
        return SimpleNamespace(info=SimpleNamespace(
            run_id=identifier, run_name=identifier, experiment_id="exp-" + user,
            artifact_uri="s3://private/" + user, status="FINISHED", start_time=1, end_time=2,
        ), data=SimpleNamespace(metrics={"accuracy": 0.9}, params={}, tags={}))

    def search_runs(self, experiment_ids, **_kwargs):
        return Experiments([self.get_run("run-" + experiment_ids[0].removeprefix("exp-"))])

    def list_artifacts(self, run_id, path=None):
        self.artifact_reads.append(run_id)
        return [SimpleNamespace(path="weights", is_dir=False, file_size=12)]

    def download_artifacts(self, run_id, path, workspace):
        self.artifact_reads.append(run_id)
        result = Path(workspace) / path
        result.write_text("private artifact " + run_id)
        return str(result)

    def get_metric_history(self, *_args):
        return [SimpleNamespace(step=0, timestamp=1, value=0.9)]

    def delete_experiment(self, identifier):
        self.deleted.append(identifier)

    def get_or_create_experiment(self, experiment_name, tags=None, **_kwargs):
        identifier = str(len(self.experiments) + 1)
        self.experiments[identifier] = SimpleNamespace(experiment_id=identifier, name=experiment_name,
            artifact_location="s3://private/" + identifier, lifecycle_stage="active", creation_time=1, tags=tags)
        return identifier


@pytest.fixture
async def workspace_client(database, monkeypatch):  # noqa: F811 - imported pytest fixture
    with Session(database, expire_on_commit=False) as session:
        users = {user.id: user for user in session.scalars(select(User))}
        for user in users:
            session.add(Alert(id="alert-" + user, owner_id=user, project_id="p-" + user,
                              model_name="model-" + user, event_type="QA", title="private-" + user, message="private-" + user))
            session.add(DriftEvaluation(id="report-" + user, model_name="model-" + user, drift_share=0.1))
            session.add(DataQualityReport(dataset_id="d-" + user, score=99, status="PASS"))
            session.add(ModelPerformanceHistory(model_name="model-" + user, sample_count=5, metrics_json={"accuracy": 0.9}))
        session.commit()
    engine = create_async_engine("sqlite+aiosqlite:///" + database.url.database)
    factory = async_sessionmaker(engine, expire_on_commit=False)

    async def connection():
        async with factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    async def account(request: Request):
        return users[request.headers.get("X-Test-Account", "a")]

    tracking = Tracking()
    tracking.client = tracking
    monkeypatch.setattr("packages.tracking.mlflow_client.MLiteMLflowManager", lambda **_kwargs: tracking)
    app = create_app()
    app.dependency_overrides[get_db] = connection
    app.dependency_overrides[get_current_user] = account
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as client:
        yield client, tracking
    await engine.dispose()


@pytest.mark.asyncio
@pytest.mark.parametrize("account", ["a", "b", "admin"])
async def test_catalogs_and_dashboard_have_no_other_accounts(workspace_client, account):
    client, _tracking = workspace_client
    headers = {"X-Test-Account": account}
    for path, key, field, expected in [
        ("/datasets/", "datasets", "id", "d-" + account),
        ("/models/", "models", "name", "model-" + account),
        ("/deployments/", "deployments", "id", "dep-" + account),
        ("/projects/", "projects", "id", "p-" + account),
        ("/experiments/", "experiments", "experiment_id", "exp-" + account),
        ("/alerts/", "alerts", "id", "alert-" + account),
        ("/monitoring/", "reports", "id", "report-" + account),
    ]:
        response = await client.get("/api/v1" + path, headers=headers)
        assert response.status_code == 200, response.text
        assert {row[field] for row in response.json()[key]} == {expected}, path
    response = await client.get("/api/v1/health/stats", headers=headers)
    assert response.status_code == 200
    assert all(response.json()[key] == 1 for key in ("projects_count", "models_count", "datasets_count", "experiments_count", "active_deployments"))


@pytest.mark.asyncio
async def test_foreign_ids_and_mutations_are_denied(workspace_client):
    client, tracking = workspace_client
    attacks = [
        ("GET", "/projects/p-b", None), ("PATCH", "/projects/p-b", {"description": "stolen"}),
        ("GET", "/datasets/d-b", None), ("GET", "/datasets/d-b/versions", None),
        ("DELETE", "/datasets/d-b", None), ("POST", "/datasets/d-b/validate", None),
        ("POST", "/datasets/", {"name": "stolen", "project_id": "p-b", "format": "CSV"}),
        ("GET", "/models/model-b/versions", None), ("GET", "/models/model-b/versions/1/validation", None),
        ("GET", "/models/model-b/versions/1/lineage", None),
        ("POST", "/models/model-b/versions/1/promote", {"stage": "STAGING"}),
        ("POST", "/models/register", {"name": "stolen-run", "run_id": "run-b"}),
        ("GET", "/deployments/dep-b", None), ("GET", "/deployments/dep-b/metrics", None),
        ("GET", "/deployments/dep-b/metadata", None), ("GET", "/deployments/dep-b/ready", None),
        ("POST", "/deployments/dep-b/predict", {"inputs": [[1, 2]]}),
        ("POST", "/deployments/dep-b/stop", None),
        ("POST", "/deployments/dep-b/rollback", {"target_version": 1}),
        ("POST", "/deployments/dep-b/feedback", {"prediction_id": "attack", "ground_truth": 1}),
        ("GET", "/experiments/exp-b/runs", None),
        ("GET", "/experiments/exp-b/runs/run-b/artifacts", None),
        ("GET", "/experiments/exp-b/runs/run-b/artifacts/download?path=model", None),
        ("GET", "/experiments/exp-a/runs/run-b/artifacts", None),
        ("DELETE", "/experiments/exp-b", None),
        ("GET", "/monitoring/reports/report-b/html", None),
        ("POST", "/alerts/alert-b/acknowledge", None), ("POST", "/alerts/alert-b/resolve", None),
        ("POST", "/rollback-policies", {"model_name": "model-b"}),
    ]
    for method, path, body in attacks:
        response = await client.request(method, "/api/v1" + path, json=body)
        assert response.status_code == 404, (method, path, response.status_code, response.text)
    assert not tracking.deleted
    assert "run-b" not in tracking.artifact_reads


@pytest.mark.asyncio
async def test_owner_can_read_run_artifacts_and_register_model(workspace_client):
    client, _tracking = workspace_client
    response = await client.get("/api/v1/experiments/exp-a/runs/run-a/artifacts/download?path=model")
    assert response.status_code == 200 and response.text == "private artifact run-a"
    response = await client.post("/api/v1/models/register", json={"name": "new-model-a", "run_id": "run-a"})
    assert response.status_code == 201, response.text
    other = await client.get("/api/v1/models/new-model-a/versions", headers={"X-Test-Account": "b"})
    assert other.status_code == 404


@pytest.mark.asyncio
async def test_same_experiment_display_name_is_private_to_each_account(workspace_client):
    client, _tracking = workspace_client
    identifiers = []
    for account in ("a", "b"):
        response = await client.post("/api/v1/experiments/", json={"name": "Same name"}, headers={"X-Test-Account": account})
        assert response.status_code == 201, response.text
        identifiers.append(response.json()["experiment_id"])
    assert identifiers[0] != identifiers[1]
    response = await client.get(f"/api/v1/experiments/{identifiers[0]}/runs", headers={"X-Test-Account": "b"})
    assert response.status_code == 404


@pytest.mark.asyncio
async def test_administration_is_separate_and_recovery_is_explicit(workspace_client):
    client, _tracking = workspace_client
    assert (await client.get("/api/v1/users")).status_code == 403
    assert (await client.get("/api/v1/admin/workspaces/unassigned")).status_code == 403
    assert (await client.get("/api/v1/users", headers={"X-Test-Account": "admin"})).json()["total"] == 3
    payload = {"kind": "dataset", "resource_id": "unassigned", "username": "a"}
    response = await client.post("/api/v1/admin/workspaces/assign", json=payload, headers={"X-Test-Account": "admin"})
    assert response.status_code == 200, response.text
    assert (await client.get("/api/v1/datasets/unassigned")).status_code == 200
    assert (await client.get("/api/v1/datasets/unassigned", headers={"X-Test-Account": "b"})).status_code == 404
    response = await client.post("/api/v1/admin/workspaces/assign", json={**payload, "username": "b"}, headers={"X-Test-Account": "admin"})
    assert response.status_code == 409
