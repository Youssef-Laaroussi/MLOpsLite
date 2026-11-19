"""Self-service password changes and security event isolation."""
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from fastapi import HTTPException
from pydantic import ValidationError

from apps.api.routers.auth import change_my_password, get_my_security_activity
from packages.core.models.audit import AuditAction
from packages.core.schemas.security import PasswordChangeRequest
from packages.core.security.auth import hash_password, verify_password

OLD_PASSWORD = "initial-test-password"
NEW_PASSWORD = "replacement-test-password"


def payload(current=OLD_PASSWORD, replacement=NEW_PASSWORD):
    return PasswordChangeRequest(current_password=current, new_password=replacement, confirm_password=replacement)


@pytest.fixture
def account():
    return SimpleNamespace(id="user-1", email="user@example.com", username="engineer", hashed_password=hash_password(OLD_PASSWORD))


@pytest.fixture
def audit(monkeypatch):
    service = MagicMock(log=AsyncMock())
    monkeypatch.setattr("packages.core.security.audit.AuditService", lambda **kwargs: service)
    return service


@pytest.mark.asyncio
async def test_password_change_verifies_old_password_and_never_audits_secrets(account, audit):
    db = AsyncMock()
    result = await change_my_password(payload(), SimpleNamespace(client=None), db, account)
    assert verify_password(NEW_PASSWORD, account.hashed_password)
    assert not verify_password(OLD_PASSWORD, account.hashed_password)
    assert result["other_sessions_revoked"] is False
    assert audit.log.call_args.kwargs["changes"] == {"password_changed": True}
    assert OLD_PASSWORD not in repr(audit.log.call_args)
    assert NEW_PASSWORD not in repr(audit.log.call_args)
    db.flush.assert_awaited_once()


@pytest.mark.asyncio
@pytest.mark.parametrize("current,replacement", [("incorrect-password", NEW_PASSWORD), (OLD_PASSWORD, OLD_PASSWORD)])
async def test_wrong_or_reused_password_is_rejected(account, audit, current, replacement):
    db = AsyncMock()
    original_hash = account.hashed_password
    with pytest.raises(HTTPException) as error:
        await change_my_password(payload(current, replacement), SimpleNamespace(client=None), db, account)
    assert error.value.status_code == 400
    assert account.hashed_password == original_hash
    db.flush.assert_not_awaited()
    audit.log.assert_not_awaited()


@pytest.mark.parametrize("replacement,confirmation", [("short", "short"), ("new-password-1", "new-password-2"), ("é" * 37, "é" * 37)])
def test_invalid_replacements_are_rejected(replacement, confirmation):
    with pytest.raises(ValidationError):
        PasswordChangeRequest(current_password=OLD_PASSWORD, new_password=replacement, confirm_password=confirmation)


def test_cannot_target_another_user():
    with pytest.raises(ValidationError):
        PasswordChangeRequest(current_password=OLD_PASSWORD, new_password=NEW_PASSWORD, confirm_password=NEW_PASSWORD, user_id="other-user")


@pytest.mark.asyncio
async def test_security_activity_is_scoped_to_current_user_and_sanitized():
    event = SimpleNamespace(id="event-1", action=AuditAction.USER_UPDATE,
        changes_json={"password_changed": True, "secret": "do-not-return"},
        timestamp=datetime.now(UTC), ip_address="127.0.0.1")
    result = MagicMock()
    result.scalars.return_value.all.return_value = [event]
    db = AsyncMock()
    db.execute.return_value = result
    response = await get_my_security_activity(db, SimpleNamespace(id="user-1"))
    query = db.execute.call_args.args[0]
    assert query.compile().params["user_id_1"] == "user-1"
    assert "LIMIT" in str(query)
    assert response["events"][0]["label"] == "Password changed"
    assert "changes_json" not in response["events"][0]
    assert "do-not-return" not in repr(response)


@pytest.mark.asyncio
async def test_activity_includes_admin_changes_to_me_but_not_changes_to_others():
    from sqlalchemy import create_engine
    from sqlalchemy.orm import Session

    from packages.core.models.audit import AuditLog

    engine = create_engine("sqlite:///:memory:")
    AuditLog.__table__.create(engine)
    with Session(engine) as session:
        session.add_all([
            AuditLog(id="mine", user_id="me", action=AuditAction.USER_LOGIN, resource_type="user", resource_id="me"),
            AuditLog(id="other", user_id="other", action=AuditAction.USER_LOGIN, resource_type="user", resource_id="other"),
            AuditLog(id="admin-change-to-me", user_id="admin", action=AuditAction.USER_UPDATE, resource_type="user", resource_id="me"),
            AuditLog(id="my-change-to-other", user_id="me", action=AuditAction.USER_UPDATE, resource_type="user", resource_id="other"),
        ])
        session.commit()
        db = AsyncMock()
        db.execute.side_effect = lambda query: session.execute(query)
        response = await get_my_security_activity(db, SimpleNamespace(id="me"))
        assert {event["id"] for event in response["events"]} == {"mine", "admin-change-to-me"}
    engine.dispose()
