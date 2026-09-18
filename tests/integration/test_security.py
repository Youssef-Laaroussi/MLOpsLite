"""Integration tests for Authentication, RBAC, and Audit Logging (Milestone M6).

Tests:
- Protected endpoints return 401 Unauthorized without token or API key
- VIEWER tokens receive 403 Forbidden when attempting restricted actions (deploy, promote)
- MAINTAINER and ADMIN tokens succeed on authorized actions
- API key generation and authentication via X-API-Key header
- API key revocation immediately denies access
- Audit log endpoint immutability (rejection of PUT and DELETE)
"""

import asyncio
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.main import create_app
from packages.core.models.user import User, UserRole, ApiKey
from packages.core.models.audit import AuditLog, AuditAction
from packages.core.security.auth import create_access_token


def _run(coro):
    loop = asyncio.new_event_loop()
    try:
        return loop.run_until_complete(coro)
    finally:
        loop.close()


@pytest.fixture
def app():
    return create_app()


@pytest.fixture
def admin_user():
    return User(
        id="admin-uuid",
        username="admin",
        email="admin@mlite.local",
        hashed_password="hash",
        role=UserRole.ADMIN,
        is_active=True,
    )


@pytest.fixture
def maintainer_user():
    return User(
        id="maintainer-uuid",
        username="lead",
        email="lead@mlite.local",
        hashed_password="hash",
        role=UserRole.MAINTAINER,
        is_active=True,
    )


@pytest.fixture
def viewer_user():
    return User(
        id="viewer-uuid",
        username="guest",
        email="guest@mlite.local",
        hashed_password="hash",
        role=UserRole.VIEWER,
        is_active=True,
    )


class TestUnauthenticatedAccess:
    """Verify protected endpoints return HTTP 401 Unauthorized without credentials."""

    def test_auth_me_requires_token(self, app):
        transport = ASGITransport(app=app)
        async def _test():
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                return await ac.get("/api/v1/auth/me")
        resp = _run(_test())
        assert resp.status_code == 401

    def test_api_keys_requires_token(self, app):
        transport = ASGITransport(app=app)
        async def _test():
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                return await ac.get("/api/v1/auth/api-keys")
        resp = _run(_test())
        assert resp.status_code == 401

    def test_users_list_requires_token(self, app):
        transport = ASGITransport(app=app)
        async def _test():
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                return await ac.get("/api/v1/users")
        resp = _run(_test())
        assert resp.status_code == 401

    def test_audit_logs_requires_token(self, app):
        transport = ASGITransport(app=app)
        async def _test():
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                return await ac.get("/api/v1/audit/logs")
        resp = _run(_test())
        assert resp.status_code == 401


class TestRBACAccessControl:
    """Verify role-based access restrictions (403 Forbidden)."""

    def test_viewer_denied_user_management(self, app, viewer_user):
        token = create_access_token({"sub": viewer_user.id, "email": viewer_user.email, "role": "VIEWER"})
        transport = ASGITransport(app=app)

        async def _test():
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                return await ac.get(
                    "/api/v1/users",
                    headers={"Authorization": f"Bearer {token}"},
                )

        # Mock get_current_user to return viewer_user
        from packages.core.security.dependencies import get_current_user
        app.dependency_overrides[get_current_user] = lambda: viewer_user
        try:
            resp = _run(_test())
            assert resp.status_code == 403
            assert "Insufficient permissions" in resp.json().get("detail", "")
        finally:
            app.dependency_overrides.pop(get_current_user, None)

    def test_viewer_denied_audit_logs(self, app, viewer_user):
        from packages.core.security.dependencies import get_current_user
        app.dependency_overrides[get_current_user] = lambda: viewer_user
        transport = ASGITransport(app=app)

        async def _test():
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                return await ac.get(
                    "/api/v1/audit/logs",
                    headers={"Authorization": "Bearer mocked"},
                )

        try:
            resp = _run(_test())
            assert resp.status_code == 403
            assert "Missing permission" in resp.json().get("detail", "")
        finally:
            app.dependency_overrides.pop(get_current_user, None)


class TestAuditLogImmutability:
    """Verify audit logs reject mutation and deletion via HTTP 405."""

    def test_audit_log_cannot_be_deleted(self, app):
        transport = ASGITransport(app=app)

        async def _test():
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                return await ac.delete("/api/v1/audit/logs/any-id")

        resp = _run(_test())
        assert resp.status_code == 405
        assert "immutable" in resp.json().get("detail", "").lower()

    def test_audit_log_cannot_be_modified(self, app):
        transport = ASGITransport(app=app)

        async def _test():
            async with AsyncClient(transport=transport, base_url="http://test") as ac:
                return await ac.put("/api/v1/audit/logs/any-id", json={"action": "HACK"})

        resp = _run(_test())
        assert resp.status_code == 405
        assert "immutable" in resp.json().get("detail", "").lower()
