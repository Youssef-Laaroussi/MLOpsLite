"""Unit tests for FastAPI core application (Issue #6).

Tests the application factory, modular routing, middleware,
exception handlers, CORS, and OpenAPI schema without running any
external dependencies (DB, MinIO, MLflow).
"""

import asyncio

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.config import Settings, get_settings
from apps.api.errors import ConflictError, MLiteAPIError, NotFoundError
from apps.api.main import create_app

# ── Helpers ─────────────────────────────────────────────────


def _run(coro):
    """Run a coroutine in a new event loop (pytest-asyncio compat)."""
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


async def _get(app, path, headers=None):
    """Perform an async GET request against the test app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.get(path, headers=headers or {})


async def _post(app, path, json=None, headers=None):
    """Perform an async POST request against the test app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.post(path, json=json, headers=headers or {})


async def _delete(app, path, headers=None):
    """Perform an async DELETE request against the test app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.delete(path, headers=headers or {})


async def _options(app, path, headers=None):
    """Perform an async OPTIONS request against the test app."""
    transport = ASGITransport(app=app)
    async with AsyncClient(transport=transport, base_url="http://test") as ac:
        return await ac.options(path, headers=headers or {})


# ── Fixtures ────────────────────────────────────────────────


@pytest.fixture
def app():
    """Create a fresh FastAPI instance for each test."""
    return create_app()


# ── Application factory tests ──────────────────────────────


class TestAppFactory:
    """Verify the application factory produces a correctly configured app."""

    def test_app_title(self, app):
        assert app.title == "MLite API"

    def test_app_version(self, app):
        assert app.version == "0.1.0"

    def test_docs_url(self, app):
        assert app.docs_url == "/docs"

    def test_redoc_url(self, app):
        assert app.redoc_url == "/redoc"

    def test_openapi_url(self, app):
        assert app.openapi_url == "/openapi.json"


# ── Health & system endpoints ──────────────────────────────


class TestHealthEndpoints:
    """Test /api/v1/health, /api/v1/ready, /api/v1/info."""

    def test_health_check(self, app):
        resp = _run(_get(app, "/api/v1/health"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["version"] == "0.1.0"
        assert "timestamp" in data

    def test_readiness_check(self, app):
        resp = _run(_get(app, "/api/v1/ready"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ready"
        assert "checks" in data
        for service in ("database", "storage", "tracking"):
            assert data["checks"][service] == "ok"

    def test_app_info(self, app):
        resp = _run(_get(app, "/api/v1/info"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "MLite API"
        assert data["version"] == "0.1.0"
        assert data["docs_url"] == "/docs"

    def test_legacy_health(self, app):
        resp = _run(_get(app, "/health"))
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_legacy_ready(self, app):
        resp = _run(_get(app, "/ready"))
        assert resp.status_code == 200
        assert resp.json()["status"] == "ready"

    def test_health_stats(self, app):
        resp = _run(_get(app, "/api/v1/health/stats"))
        assert resp.status_code == 200
        data = resp.json()
        assert "projects_count" in data
        assert "models_count" in data
        assert "datasets_count" in data
        assert "experiments_count" in data
        assert "active_deployments" in data
        assert "stages" in data
        assert "funnel" in data
        assert "benchmarks" in data
        assert "latency_telemetry" in data
        assert "drift_trajectory" in data
        assert data["system_healthy"] is True


# ── Scaffold routers ──────────────────────────────────────


class TestScaffoldRouters:
    """Verify that all placeholder routers respond correctly."""

    def test_list_projects(self, authed_app):
        resp = _run(_get(authed_app, "/api/v1/projects/"))
        assert resp.status_code == 200
        data = resp.json()
        assert data.get("projects") == []
        assert data.get("total") == 0

    def test_list_datasets(self, authed_app):
        resp = _run(_get(authed_app, "/api/v1/datasets/"))
        assert resp.status_code == 200
        assert resp.json() == {"datasets": [], "total": 0}

    def test_dvc_status(self, authed_app):
        resp = _run(_get(authed_app, "/api/v1/datasets/dvc/status"))
        assert resp.status_code == 200
        data = resp.json()
        assert "is_installed" in data
        assert "remote_name" in data
        assert "remote_bucket" in data
        assert "minio_endpoint" in data


    def test_list_experiments(self, authed_app):
        resp = _run(_get(authed_app, "/api/v1/experiments/"))
        assert resp.status_code == 200
        data = resp.json()
        assert "experiments" in data
        assert isinstance(data.get("experiments"), list)

    def test_experiment_lifecycle(self, authed_app):
        import uuid
        exp_name = f"pytest-exp-{uuid.uuid4().hex[:6]}"
        # Create experiment
        create_resp = _run(_post(authed_app, "/api/v1/experiments/", {"name": exp_name, "tags": {"team": "qa"}}))
        assert create_resp.status_code == 201
        created = create_resp.json()
        assert created["name"] == exp_name
        exp_id = created["experiment_id"]

        # List runs (should be 0)
        runs_resp = _run(_get(authed_app, f"/api/v1/experiments/{exp_id}/runs"))
        assert runs_resp.status_code == 200
        assert runs_resp.json()["runs"] == []

        # Delete experiment
        del_resp = _run(_delete(authed_app, f"/api/v1/experiments/{exp_id}"))
        assert del_resp.status_code == 204

    def test_list_models(self, authed_app):
        resp = _run(_get(authed_app, "/api/v1/models/"))
        assert resp.status_code == 200
        assert resp.json() == {"models": [], "total": 0}

    def test_list_deployments(self, authed_app):
        resp = _run(_get(authed_app, "/api/v1/deployments/"))
        assert resp.status_code == 200
        assert resp.json() == {"deployments": [], "total": 0}

    def test_list_monitoring(self, authed_app):
        resp = _run(_get(authed_app, "/api/v1/monitoring/"))
        assert resp.status_code == 200
        assert resp.json() == {"reports": [], "total": 0}

    def test_list_alerts(self, authed_app):
        resp = _run(_get(authed_app, "/api/v1/alerts/"))
        assert resp.status_code == 200
        assert resp.json() == {"alerts": [], "total": 0}


# ── OpenAPI schema ─────────────────────────────────────────


class TestOpenAPISchema:
    """Verify the OpenAPI specification is correctly generated."""

    def test_openapi_json(self, app):
        resp = _run(_get(app, "/openapi.json"))
        assert resp.status_code == 200
        schema = resp.json()
        assert schema["info"]["title"] == "MLite API"
        assert schema["info"]["version"] == "0.1.0"

    def test_openapi_paths_include_all_routers(self, app):
        resp = _run(_get(app, "/openapi.json"))
        paths = resp.json()["paths"]
        expected = [
            "/api/v1/health",
            "/api/v1/ready",
            "/api/v1/info",
            "/api/v1/projects/",
            "/api/v1/datasets/",
            "/api/v1/experiments/",
            "/api/v1/models/",
            "/api/v1/deployments/",
            "/api/v1/monitoring/",
            "/api/v1/alerts/",
        ]
        for path in expected:
            assert path in paths, f"Missing path: {path}"

    def test_openapi_tags(self, app):
        resp = _run(_get(app, "/openapi.json"))
        schema = resp.json()
        tag_names = set()
        for path_item in schema["paths"].values():
            for operation in path_item.values():
                if isinstance(operation, dict) and "tags" in operation:
                    tag_names.update(operation["tags"])
        for expected in (
            "System",
            "Projects",
            "Datasets",
            "Experiments",
            "Models",
            "Deployments",
            "Monitoring",
            "Alerts",
        ):
            assert expected in tag_names, f"Missing tag: {expected}"


# ── Middleware ──────────────────────────────────────────────


class TestMiddleware:
    """Verify custom middleware behaviour."""

    def test_request_id_header_auto_generated(self, app):
        resp = _run(_get(app, "/api/v1/health"))
        assert "x-request-id" in resp.headers

    def test_request_id_echoed_back(self, app):
        custom_id = "test-req-42"
        resp = _run(_get(app, "/api/v1/health", headers={"X-Request-ID": custom_id}))
        assert resp.headers["x-request-id"] == custom_id


# ── CORS ────────────────────────────────────────────────────


class TestCORS:
    """Verify CORS preflight requests are handled correctly."""

    def test_cors_preflight(self, app):
        resp = _run(
            _options(
                app,
                "/api/v1/health",
                headers={
                    "Origin": "http://localhost:3000",
                    "Access-Control-Request-Method": "GET",
                },
            )
        )
        assert resp.status_code == 200
        assert "access-control-allow-origin" in resp.headers

    def test_cors_allows_configured_origin(self, app):
        resp = _run(_get(app, "/api/v1/health", headers={"Origin": "http://localhost:3000"}))
        assert resp.headers.get("access-control-allow-origin") == "http://localhost:3000"


# ── Error handling ─────────────────────────────────────────


class TestErrorHandling:
    """Verify exception handler wiring."""

    def test_404_for_unknown_route(self, app):
        resp = _run(_get(app, "/api/v1/nonexistent"))
        assert resp.status_code in (404, 405)

    def test_mlite_api_error_defaults(self):
        err = MLiteAPIError()
        assert err.status_code == 500
        assert err.message == "An internal error occurred"

    def test_not_found_error(self):
        err = NotFoundError("Project", "abc-123")
        assert err.status_code == 404
        assert "abc-123" in err.message

    def test_conflict_error(self):
        err = ConflictError("Dataset already registered")
        assert err.status_code == 409


# ── Settings ───────────────────────────────────────────────


class TestSettings:
    """Verify pydantic-settings load with defaults."""

    def test_default_values(self):
        s = Settings()
        assert s.app_name == "MLite API"
        assert s.app_version == "0.1.0"
        assert s.debug is False
        assert s.port == 8000

    def test_get_settings_returns_same_instance(self):
        a = get_settings()
        b = get_settings()
        assert a is b
