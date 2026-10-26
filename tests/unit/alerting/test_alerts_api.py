"""Unit tests for Alerts, Rules, and Notification Channels API routes (/api/v1/alerts)."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.config import Settings
from apps.api.dependencies import get_app_settings, get_db
from apps.api.main import create_app
from packages.core.models.alert import (
    Alert,
    AlertRule,
    AlertSeverity,
    AlertStatus,
    NotificationChannel,
)


@pytest.fixture
def mock_db():
    db = AsyncMock()
    db.flush = AsyncMock()
    async def fake_refresh(obj):
        if not getattr(obj, "id", None):
            obj.id = "mock-uuid-1234"
        if not getattr(obj, "created_at", None):
            obj.created_at = datetime.now(UTC)
        if not getattr(obj, "updated_at", None):
            obj.updated_at = datetime.now(UTC)
    db.refresh = AsyncMock(side_effect=fake_refresh)
    db.delete = AsyncMock()
    db.add = MagicMock()
    return db


@pytest.fixture
def test_app(mock_db):
    settings = Settings(
        app_name="MLite Test",
        secret_key="test-secret-key-32-bytes-long!!!!!",
        testing=True,
    )
    from packages.core.models.user import User, UserRole
    from packages.core.security.dependencies import get_current_user

    dummy_user = User(
        id="usr-test",
        username="tester",
        email="tester@mlite.local",
        role=UserRole.ADMIN,
        is_active=True,
    )

    app = create_app()
    app.dependency_overrides[get_app_settings] = lambda: settings
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: dummy_user
    return app


@pytest.mark.asyncio
async def test_alerts_summary_empty(test_app, mock_db):
    """Empty DB returns zeros and None MTTR, never fake numbers."""
    res_crit = MagicMock()
    res_crit.scalar.return_value = 0
    res_warn = MagicMock()
    res_warn.scalar.return_value = 0
    res_7d = MagicMock()
    res_7d.scalar.return_value = 0
    res_mttr = MagicMock()
    res_mttr.all.return_value = []

    mock_db.execute.side_effect = [res_crit, res_warn, res_7d, res_mttr]

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/alerts/summary")

    assert resp.status_code == 200
    data = resp.json()
    assert data["open_critical"] == 0
    assert data["open_warning"] == 0
    assert data["resolved_7d"] == 0
    assert data["mttr_minutes"] is None


@pytest.mark.asyncio
async def test_create_and_list_alert_rules(test_app, mock_db):
    """Creating a rule persists it in DB and listing returns it."""
    # List rules: return empty initially
    res_empty = MagicMock()
    res_empty.scalars().all.return_value = []
    mock_db.execute.return_value = res_empty

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        # Create rule
        resp = await client.post(
            "/api/v1/alerts/rules",
            json={
                "name": "High Drift Warning",
                "metric": "drift_share",
                "operator": ">",
                "threshold": 0.20,
                "model_name": "fraud-model",
                "severity": "WARNING",
                "enabled": True,
            },
        )
        assert resp.status_code == 201
        created = resp.json()
        assert created["name"] == "High Drift Warning"
        assert created["metric"] == "drift_share"
        assert created["threshold"] == 0.20
        assert created["enabled"] is True

        # Now mock DB returning the created rule
        rule_obj = AlertRule(
            id="rule-uuid-1",
            name="High Drift Warning",
            metric="drift_share",
            operator=">",
            threshold=0.20,
            model_name="fraud-model",
            severity=AlertSeverity.WARNING,
            enabled=True,
            created_at=datetime.now(UTC),
        )
        res_list = MagicMock()
        res_list.scalars().all.return_value = [rule_obj]
        mock_db.execute.return_value = res_list

        list_resp = await client.get("/api/v1/alerts/rules")
        assert list_resp.status_code == 200
        items = list_resp.json()
        assert len(items) == 1
        assert items[0]["id"] == "rule-uuid-1"


@pytest.mark.asyncio
async def test_notification_channel_lifecycle_and_test(test_app, mock_db):
    """Creating, testing, and deleting notification channels."""
    # 1. Create channel
    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        create_resp = await client.post(
            "/api/v1/alerts/channels",
            json={
                "name": "Dev Slack",
                "kind": "SLACK",
                "url": "https://hooks.slack.com/services/T00/B00/test",
            },
        )
        assert create_resp.status_code == 201
        channel_data = create_resp.json()
        assert channel_data["name"] == "Dev Slack"
        assert channel_data["kind"] == "SLACK"

        # 2. Test channel dispatch
        chan_obj = NotificationChannel(
            id="chan-uuid-1",
            name="Dev Slack",
            kind="SLACK",
            url="https://hooks.slack.com/services/T00/B00/test",
            enabled=True,
            created_at=datetime.now(UTC),
        )
        find_res = MagicMock()
        find_res.scalar_one_or_none.return_value = chan_obj
        mock_db.execute.return_value = find_res

        with patch("packages.alerting.dispatchers.slack.SlackDispatcher.dispatch", new=AsyncMock(return_value=True)):
            test_resp = await client.post("/api/v1/alerts/channels/chan-uuid-1/test")
            assert test_resp.status_code == 200
            test_data = test_resp.json()
            assert test_data["delivered"] is True
            assert test_data["channel_id"] == "chan-uuid-1"

        # 3. Delete channel
        del_resp = await client.delete("/api/v1/alerts/channels/chan-uuid-1")
        assert del_resp.status_code == 204
