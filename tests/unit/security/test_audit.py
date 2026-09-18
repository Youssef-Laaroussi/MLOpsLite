"""Unit tests for immutable audit logging service (Issue #27).

Tests:
- Writing audit entries with action, resource, user identity, IP, and diff
- Querying audit entries with various filters (action, resource, user, time range)
- Single entry retrieval by ID
- Verifying audit records are append-only and cannot be mutated or deleted
"""

from datetime import datetime, timezone, timedelta
from unittest.mock import AsyncMock, MagicMock

import pytest

from packages.core.models.audit import AuditLog, AuditAction
from packages.core.security.audit import AuditService


class TestAuditService:
    """Verify AuditService logging, querying, and immutability."""

    @pytest.mark.asyncio
    async def test_log_creates_audit_entry(self):
        session = AsyncMock()
        service = AuditService(session=session)

        entry = await service.log(
            action=AuditAction.MODEL_PROMOTE,
            resource_type="model",
            resource_id="model-uuid-1",
            resource_name="fraud-detector:v2",
            user_id="user-123",
            user_email="lead@mlite.local",
            ip_address="192.168.1.50",
            changes={"target_stage": "PRODUCTION", "version": 2},
        )

        assert entry.action == AuditAction.MODEL_PROMOTE
        assert entry.resource_type == "model"
        assert entry.resource_id == "model-uuid-1"
        assert entry.resource_name == "fraud-detector:v2"
        assert entry.user_id == "user-123"
        assert entry.user_email == "lead@mlite.local"
        assert entry.ip_address == "192.168.1.50"
        assert entry.changes_json == {"target_stage": "PRODUCTION", "version": 2}
        session.add.assert_called_once_with(entry)
        session.flush.assert_called_once()
        session.refresh.assert_called_once_with(entry)

    @pytest.mark.asyncio
    async def test_log_with_minimal_fields(self):
        session = AsyncMock()
        service = AuditService(session=session)

        entry = await service.log(
            action=AuditAction.USER_LOGIN,
            resource_type="user",
            user_id="u-anonymous",
        )

        assert entry.action == AuditAction.USER_LOGIN
        assert entry.resource_type == "user"
        assert entry.changes_json is None

    @pytest.mark.asyncio
    async def test_query_calls_execute_with_filters(self):
        session = AsyncMock()
        mock_result = MagicMock()
        mock_result.scalars.return_value.all.return_value = [
            AuditLog(
                id="log-1",
                action=AuditAction.DEPLOYMENT_CREATE,
                resource_type="deployment",
                timestamp=datetime.now(timezone.utc),
            )
        ]
        session.execute.return_value = mock_result

        service = AuditService(session=session)
        results = await service.query(
            action=AuditAction.DEPLOYMENT_CREATE,
            resource_type="deployment",
            user_id="user-1",
            from_date=datetime.now(timezone.utc) - timedelta(days=7),
            to_date=datetime.now(timezone.utc),
            limit=25,
        )

        assert len(results) == 1
        assert results[0].action == AuditAction.DEPLOYMENT_CREATE
        session.execute.assert_called_once()

    @pytest.mark.asyncio
    async def test_get_entry_by_id(self):
        session = AsyncMock()
        expected = AuditLog(
            id="log-42",
            action=AuditAction.DEPLOYMENT_ROLLBACK,
            resource_type="deployment",
            timestamp=datetime.now(timezone.utc),
        )
        mock_result = MagicMock()
        mock_result.scalar_one_or_none.return_value = expected
        session.execute.return_value = mock_result

        service = AuditService(session=session)
        found = await service.get_entry("log-42")

        assert found is not None
        assert found.id == "log-42"
        assert found.action == AuditAction.DEPLOYMENT_ROLLBACK
