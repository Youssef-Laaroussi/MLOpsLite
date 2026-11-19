"""Self-service profile edits are limited to the authenticated user's display name."""
from datetime import UTC, datetime
from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from pydantic import ValidationError

from apps.api.routers.auth import update_my_profile
from packages.core.models.user import UserRole
from packages.core.schemas.security import SelfProfileUpdate


@pytest.mark.parametrize("name", ["", "   ", "a" * 201])
def test_profile_name_validation(name):
    with pytest.raises(ValidationError):
        SelfProfileUpdate(full_name=name)


def test_profile_cannot_change_role_or_active_status():
    with pytest.raises(ValidationError):
        SelfProfileUpdate(full_name="Engineer", role="ADMIN", is_active=True)


@pytest.mark.asyncio
async def test_standard_user_can_update_own_name_and_audits_change(monkeypatch):
    audit = MagicMock(log=AsyncMock())
    monkeypatch.setattr("packages.core.security.audit.AuditService", lambda **kwargs: audit)
    user = SimpleNamespace(
        id="user-1", username="engineer", full_name="Old name", email="user@example.com",
        role=UserRole.USER, is_active=True,
        created_at=datetime(2026, 1, 15, tzinfo=UTC), updated_at=datetime.now(UTC),
    )
    db = AsyncMock()
    result = await update_my_profile(
        SelfProfileUpdate(full_name="  New name  "), SimpleNamespace(client=None), db, user,
    )
    assert result["full_name"] == "New name"
    assert result["role"] == UserRole.USER
    assert result["id"] == "user-1"
    db.flush.assert_awaited_once()
    audit.log.assert_awaited_once()
    assert audit.log.call_args.kwargs["changes"]["full_name"] == {"from": "Old name", "to": "New name"}
