"""Real local MLite acceptance checks; credentials stay in a private work directory."""

import argparse
import hashlib
import json
import os
import secrets
import time
from datetime import UTC, datetime
from pathlib import Path

import httpx

ROOT = Path(__file__).resolve().parents[2]
WORK = Path(
    os.getenv("MLITE_QA_DIR", str(ROOT / "secrets" / "qa" / datetime.now(UTC).strftime("%Y%m%d")))
)
WORK.mkdir(mode=0o700, parents=True, exist_ok=True)
WORK.chmod(0o700)
MANIFEST = WORK / "manifest.json"
STATE = (
    json.loads(MANIFEST.read_text())
    if MANIFEST.exists()
    else {
        "prefix": "qa-solo-" + datetime.now(UTC).strftime("%H%M%S") + "-" + secrets.token_hex(2),
        "checks": {},
        "resources": {},
    }
)
BASE = os.getenv("MLITE_API_URL", "http://localhost:8000").rstrip("/") + "/api/v1"
client = httpx.Client(base_url=BASE, timeout=120)


def save():
    MANIFEST.write_text(json.dumps(STATE, indent=2))
    MANIFEST.chmod(0o600)


def request(method, path, expected=200, **kwargs):
    response = client.request(method, path, **kwargs)
    if response.status_code != expected:
        error_file = WORK / "last-http-error.txt"
        error_file.write_text(
            f"{method} {path}: {response.status_code}\n"
            + (response.text[:3000] if "/auth/" not in path else "Authentication response omitted.")
        )
        error_file.chmod(0o600)
        raise AssertionError(
            f"{method} {path}: expected {expected}, received {response.status_code}"
        )
    if not response.content:
        return None
    return (
        response.json()
        if "application/json" in response.headers.get("content-type", "")
        else response.text
    )


def check(name, action):
    started = time.monotonic()
    try:
        detail = action()
        STATE["checks"][name] = {
            "status": "PASS",
            "seconds": round(time.monotonic() - started, 2),
            "detail": detail,
        }
        print("PASS", name, flush=True)
    except Exception as exc:
        STATE["checks"][name] = {
            "status": "FAIL",
            "seconds": round(time.monotonic() - started, 2),
            "detail": str(exc)[:400],
        }
        print("FAIL", name, type(exc).__name__, str(exc)[:220], flush=True)
    save()


def ensure(value, message):
    if not value:
        raise AssertionError(message)


def login(admin=False):
    source = (
        Path(os.getenv("MLITE_QA_ADMIN_FILE", str(ROOT / "secrets/admin.local.json")))
        if admin
        else WORK / "account.json"
    )
    account = json.loads(source.read_text())
    result = request(
        "POST",
        "/auth/login",
        json={"username": account["username"], "password": account["password"]},
    )
    client.headers["Authorization"] = "Bearer " + result["access_token"]
    return result


def seed():
    check(
        "services.health",
        lambda: ensure(request("GET", "/health")["status"] == "healthy", "API unhealthy"),
    )
    check(
        "services.ready",
        lambda: ensure(request("GET", "/ready")["status"] == "ready", "API not ready"),
    )

    def signup():
        account_file = WORK / "account.json"
        if account_file.exists():
            login()
        else:
            account = {
                "username": STATE["prefix"],
                "email": STATE["prefix"] + "@example.test",
                "password": secrets.token_urlsafe(24),
                "full_name": "QA Solo Validation",
            }
            account_file.write_text(json.dumps(account))
            account_file.chmod(0o600)
            result = request("POST", "/auth/register", expected=201, json=account)
            client.headers["Authorization"] = "Bearer " + result["access_token"]
        me = request("GET", "/auth/me")
        ensure(me["role"] == "USER", "Self-registration must remain USER")
        STATE["user_id"] = me["id"]
        return {"role": me["role"], "username": me["username"]}

    check("auth.signup_standard_user", signup)
    check("auth.login", lambda: ensure(bool(login()["access_token"]), "No access token"))
    check(
        "auth.profile_update",
        lambda: ensure(
            request("PATCH", "/auth/me", json={"full_name": "QA Solo Validation"})["full_name"]
            == "QA Solo Validation",
            "Name not persisted",
        ),
    )

    def project():
        if "project" not in STATE["resources"]:
            result = request(
                "POST",
                "/projects/",
                expected=201,
                json={
                    "name": "QA Solo Iris Validation",
                    "slug": STATE["prefix"],
                    "description": "Real end-to-end validation. Created by QA; safe to identify separately.",
                },
            )
            STATE["resources"]["project"] = result
        result = request("GET", "/projects/" + STATE["resources"]["project"]["id"])
        ensure(result["slug"] == STATE["prefix"], "Project read differs")
        return {"id": result["id"], "slug": result["slug"]}

    check("projects.create_read", project)
    project_id = STATE["resources"]["project"]["id"]
    check(
        "projects.update",
        lambda: ensure(
            request(
                "PATCH",
                "/projects/" + project_id,
                json={
                    "description": "Validated with real Iris data, MLflow training, Docker inference and Evidently drift."
                },
            )["description"].startswith("Validated"),
            "Project update not persisted",
        ),
    )

    def disposable_project():
        project = request(
            "POST",
            "/projects/",
            expected=201,
            json={
                "name": "QA disposable project",
                "slug": STATE["prefix"] + "-tmp-" + secrets.token_hex(2),
            },
        )
        request("DELETE", "/projects/" + project["id"])
        ensure(
            request("GET", "/projects/" + project["id"])["status"].upper() == "ARCHIVED",
            "Archive failed",
        )
        request("PATCH", "/projects/" + project["id"], json={"status": "active"})
        ensure(
            request("GET", "/projects/" + project["id"])["status"].upper() == "ACTIVE",
            "Restore failed",
        )
        request("DELETE", "/projects/" + project["id"], params={"permanent": "true"})
        request("GET", "/projects/" + project["id"], expected=404)

    check("projects.archive_restore_delete_disposable", disposable_project)
    from sklearn.datasets import load_iris

    original = load_iris(as_frame=True).frame
    original.columns = ["sepal_length", "sepal_width", "petal_length", "petal_width", "species"]
    original.to_csv(WORK / "iris-reference.csv", index=False)
    drifted = original.copy()
    for column in ("sepal_length", "petal_length"):
        drifted[column] += 5.0
    drifted.to_csv(WORK / "iris-drift.csv", index=False)
    original.to_json(WORK / "iris-records.json", orient="records")
    original.to_parquet(WORK / "iris.parquet", index=False)

    def dataset(kind, filename, format):
        datasets = STATE["resources"].setdefault("datasets", {})
        if kind not in datasets:
            result = request(
                "POST",
                "/datasets/",
                expected=201,
                json={
                    "name": STATE["prefix"] + "-" + kind,
                    "project_id": project_id,
                    "format": format,
                    "description": "Real QA Iris dataset",
                },
            )
            datasets[kind] = result
            save()
        current = request("GET", "/datasets/" + datasets[kind]["id"])
        if current.get("hash_sha256") != hashlib.sha256((WORK / filename).read_bytes()).hexdigest():
            with (WORK / filename).open("rb") as stream:
                version = request(
                    "POST",
                    f"/datasets/{datasets[kind]['id']}/upload",
                    expected=201,
                    files={"file": (filename, stream, "application/octet-stream")},
                )
            datasets[kind]["version"] = version
            save()
        result = request("GET", "/datasets/" + datasets[kind]["id"])
        ensure(
            result["row_count"] == 150 and result["column_count"] == 5, "Dataset shape is incorrect"
        )
        ensure(
            result["hash_sha256"] == hashlib.sha256((WORK / filename).read_bytes()).hexdigest(),
            "Content checksum mismatch",
        )
        ensure(result.get("s3_key") is None, "Standard account must not receive storage internals")
        return {
            "rows": result["row_count"],
            "columns": result["column_count"],
            "version": result["version_num"],
        }

    for args in [
        ("reference", "iris-reference.csv", "CSV"),
        ("drift", "iris-drift.csv", "CSV"),
        ("json", "iris-records.json", "JSON"),
        ("parquet", "iris.parquet", "PARQUET"),
    ]:
        check("datasets.upload_" + args[0], lambda args=args: dataset(*args))
    reference_id = STATE["resources"]["datasets"]["reference"]["id"]
    check(
        "datasets.versions",
        lambda: ensure(
            len(request("GET", f"/datasets/{reference_id}/versions")) >= 1, "No dataset version"
        ),
    )
    check(
        "datasets.quality",
        lambda: ensure(
            request("POST", f"/datasets/{reference_id}/validate", expected=201)["rows_count"]
            == 150,
            "Quality report misses rows",
        ),
    )
    for endpoint in (
        "health/stats",
        "health/services",
        "settings/about",
        "experiments/",
        "models/",
        "deployments/",
        "monitoring/summary",
        "alerts/",
        "alerts/summary",
        "alerts/rules",
        "alerts/channels",
        "auth/security/activity",
    ):
        check(
            "dashboard.read_" + endpoint.strip("/").replace("/", "_"),
            lambda endpoint=endpoint: {
                "response_type": type(request("GET", "/" + endpoint)).__name__
            },
        )

    def personal_audit():
        result = request("GET", "/audit/me/logs", params={"limit": 100, "user_id": "other-user"})
        ensure(len(result["logs"]) > 0, "No personal audit entries")
        ensure(
            all(item["user_id"] == STATE["user_id"] for item in result["logs"]),
            "Another actor leaked into personal audit",
        )
        return {"entries": len(result["logs"])}

    check("security.personal_audit", personal_audit)
    for endpoint in ("users", "audit/logs", "settings/storage/"):
        check(
            "security.admin_denied_" + endpoint.replace("/", "_"),
            lambda endpoint=endpoint: request("GET", "/" + endpoint, expected=403),
        )

    def api_key():
        result = request(
            "POST", "/auth/api-keys", expected=201, json={"name": "QA temporary key", "scopes": {}}
        )
        with httpx.Client(base_url=BASE, headers={"X-API-Key": result["key"]}, timeout=30) as keyed:
            ensure(keyed.get("/auth/me").status_code == 200, "API key cannot authenticate")
            request("DELETE", "/auth/api-keys/" + result["id"], expected=204)
            ensure(keyed.get("/auth/me").status_code == 401, "Revoked key remains usable")

    check("security.api_key_create_use_revoke", api_key)
    admin_file = Path(os.getenv("MLITE_QA_ADMIN_FILE", str(ROOT / "secrets/admin.local.json")))
    if not admin_file.exists():
        print("SKIP administrator checks: provide MLITE_QA_ADMIN_FILE", flush=True)
        return
    login(admin=True)
    check(
        "admin.storage_inventory",
        lambda: {"response_type": type(request("GET", "/settings/storage/")).__name__},
    )
    check(
        "admin.accounts_protected_view",
        lambda: ensure(request("GET", "/users")["total"] >= 1, "Admin account list unavailable"),
    )
    admin_logs = request("GET", "/audit/logs")["logs"]
    other = next(item for item in admin_logs if item["user_id"] != STATE["user_id"])
    login()
    check(
        "security.other_actor_entry_denied",
        lambda: request("GET", "/audit/me/logs/" + other["id"], expected=404),
    )


def train():
    import subprocess

    login()
    records = STATE["resources"].setdefault("training", [])
    model_name = STATE["resources"].get("model_name", STATE["prefix"] + "-iris-final")
    STATE["resources"]["model_name"] = model_name
    for version in (1, 2):

        def train_version(version=version):
            if len(records) >= version:
                return records[version - 1]
            payload = {
                "prefix": STATE["prefix"],
                "version": version,
                "csv": (WORK / "iris-reference.csv").read_text(),
            }
            completed = subprocess.run(
                [
                    "docker",
                    "compose",
                    "exec",
                    "-T",
                    "mlflow",
                    "python",
                    "-c",
                    Path(__file__).with_name("train_iris.py").read_text(),
                ],
                input=json.dumps(payload),
                text=True,
                capture_output=True,
                timeout=180,
                cwd=ROOT,
            )
            if completed.returncode:
                (WORK / "training-container-error.log").write_text(completed.stderr)
                raise AssertionError(
                    "Container training failed; inspect training-container-error.log"
                )
            line = next(
                line for line in completed.stdout.splitlines() if line.startswith("QA_RESULT=")
            )
            result = json.loads(line.split("=", 1)[1])
            ensure(result["metrics"]["accuracy"] >= 0.85, "Holdout accuracy below .85")
            STATE["resources"]["experiment_id"] = result["experiment_id"]
            registered = request(
                "POST",
                "/models/register",
                expected=201,
                json={
                    "name": model_name,
                    "run_id": result["run_id"],
                    "project_slug": STATE["prefix"],
                },
            )
            ensure(registered["version"] == version, "Unexpected model version")
            result["registered_id"] = registered["id"]
            records.append(result)
            return result

        check("training.real_model_v" + str(version), train_version)
    for version in (1, 2):
        check(
            "models.validation_v" + str(version),
            lambda version=version: request(
                "GET", f"/models/{model_name}/versions/{version}/validation"
            ),
        )
        check(
            "models.lineage_v" + str(version),
            lambda version=version: request(
                "GET", f"/models/{model_name}/versions/{version}/lineage"
            ),
        )
    if records:
        experiment_id = STATE["resources"]["experiment_id"]
        run_id = records[0]["run_id"]
        check(
            "experiments.real_runs",
            lambda: ensure(
                len(request("GET", f"/experiments/{experiment_id}/runs")["runs"]) >= 2,
                "Training runs not visible",
            ),
        )
        check(
            "experiments.metric_history",
            lambda: ensure(
                len(
                    request(
                        "GET",
                        f"/experiments/{experiment_id}/runs/{run_id}/metric-history",
                        params={"metric": "loss"},
                    )["points"]
                )
                == 3,
                "Missing loss history",
            ),
        )
        check(
            "experiments.artifacts",
            lambda: request("GET", f"/experiments/{experiment_id}/runs/{run_id}/artifacts"),
        )
    check(
        "models.promote_staging",
        lambda: request(
            "POST", f"/models/{model_name}/versions/1/promote", json={"stage": "STAGING"}
        ),
    )
    check(
        "models.promote_production",
        lambda: request(
            "POST", f"/models/{model_name}/versions/1/promote", json={"stage": "PRODUCTION"}
        ),
    )
    save()


def monitor():
    login()
    model = STATE["resources"]["model_name"]
    datasets = STATE["resources"]["datasets"]
    reference = datasets["reference"]["id"]

    def quality(kind):
        dataset_id = datasets[kind]["id"]
        report = request("POST", f"/datasets/{dataset_id}/validate", expected=201)
        ensure(report["rows_count"] == 150, "Quality report must describe the real file")
        metadata = request("GET", "/datasets/" + dataset_id)
        ensure(metadata.get("quality_score") == report["score"], "Catalog quality score is missing")
        ensure(metadata.get("has_storage_reference"), "Private storage metadata flag missing")
        return {"score": report["score"], "status": report["status"], "rows": report["rows_count"]}

    for kind in ("reference", "json", "parquet"):
        check("datasets.quality_" + kind, lambda kind=kind: quality(kind))

    def drift(kind):
        result = request(
            "POST",
            "/monitoring/drift/check",
            expected=201,
            json={
                "model_name": model,
                "reference_dataset_id": reference,
                "current_dataset_id": datasets[kind]["id"],
            },
        )
        if kind == "reference":
            ensure(result["drift_share"] == 0, "Identical data should not drift")
        else:
            ensure(result["drift_share"] >= 0.3, "Strongly shifted real data should drift")
        STATE["resources"].setdefault("drift", {})[kind] = result
        html = request("GET", f"/monitoring/reports/{result['id']}/html")
        ensure("<html" in html.lower() or "<!doctype" in html.lower(), "No standalone HTML report")
        ensure(
            result.get("metrics", {}).get("mlite_engine") == "evidently",
            "Expected real Evidently engine",
        )
        (WORK / ("drift-" + kind + ".html")).write_text(html)
        return {
            "share": result["drift_share"],
            "status": result["drift_status"],
            "html_bytes": len(html.encode()),
            "features": result.get("drifted_features"),
        }

    check("monitoring.no_drift_reference", lambda: drift("reference"))
    check("monitoring.strong_drift", lambda: drift("drift"))
    check(
        "monitoring.unique_report_objects",
        lambda: ensure(
            STATE["resources"]["drift"]["reference"]["html_report_path"]
            != STATE["resources"]["drift"]["drift"]["html_report_path"],
            "Reports overwrite each other",
        ),
    )

    def alerts():
        channels = request("GET", "/alerts/channels")
        ensure(
            not channels, "External notification channels configured; skip global rule evaluation"
        )
        ensure(
            not any(rule["enabled"] for rule in request("GET", "/alerts/rules")),
            "Enabled rules already exist; use an isolated QA installation for rule evaluation",
        )
        rule = request(
            "POST",
            "/alerts/rules",
            expected=201,
            json={
                "name": STATE["prefix"] + "-drift-rule",
                "metric": "drift_share",
                "operator": ">",
                "threshold": 0.2,
                "model_name": model,
                "severity": "WARNING",
            },
        )
        STATE["resources"]["alert_rule"] = rule
        evaluated = request("POST", "/alerts/rules/evaluate")
        triggered = [a for a in evaluated["triggered"] if a.get("model_name") == model]
        ensure(triggered, "No alert triggered from the measured drift")
        alert = triggered[0]
        ensure(
            alert["project_id"] == STATE["resources"]["project"]["id"],
            "Alert lost project association",
        )
        STATE["resources"]["alert_id"] = alert["id"]
        ensure(
            request("POST", "/alerts/" + alert["id"] + "/acknowledge")["status"] == "ACKNOWLEDGED",
            "Acknowledge did not persist",
        )
        ensure(
            request("POST", "/alerts/" + alert["id"] + "/resolve")["status"] == "RESOLVED",
            "Resolve did not persist",
        )
        request("PATCH", "/alerts/rules/" + rule["id"], json={"enabled": False})
        return {"rule_id": rule["id"], "alert_id": alert["id"], "resolved": True}

    check("alerts.real_rule_trigger_acknowledge_resolve", alerts)
    for path in (
        "/datasets/inspect?file_path=/app/examples/iris/data/iris.csv",
        f"/datasets/{reference}/validate?file_path=/app/examples/iris/data/iris.csv",
    ):
        check(
            "security.server_path_denied_" + ("inspect" if "inspect" in path else "validate"),
            lambda path=path: request("GET" if "inspect" in path else "POST", path, expected=403),
        )
    check(
        "security.server_path_version_denied",
        lambda: request(
            "POST",
            f"/datasets/{reference}/versions",
            expected=403,
            json={"file_path": "/app/examples/iris/data/iris.csv"},
        ),
    )
    check(
        "monitoring.summary_after_drift",
        lambda: ensure(
            len(
                request("GET", "/monitoring/summary", params={"model_name": model})["drift_history"]
            )
            >= 2,
            "Real drift history missing",
        ),
    )
    save()


def serve(verify_only=False):
    import pandas as pd

    login()
    model = STATE["resources"]["model_name"]
    project_id = STATE["resources"]["project"]["id"]
    frame = pd.read_csv(WORK / "iris-reference.csv")
    features = list(frame.columns[:-1])
    samples = frame.iloc[[0, 50, 130]]

    def deploy(version):
        result = request(
            "POST",
            "/deployments/",
            expected=201,
            json={"model_name": model, "model_version": version, "project_id": project_id},
        )
        STATE["resources"]["deployment_v" + str(version)] = result
        ensure(
            result["status"] == "RUNNING",
            "Container did not load its real artifact: " + str(result.get("error_message")),
        )
        return {"id": result["id"], "port": result["port"], "status": result["status"]}

    if not verify_only:
        # A repeated cycle only stops deployments recorded by this QA session.
        for key in ("deployment_v1", "deployment_v2", "demo_deployment"):
            previous = STATE["resources"].get(key)
            if previous and previous["model_name"] == model:
                current = request("GET", "/deployments/" + previous["id"])
                if current["status"] == "RUNNING":
                    request("POST", "/deployments/" + previous["id"] + "/stop")
        check("deployments.real_container_v1", lambda: deploy(1))
    deployment = STATE["resources"].get("demo_deployment" if verify_only else "deployment_v1")
    if not deployment or deployment["status"] != "RUNNING":
        raise RuntimeError("No running QA deployment; run the serve phase first")
    endpoint = BASE + f"/deployments/{deployment['id']}"

    def inference():
        with httpx.Client(base_url=endpoint, headers=dict(client.headers), timeout=30) as scoring:
            ensure(scoring.get("/ready").status_code == 200, "Real model not ready")
            metadata = scoring.get("/metadata").json()
            ensure(
                [feature["name"] for feature in metadata["features"]] == features,
                "Named model signature missing",
            )
            rows = samples[features].values.tolist()
            expected = scoring.post("/predict", json={"inputs": rows}).json()["predictions"]
            ensure(expected == [0, 1, 2], "Unexpected Iris predictions")
            for payload in (
                {"dataframe_records": samples[features].to_dict(orient="records")},
                {
                    "dataframe_split": {
                        "columns": features[::-1],
                        "data": samples[features[::-1]].values.tolist(),
                    }
                },
            ):
                response = scoring.post("/predict", json=payload)
                ensure(
                    response.status_code == 200 and response.json()["predictions"] == expected,
                    "Prediction formats disagree",
                )
            ensure(
                scoring.post("/predict", json={}).status_code == 422,
                "Empty prediction payload accepted",
            )
            labelled = pd.concat([frame.iloc[:10], frame.iloc[50:60], frame.iloc[100:110]])
            prediction = scoring.post(
                "/predict", json={"inputs": labelled[features].values.tolist()}
            ).json()
            for index, (truth, value) in enumerate(
                zip(labelled["species"].tolist(), prediction["predictions"])
            ):
                request(
                    "POST",
                    f"/deployments/{deployment['id']}/feedback",
                    expected=201,
                    json={
                        "prediction_id": STATE["prefix"]
                        + "-prediction-"
                        + secrets.token_hex(6)
                        + "-"
                        + str(index),
                        "ground_truth": truth,
                        "predicted_value": value,
                        "latency_ms": prediction["latency_ms"],
                    },
                )
            for _ in range(25):
                scoring.post("/predict", json={"inputs": rows})
            return {"predictions": expected, "formats": 3, "labelled_predictions": len(labelled)}

    check("inference.real_predictions_formats_and_feedback", inference)

    def performance():
        records = request("GET", "/monitoring/performance/" + model)
        ensure(
            records and records[0]["sample_count"] >= 30,
            "Feedback never reached performance history",
        )
        ensure(
            records[0]["metrics"]["accuracy"] >= 0.9 and records[0]["metrics"]["f1"] >= 0.9,
            "Unexpected live Iris performance",
        )
        return {"samples": records[0]["sample_count"], "metrics": records[0]["metrics"]}

    check("monitoring.performance_from_real_feedback", performance)

    def telemetry():
        readings = []
        for _ in range(20):
            readings = request("GET", f"/deployments/{deployment['id']}/metrics")
            if any(row["memory_mb"] > 0 and row["latency_p95_ms"] is not None for row in readings):
                break
            time.sleep(2)
        ensure(
            readings
            and any(
                row["requests_count"] > 0 and row["latency_p95_ms"] is not None for row in readings
            ),
            "No persisted measured latency telemetry",
        )
        ensure(any(row["memory_mb"] > 0 for row in readings), "Container memory was never measured")
        return {
            "points": len(readings),
            "requests": sum(row["requests_count"] for row in readings),
            "memory_mb": readings[0]["memory_mb"],
            "p95_ms": readings[0]["latency_p95_ms"],
        }

    check("monitoring.measured_latency_and_container_memory", telemetry)
    if verify_only:
        save()
        return
    check(
        "deployments.stop_v1",
        lambda: ensure(
            request("POST", f"/deployments/{deployment['id']}/stop")["status"] == "STOPPED",
            "Container stop not persisted",
        ),
    )
    check(
        "models.promote_v2",
        lambda: request(
            "POST", f"/models/{model}/versions/2/promote", json={"stage": "PRODUCTION"}
        ),
    )
    check("deployments.real_container_v2", lambda: deploy(2))
    deployment_v2 = STATE["resources"].get("deployment_v2")
    if deployment_v2 and deployment_v2["status"] == "RUNNING":

        def rollback():
            result = request(
                "POST",
                f"/deployments/{deployment_v2['id']}/rollback",
                expected=201,
                json={
                    "target_version": 1,
                    "reason": "QA acceptance: restore the known good real Iris model.",
                },
            )
            ensure(
                result["status"] == "COMPLETED",
                "Rollback failed: " + str(result.get("error_message")),
            )
            running = [
                item
                for item in request("GET", "/deployments/")["deployments"]
                if item["model_name"] == model and item["status"] == "RUNNING"
            ]
            ensure(
                running and all(item["model_version"] == 1 for item in running),
                "Rollback did not restore v1 serving",
            )
            STATE["resources"]["demo_deployment"] = running[0]
            with httpx.Client(timeout=30, headers=dict(client.headers)) as scoring:
                response = scoring.post(
                    BASE + f"/deployments/{running[0]['id']}/predict", json={"inputs": [[5.1, 3.5, 1.4, 0.2]]}
                )
                ensure(
                    response.status_code == 200 and response.json()["predictions"] == [0],
                    "Restored model cannot predict",
                )
            return {
                "from_version": result["from_version"],
                "to_version": result["to_version"],
                "endpoint": running[0]["endpoint_url"],
            }

        check("rollback.real_restore_and_prediction", rollback)
    check(
        "validation.invalid_promotion_stage",
        lambda: request(
            "POST",
            f"/models/{model}/versions/1/promote",
            expected=422,
            json={"stage": "NOT_A_STAGE"},
        ),
    )
    check(
        "validation.unregistered_deployment",
        lambda: request(
            "POST",
            "/deployments/",
            expected=422,
            json={"model_name": STATE["prefix"] + "-missing", "model_version": 1},
        ),
    )
    save()


def security():
    login()
    account_file = WORK / "account.json"
    account = json.loads(account_file.read_text())
    ensure(
        account["username"].startswith("qa-solo-") and account["email"].endswith("@example.test"),
        "Credential checks require the disposable QA account",
    )
    check(
        "security.invalid_login_denied",
        lambda: request(
            "POST",
            "/auth/login",
            expected=401,
            json={"username": account["username"], "password": "QA-wrong-password"},
        ),
    )
    check(
        "security.invalid_refresh_denied",
        lambda: request("POST", "/auth/refresh", expected=401, json={"refresh_token": "invalid"}),
    )
    check(
        "security.profile_role_injection_denied",
        lambda: request(
            "PATCH",
            "/auth/me",
            expected=422,
            json={"full_name": "QA Solo Validation", "role": "ADMIN"},
        ),
    )

    def refresh():
        result = login()
        tokens = request("POST", "/auth/refresh", json={"refresh_token": result["refresh_token"]})
        with httpx.Client(
            base_url=BASE, headers={"Authorization": "Bearer " + tokens["access_token"]}
        ) as refreshed:
            ensure(
                refreshed.get("/auth/me").json()["id"] == STATE["user_id"],
                "Refresh changed identity",
            )

    check("auth.refresh_real_token", refresh)

    def anonymous():
        with httpx.Client(base_url=BASE) as public:
            ensure(public.get("/auth/me").status_code == 401, "Anonymous profile access allowed")

    check("security.anonymous_profile_denied", anonymous)

    def password():
        original = account["password"]
        replacement = secrets.token_urlsafe(24)
        request(
            "POST",
            "/auth/password",
            expected=400,
            json={
                "current_password": "QA-wrong-password",
                "new_password": replacement,
                "confirm_password": replacement,
            },
        )
        request(
            "POST",
            "/auth/password",
            json={
                "current_password": original,
                "new_password": replacement,
                "confirm_password": replacement,
            },
        )
        account["password"] = replacement
        account_file.write_text(json.dumps(account))
        account_file.chmod(0o600)
        try:
            login()
        finally:
            request(
                "POST",
                "/auth/password",
                json={
                    "current_password": replacement,
                    "new_password": original,
                    "confirm_password": original,
                },
            )
            account["password"] = original
            account_file.write_text(json.dumps(account))
            account_file.chmod(0o600)
        login()
        return {"changed_and_restored": True}

    check("security.qa_password_change_login_restore", password)


def storage():
    login()
    check(
        "security.storage_bucket_create_denied",
        lambda: request(
            "POST",
            "/settings/storage/buckets",
            expected=403,
            json={"name": STATE["prefix"] + "-forbidden"},
        ),
    )
    login(admin=True)
    check(
        "admin.storage_live_connection",
        lambda: ensure(
            request("POST", "/settings/storage/test")["connected"], "Storage connection failed"
        ),
    )
    check(
        "admin.invalid_bucket_rejected",
        lambda: request(
            "POST", "/settings/storage/buckets", expected=422, json={"name": "INVALID_BUCKET"}
        ),
    )

    def bucket():
        name = STATE["resources"].get("qa_bucket")
        if not name:
            name = STATE["prefix"] + "-storage-" + secrets.token_hex(2)
            request("POST", "/settings/storage/buckets", expected=201, json={"name": name})
            STATE["resources"]["qa_bucket"] = name
            save()
        request("POST", "/settings/storage/buckets", expected=409, json={"name": name})
        inventory = request("GET", "/settings/storage/")
        ensure(
            any(item["name"] == name for item in inventory["buckets"]),
            "Created bucket missing from inventory",
        )
        return {"bucket": name, "duplicate_rejected": True}

    check("admin.real_bucket_create_inventory_duplicate", bucket)
    login()


def validation():
    login()
    deployment_id = STATE["resources"]["demo_deployment"]["id"]
    cases = [
        {},
        {"prediction_id": "qa-invalid", "ground_truth": [1], "predicted_value": 1},
        {"prediction_id": "qa-invalid", "ground_truth": 1, "latency_ms": -1},
    ]
    for index, payload in enumerate(cases):
        check(
            "validation.feedback_rejects_invalid_" + str(index),
            lambda payload=payload: request(
                "POST", f"/deployments/{deployment_id}/feedback", expected=422, json=payload
            ),
        )

    def secret_echo():
        sentinel = "QA-sensitive-input-" + secrets.token_hex(12)
        response = client.post(
            "/auth/password",
            json={
                "current_password": sentinel,
                "new_password": "QA-replacement-value-1",
                "confirm_password": "QA-replacement-value-2",
            },
        )
        ensure(response.status_code == 422, "Custom validator must return 422")
        ensure(
            sentinel not in response.text and "QA-replacement-value-1" not in response.text,
            "Validation response echoed credentials",
        )
        return {"status": 422, "input_omitted": True}

    check("security.validation_does_not_echo_credentials", secret_echo)


def regression():
    """Verify continuous targets through a real registered artifact and serving container."""
    import subprocess

    import numpy as np

    login()
    resource = STATE["resources"].setdefault("regression", {})
    model = STATE["prefix"] + "-regression"

    def training():
        if "training" not in resource:
            completed = subprocess.run(
                [
                    "docker",
                    "compose",
                    "exec",
                    "-T",
                    "mlflow",
                    "python",
                    "-c",
                    Path(__file__).with_name("train_regression.py").read_text(),
                ],
                input=json.dumps({"prefix": STATE["prefix"]}),
                text=True,
                capture_output=True,
                timeout=180,
                cwd=ROOT,
            )
            if completed.returncode:
                (WORK / "regression-training-error.log").write_text(completed.stderr)
                raise AssertionError("Real regression training failed; inspect private QA log")
            line = next(
                line for line in completed.stdout.splitlines() if line.startswith("QA_RESULT=")
            )
            trained = json.loads(line.split("=", 1)[1])
            request(
                "POST",
                "/models/register",
                expected=201,
                json={
                    "name": model,
                    "run_id": trained["run_id"],
                    "project_slug": STATE["prefix"],
                },
            )
            resource["training"] = trained
            save()
        trained = resource["training"]
        return {key: trained[key] for key in ("run_id", "metrics", "dataset_rows", "holdout_rows")}

    check("regression.real_training_and_registration", training)

    def deploy():
        deployment = resource.get("deployment")
        if deployment:
            deployment = request("GET", "/deployments/" + deployment["id"])
        if not deployment or deployment["status"] != "RUNNING":
            # Intentionally omit task_type to exercise registered-metric detection.
            deployment = request(
                "POST",
                "/deployments/",
                expected=201,
                json={
                    "model_name": model,
                    "model_version": 1,
                },
            )
            resource["deployment"] = deployment
            save()
        ensure(deployment["status"] == "RUNNING", "Regression container is not ready")
        ensure(
            deployment["project_id"] == STATE["resources"]["project"]["id"],
            "Model project was lost",
        )
        return {"id": deployment["id"], "status": deployment["status"]}

    check("regression.real_deployment_default_task", deploy)
    trained, deployment = resource["training"], resource["deployment"]

    def predict_and_label():
        with httpx.Client(base_url=BASE + f"/deployments/{deployment['id']}", headers=dict(client.headers), timeout=30) as scoring:
            predicted = scoring.post("/predict", json={"inputs": trained["inputs"]})
            predicted.raise_for_status()
            values = predicted.json()["predictions"]
            ensure(
                np.allclose(values, trained["predictions"], rtol=1e-6),
                "Serving differs from trained regression",
            )
            reversed_columns = trained["columns"][::-1]
            reversed_rows = [row[::-1] for row in trained["inputs"]]
            split = scoring.post(
                "/predict",
                json={
                    "dataframe_split": {
                        "columns": reversed_columns,
                        "data": reversed_rows,
                    }
                },
            )
            split.raise_for_status()
            ensure(
                np.allclose(split.json()["predictions"], values),
                "Regression feature order changed predictions",
            )
        for truth, value in zip(trained["truth"], values):
            request(
                "POST",
                f"/deployments/{deployment['id']}/feedback",
                expected=201,
                json={
                    "prediction_id": STATE["prefix"] + "-reg-" + secrets.token_hex(6),
                    "ground_truth": truth,
                    "predicted_value": value,
                },
            )
        report = request("GET", "/monitoring/performance/" + model)[0]
        ensure(
            report["task_type"] == "regression", "Continuous model was treated as classification"
        )
        expected_rmse = float(np.sqrt(np.mean((np.asarray(values) - trained["truth"]) ** 2)))
        ensure(
            abs(report["metrics"]["rmse"] - expected_rmse) < 0.001,
            "RMSE differs from real predictions",
        )
        resource["performance"] = report
        return {
            "samples": report["sample_count"],
            "task": report["task_type"],
            "metrics": report["metrics"],
        }

    check("regression.predictions_feedback_and_real_rmse", predict_and_label)

    def invalid_label_and_recovery():
        before = request("GET", "/monitoring/performance/" + model)[0]["sample_count"]
        request(
            "POST",
            f"/deployments/{deployment['id']}/feedback",
            expected=422,
            json={
                "prediction_id": STATE["prefix"] + "-reg-invalid",
                "ground_truth": 1.5,
                "predicted_value": "not-a-number",
            },
        )
        request(
            "POST",
            f"/deployments/{deployment['id']}/feedback",
            expected=201,
            json={
                "prediction_id": STATE["prefix"] + "-reg-recovery-" + secrets.token_hex(6),
                "ground_truth": trained["truth"][0],
                "predicted_value": trained["predictions"][0],
            },
        )
        report = request("GET", "/monitoring/performance/" + model)[0]
        ensure(report["sample_count"] == before + 1, "Rejected feedback poisoned later metrics")
        return {
            "invalid_label_status": 422,
            "valid_after_rejection": True,
            "samples": report["sample_count"],
        }

    check("regression.invalid_feedback_rolls_back_then_recovers", invalid_label_and_recovery)
    check(
        "regression.stop_qa_container",
        lambda: ensure(
            request("POST", f"/deployments/{deployment['id']}/stop")["status"] == "STOPPED",
            "QA regression container did not stop",
        ),
    )


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument(
        "phase",
        choices=[
            "seed",
            "train",
            "monitor",
            "serve",
            "verify_demo",
            "security",
            "storage",
            "validation",
            "regression",
        ],
    )
    args = parser.parse_args()
    serve(True) if args.phase == "verify_demo" else globals()[args.phase]()
    print(
        "RESULT",
        sum(item["status"] == "PASS" for item in STATE["checks"].values()),
        "passed,",
        sum(item["status"] == "FAIL" for item in STATE["checks"].values()),
        "failed",
        flush=True,
    )

    raise SystemExit(1 if any(item["status"] == "FAIL" for item in STATE["checks"].values()) else 0)
