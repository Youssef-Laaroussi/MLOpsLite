"""Live two-account isolation checks against the local Compose installation."""

import json
import os
import secrets
import subprocess
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
WORK = Path(os.getenv("MLITE_ISOLATION_DIR", str(ROOT / "secrets/qa/workspace-isolation")))
WORK.mkdir(mode=0o700, parents=True, exist_ok=True)
WORK.chmod(0o700)
FILE = WORK / "state.json"
state = json.loads(FILE.read_text()) if FILE.exists() else {"prefix": "qa-private-" + secrets.token_hex(5), "checks": {}}
BASE = os.getenv("MLITE_API_URL", "http://localhost:8000").rstrip("/") + "/api/v1"


def save():
    FILE.write_text(json.dumps(state, indent=2))
    FILE.chmod(0o600)


def call(client, method, path, status=200, **kwargs):
    response = client.request(method, path, **kwargs)
    if response.status_code != status:
        raise AssertionError(f"{method} {path}: expected {status}, got {response.status_code}")
    return response.json() if response.content and "application/json" in response.headers.get("content-type", "") else response.text


def check(name, action):
    try:
        action()
        state["checks"][name] = "PASS"
        print("PASS", name, flush=True)
    except Exception as exc:
        state["checks"][name] = "FAIL"
        print("FAIL", name, str(exc)[:250], flush=True)
    save()


def ensure(condition):
    if not condition:
        raise AssertionError("Isolation assertion failed")


def connect(account):
    client = httpx.Client(base_url=BASE, timeout=120)
    token = call(client, "POST", "/auth/login", json={key: account[key] for key in ("username", "password")})
    client.headers["Authorization"] = "Bearer " + token["access_token"]
    return client


def run():
    previous = Path(os.getenv("MLITE_QA_A_DIR", str(ROOT / "secrets/qa/20261127")))
    resources_a = json.loads((previous / "manifest.json").read_text())["resources"]
    a = connect(json.loads((previous / "account.json").read_text()))
    admin = connect(json.loads((ROOT / "secrets/admin.local.json").read_text()))
    if "account" not in state:
        state["account"] = {"username": state["prefix"], "email": state["prefix"] + "@example.test",
                            "password": secrets.token_urlsafe(24), "full_name": "QA Private B"}
        save()
        with httpx.Client(base_url=BASE, timeout=30) as public:
            call(public, "POST", "/auth/register", status=201, json=state["account"])
    b = connect(state["account"])
    if "project" not in state:
        for endpoint, key in (("projects", "projects"), ("datasets", "datasets"), ("models", "models"),
                              ("deployments", "deployments"), ("experiments", "experiments")):
            check("empty_private_" + endpoint, lambda endpoint=endpoint, key=key: ensure(not call(b, "GET", f"/{endpoint}/")[key]))
        state["project"] = call(b, "POST", "/projects/", status=201, json={"name": "QA Private B", "slug": state["prefix"]})
        state["dataset"] = call(b, "POST", "/datasets/", status=201, json={"name": state["prefix"], "project_id": state["project"]["id"], "format": "CSV"})
        with (previous / "iris-reference.csv").open("rb") as stream:
            call(b, "POST", f"/datasets/{state['dataset']['id']}/upload", status=201, files={"file": ("iris.csv", stream, "text/csv")})
        save()
    reference_a = resources_a["datasets"]["reference"]["id"]
    model_a = resources_a["model_name"]
    dep_a = resources_a["demo_deployment"]["id"]
    exp_a = str(resources_a["experiment_id"])
    run_a = resources_a["training"][0]["run_id"]
    for method, path, body in [
        ("GET", "/projects/" + resources_a["project"]["id"], None),
        ("GET", f"/datasets/{reference_a}", None), ("GET", f"/datasets/{reference_a}/versions", None),
        ("POST", f"/datasets/{reference_a}/validate", None), ("DELETE", f"/datasets/{reference_a}", None),
        ("GET", f"/models/{model_a}/versions", None), ("GET", f"/models/{model_a}/versions/1/lineage", None),
        ("POST", f"/models/{model_a}/versions/1/promote", {"stage": "STAGING"}),
        ("POST", "/models/register", {"name": state["prefix"] + "-stolen", "run_id": run_a}),
        ("GET", f"/deployments/{dep_a}", None), ("POST", f"/deployments/{dep_a}/stop", None),
        ("GET", f"/deployments/{dep_a}/metadata", None), ("POST", f"/deployments/{dep_a}/predict", {"inputs": [[1, 2]]}),
        ("GET", f"/experiments/{exp_a}/runs", None),
        ("GET", f"/experiments/{exp_a}/runs/{run_a}/artifacts", None),
        ("GET", f"/experiments/{exp_a}/runs/{run_a}/artifacts/download?path=model", None),
        ("DELETE", f"/experiments/{exp_a}", None),
    ]:
        check("foreign_" + method + "_" + path, lambda method=method, path=path, body=body: call(b, method, path, status=404, json=body))
    check("own_uploaded_dataset_quality", lambda: ensure(call(b, "POST", f"/datasets/{state['dataset']['id']}/validate", status=201)["rows_count"] == 150))
    for account_name, client in (("a", a), ("b", b)):
        key = "same_name_experiment_" + account_name
        if key not in state:
            state[key] = call(client, "POST", "/experiments/", status=201, json={"name": state["prefix"] + "-shared-name"})["experiment_id"]
            save()
    check("same_display_name_different_remote_ids", lambda: ensure(state["same_name_experiment_a"] != state["same_name_experiment_b"]))
    check("same_display_name_no_cross_access", lambda: call(b, "GET", f"/experiments/{state['same_name_experiment_a']}/runs", status=404))
    if "training" not in state:
        payload = {"prefix": state["prefix"], "version": 1, "csv": (previous / "iris-reference.csv").read_text()}
        result = subprocess.run(["docker", "compose", "exec", "-T", "mlflow", "python", "-c",
                                 Path(__file__).with_name("train_iris.py").read_text()],
                                cwd=ROOT, input=json.dumps(payload), text=True, capture_output=True, timeout=180)
        if result.returncode:
            (WORK / "training-error.log").write_text(result.stderr)
            raise AssertionError("Training failed; inspect private log")
        state["training"] = json.loads(next(line for line in result.stdout.splitlines() if line.startswith("QA_RESULT=")).split("=", 1)[1])
        state["model_name"] = state["prefix"] + "-iris"
        call(b, "POST", "/models/register", status=201, json={"name": state["model_name"], "run_id": state["training"]["run_id"], "project_slug": state["prefix"]})
        save()
    check("cannot_register_another_users_run", lambda: call(a, "POST", "/models/register", status=404, json={"name": state["prefix"] + "-stolen-b", "run_id": state["training"]["run_id"]}))
    check("cannot_append_version_to_foreign_model", lambda: call(b, "POST", "/models/register", status=409, json={"name": model_a, "run_id": state["training"]["run_id"]}))
    model_b = state["model_name"]
    if "deployment" not in state or call(b, "GET", f"/deployments/{state['deployment']['id']}")["status"] != "RUNNING":
        state["deployment"] = call(b, "POST", "/deployments/", status=201, json={"model_name": model_b, "model_version": 1})
        save()
    deployment = state["deployment"]
    ensure(deployment["status"] == "RUNNING")
    check("private_internal_tokens_not_serialized", lambda: ensure(not any(key.startswith("_mlite_") for key in deployment["config"])))
    for path in ("metadata", "telemetry", "predict"):
        def anonymous(path=path):
            with httpx.Client(base_url=deployment["endpoint_url"], timeout=15) as scoring:
                response = scoring.post("/predict", json={"inputs": [[5.1, 3.5, 1.4, .2]]}) if path == "predict" else scoring.get("/" + path)
                ensure(response.status_code == 401)
        check("direct_container_" + path + "_denied", anonymous)
    check("owner_authenticated_metadata", lambda: ensure(call(b, "GET", f"/deployments/{deployment['id']}/metadata")["model"] == model_b))
    check("owner_authenticated_prediction", lambda: ensure(call(b, "POST", f"/deployments/{deployment['id']}/predict", json={"inputs": [[5.1, 3.5, 1.4, .2]]})["predictions"] == [0]))
    for label, client in (("a", a), ("admin", admin)):
        for endpoint in (f"/datasets/{state['dataset']['id']}", f"/models/{model_b}/versions", f"/deployments/{deployment['id']}/metadata"):
            check(label + "_cannot_read_b_" + endpoint, lambda endpoint=endpoint, client=client: call(client, "GET", endpoint, status=404))
    check("a_cannot_stop_b", lambda: call(a, "POST", f"/deployments/{deployment['id']}/stop", status=404))
    check("b_still_running_after_foreign_stop_attempt", lambda: ensure(call(b, "GET", f"/deployments/{deployment['id']}/ready")["status"] == "ready"))
    check("b_dashboard_private_inventory", lambda: ensure(all(call(b, "GET", "/health/stats")[key] == 1 for key in ("projects_count", "models_count", "datasets_count", "active_deployments"))))
    check("admin_accounts_retained", lambda: ensure(any(user["username"] == state["account"]["username"] for user in call(admin, "GET", "/users")["users"])))
    check("normal_user_administration_denied", lambda: call(b, "GET", "/admin/workspaces/unassigned", status=403))
    check("stop_only_own_qa_deployment", lambda: ensure(call(b, "POST", f"/deployments/{deployment['id']}/stop")["status"] == "STOPPED"))
    for client in (a, b, admin):
        client.close()
    print("RESULT", sum(value == "PASS" for value in state["checks"].values()), "passed,",
          sum(value == "FAIL" for value in state["checks"].values()), "failed", flush=True)
    raise SystemExit(1 if "FAIL" in state["checks"].values() else 0)


if __name__ == "__main__":
    run()
