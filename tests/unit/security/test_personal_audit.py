"""Personal journal isolation, including direct entry IDs and admin accounts."""

from datetime import UTC, datetime, timedelta
from types import SimpleNamespace
from unittest.mock import AsyncMock

import pytest
from fastapi import FastAPI
from httpx import ASGITransport, AsyncClient
from sqlalchemy import create_engine
from sqlalchemy.orm import Session

from apps.api.dependencies import get_db
from apps.api.errors import register_exception_handlers
from apps.api.routers.audit import router
from packages.core.models.audit import AuditAction, AuditLog
from packages.core.models.user import UserRole
from packages.core.security.dependencies import get_current_user


@pytest.fixture
def journal_app():
    engine = create_engine("sqlite:///:memory:")
    AuditLog.__table__.create(engine)
    app = FastAPI()
    app.include_router(router)
    register_exception_handlers(app)
    with Session(engine) as session:
        for index, (entry_id, actor) in enumerate([
            ("mine", "me"), ("other-entry", "other"), ("system-entry", None),
        ]):
            session.add(AuditLog(
                id=entry_id, user_id=actor, user_email=f"{actor}@example.com" if actor else None,
                resource_type="user", resource_name=actor, action=AuditAction.USER_LOGIN,
                timestamp=datetime.now(UTC) + timedelta(seconds=index),
            ))
        session.commit()
        db = AsyncMock()
        db.execute.side_effect = lambda query: session.execute(query)

        async def database():
            return db

        app.dependency_overrides[get_db] = database
        yield app
    engine.dispose()


@pytest.mark.asyncio
@pytest.mark.parametrize("role", [UserRole.USER, UserRole.ADMIN])
async def test_personal_journal_cannot_read_another_actor_even_as_admin(journal_app, role):
    async def account():
        return SimpleNamespace(id="me", role=role)

    journal_app.dependency_overrides[get_current_user] = account
    async with AsyncClient(transport=ASGITransport(app=journal_app), base_url="http://test") as client:
        for params in ({}, {"user_id": "other"}, {"limit": 1}):
            response = await client.get("/api/v1/audit/me/logs", params=params)
            assert response.status_code == 200
            assert response.json()["total"] == 1
            assert [entry["id"] for entry in response.json()["logs"]] == ["mine"]
            assert "other@example.com" not in response.text

        own_entry = await client.get("/api/v1/audit/me/logs/mine")
        assert own_entry.status_code == 200
        assert own_entry.json()["id"] == "mine"
        for entry_id in ("other-entry", "system-entry", "missing-entry"):
            assert (await client.get(f"/api/v1/audit/me/logs/{entry_id}")).status_code == 404

        global_journal = await client.get("/api/v1/audit/logs")
        if role == UserRole.ADMIN:
            assert global_journal.status_code == 200
            assert global_journal.json()["total"] == 3
        else:
            assert global_journal.status_code == 403
            assert (await client.get("/api/v1/audit/logs/other-entry")).status_code == 403


@pytest.mark.asyncio
@pytest.mark.parametrize("path", ["/api/v1/audit/me/logs", "/api/v1/audit/me/logs/mine"])
async def test_personal_journal_requires_authentication(journal_app, path):
    async with AsyncClient(transport=ASGITransport(app=journal_app), base_url="http://test") as client:
        assert (await client.get(path)).status_code == 401
