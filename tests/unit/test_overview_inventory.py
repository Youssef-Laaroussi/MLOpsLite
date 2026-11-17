"""Overview current inventory must not disappear behind observation date filters."""
from datetime import UTC, datetime, timedelta
from unittest.mock import MagicMock, patch

import pytest
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

from apps.api.config import Settings
from apps.api.routers.health import get_system_stats
from packages.core.db.base import Base
from packages.core.models.alert import Alert, AlertStatus
from packages.core.models.deployment import Deployment, DeploymentStatus
from packages.core.models.project import Project


@pytest.mark.asyncio
async def test_old_running_deployments_and_open_alerts_survive_date_filters():
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    try:
        async with engine.begin() as conn:
            await conn.run_sync(Base.metadata.create_all)
        async with async_sessionmaker(engine, expire_on_commit=False)() as session:
            old = datetime.now(UTC) - timedelta(days=90)
            session.add(Project(name="Old project", slug="old-project", created_at=old))
            session.add_all([
                Deployment(model_name="old-model", model_version=1, port=8100,
                           endpoint_url="http://localhost:8100", status=DeploymentStatus.RUNNING, created_at=old),
                Deployment(model_name="stopped-model", model_version=1, port=8101,
                           endpoint_url="http://localhost:8101", status=DeploymentStatus.STOPPED, created_at=old),
                Alert(event_type="DATA_DRIFT", title="Old unresolved incident", message="Drift",
                      status=AlertStatus.ACKNOWLEDGED, created_at=old),
                Alert(event_type="DATA_DRIFT", title="Resolved incident", message="Drift",
                      status=AlertStatus.RESOLVED, created_at=old),
            ])
            await session.commit()
            with patch("packages.tracking.mlflow_client.MLiteMLflowManager") as manager:
                manager.return_value.client.search_experiments.return_value = []
                for period in ("all", "7d", "30d"):
                    result = await get_system_stats(period, Settings(), session, MagicMock())
                    assert "error" not in result
                    assert result["projects_count"] == 1
                    assert result["active_deployments"] == 1
                    assert result["alerts_count"] == 1
    finally:
        await engine.dispose()
