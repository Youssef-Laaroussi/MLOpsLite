"""Unit tests for FastAPI core application (Issue #6).

Tests the application factory, modular routing, middleware,
exception handlers, and OpenAPI schema without running any
external dependencies (DB, MinIO, MLflow).
"""

import asyncio
import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.config import Settings, get_settings
from apps.api.errors import MLiteAPIError, NotFoundError, ConflictError
from apps.api.main import create_app


# ── Fixtures ────────────────────────────────────────────────


@pytest.fixture
def app():
    """Create a fresh FastAPI instance for each test."""
    return create_app()


@pytest.fixture
def client(app):
    """Sync wrapper that returns an async client context manager helper."""
    return app


# ── Helpers ─────────────────────────────────────────────────


def _run(coro):
    """Run a coroutine in a new event loop (pytest-asyncio 1.x compat)."""
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

    def test_health_check(self, client):
        resp = _run(_get(client, "/api/v1/health"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "healthy"
        assert data["version"] == "0.1.0"
        assert "timestamp" in data

    def test_readiness_check(self, client):
        resp = _run(_get(client, "/api/v1/ready"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["status"] == "ready"
        assert "checks" in data
        for service in ("database", "storage", "tracking"):
            assert data["checks"][service] == "ok"

    def test_app_info(self, client):
        resp = _run(_get(client, "/api/v1/info"))
        assert resp.status_code == 200
        data = resp.json()
        assert data["name"] == "MLite API"
        assert data["version"] == "0.1.0"
        assert data["docs_url"] == "/docs"

    def test_legacy_health(self, client):
        """Backward-compat root /health still works."""
        resp = _run(_get(client, "/health"))
        assert resp.status_code == 200
        assert resp.json()["status"] == "ok"

    def test_legacy_ready(self, client):
        resp = _run(_get(client, "/ready"))
        assert resp.status_code == 200
        assert resp.json()["status"] == "ready"


# ── Scaffold routers ──────────────────────────────────────


class TestScaffoldRouters:
    """Verify that placeholder routers respond correctly."""

    def test_list_projects(self, client):
        resp = _run(_get(client, "/api/v1/projects/"))
        assert resp.status_code == 200
        assert resp.json() == {"projects": [], "total": 0}

    def test_list_datasets(self, client):
        resp = _run(_get(client, "/api/v1/datasets/"))
        assert resp.status_code == 200
        assert resp.json() == {"datasets": [], "total": 0}

    def test_list_experiments(self, client):
        resp = _run(_get(client, "/api/v1/experiments/"))
        assert resp.status_code == 200
        assert resp.json() == {"experiments": [], "total": 0}


# ── OpenAPI schema ─────────────────────────────────────────


class TestOpenAPISchema:
    """Verify the OpenAPI specification is correctly generated."""

    def test_openapi_json(self, client):
        resp = _run(_get(client, "/openapi.json"))
        assert resp.status_code == 200
        schema = resp.json()
        assert schema["info"]["title"] == "MLite API"
        assert schema["info"]["version"] == "0.1.0"

    def test_openapi_paths_include_routers(self, client):
        resp = _run(_get(client, "/openapi.json"))
        paths = resp.json()["paths"]
        assert "/api/v1/health" in paths
        assert "/api/v1/ready" in paths
        assert "/api/v1/info" in paths
        assert "/api/v1/projects/" in paths
        assert "/api/v1/datasets/" in paths
        assert "/api/v1/experiments/" in paths

    def test_openapi_tags(self, client):
        resp = _run(_get(client, "/openapi.json"))
        schema = resp.json()
        # All expected tags should appear in at least one path
        tag_names = set()
        for path_item in schema["paths"].values():
            for operation in path_item.values():
                if isinstance(operation, dict) and "tags" in operation:
                    tag_names.update(operation["tags"])
        for expected in ("System", "Projects", "Datasets", "Experiments"):
            assert expected in tag_names


# ── Middleware ──────────────────────────────────────────────


class TestMiddleware:
    """Verify custom middleware behaviour."""

    def test_request_id_header_auto_generated(self, client):
        resp = _run(_get(client, "/api/v1/health"))
        assert "x-request-id" in resp.headers

    def test_request_id_echoed_back(self, client):
        custom_id = "test-req-42"
        resp = _run(_get(client, "/api/v1/health", headers={"X-Request-ID": custom_id}))
        assert resp.headers["x-request-id"] == custom_id


# ── Error handling ─────────────────────────────────────────


class TestErrorHandling:
    """Verify exception handler wiring."""

    def test_404_for_unknown_route(self, client):
        resp = _run(_get(client, "/api/v1/nonexistent"))
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
        # lru_cache ensures a singleton
        a = get_settings()
        b = get_settings()
        assert a is b
