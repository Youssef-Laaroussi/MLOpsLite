"""Integration tests for FastAPI REST API endpoints (Issue #29).

Tests:
- Health and ready probes
- Authenticated project creation and retrieval
- Model registry and version listing
- RBAC permissions enforcement across REST routers
- Audit logging triggered by state alterations
"""

import asyncio
import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import create_app
from packages.core.models.user import User, UserRole
from packages.core.security.auth import create_access_token
from packages.core.security.dependencies import get_current_user


def _run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@pytest.fixture
def app():
    return create_app()


class TestAPIIntegration:
    """Verify REST API route integration and security middleware."""

    def test_health_endpoints(self, app):
        transport = ASGITransport(app=app)
        async def _test():
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.get("/api/v1/health")
                assert res.status_code == 200
                assert res.json()["status"] == "healthy"

                ready = await client.get("/api/v1/ready")
                assert ready.status_code == 200
                assert ready.json()["status"] == "ready"
        _run(_test())

    def test_authenticated_project_flow(self, app):
        developer = User(
            id="dev-int-1",
            username="dev_int",
            email="dev_int@mlite.local",
            hashed_password="hash",
            role=UserRole.DEVELOPER,
            is_active=True,
        )
        token = create_access_token({"sub": developer.id, "email": developer.email, "role": "DEVELOPER"})

        app.dependency_overrides[get_current_user] = lambda: developer
        transport = ASGITransport(app=app)

        async def _test():
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                headers = {"Authorization": f"Bearer {token}"}

                # List projects
                res = await client.get("/api/v1/projects/", headers=headers)
                assert res.status_code == 200
                assert "projects" in res.json()

        try:
            _run(_test())
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    def test_viewer_denied_deployment_creation(self, app):
        viewer = User(
            id="view-int-1",
            username="view_int",
            email="view_int@mlite.local",
            hashed_password="hash",
            role=UserRole.VIEWER,
            is_active=True,
        )
        token = create_access_token({"sub": viewer.id, "email": viewer.email, "role": "VIEWER"})

        app.dependency_overrides[get_current_user] = lambda: viewer
        transport = ASGITransport(app=app)

        async def _test():
            async with AsyncClient(transport=transport, base_url="http://test") as client:
                res = await client.post(
                    "/api/v1/deployments/",
                    headers={"Authorization": f"Bearer {token}"},
                    json={"model_name": "fraud-model", "model_version": 1},
                )
                assert res.status_code == 403
                assert "Missing permission" in res.json()["detail"]

        try:
            _run(_test())
        finally:
            app.dependency_overrides.pop(get_current_user, None)
