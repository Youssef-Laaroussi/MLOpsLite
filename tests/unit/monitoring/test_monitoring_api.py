"""Unit tests for Monitoring API routes (/api/v1/monitoring)."""

from datetime import UTC, datetime
from unittest.mock import AsyncMock, MagicMock, patch

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.config import Settings
from apps.api.dependencies import get_app_settings, get_db
from apps.api.main import create_app
from packages.core.models.monitoring import DriftEvaluation, DriftSeverity


@pytest.fixture
def mock_db():
    return AsyncMock()


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
        hashed_password="xxx",
        role=UserRole.ADMIN,
        is_active=True,
    )

    app = create_app()
    app.dependency_overrides[get_app_settings] = lambda: settings
    app.dependency_overrides[get_db] = lambda: mock_db
    app.dependency_overrides[get_current_user] = lambda: dummy_user
    return app


@pytest.mark.asyncio
async def test_get_monitoring_summary_empty(test_app, mock_db):
    """Verify monitoring summary returns clean structure without inventing data."""
    # Mock query executions:
    # 1. Registered models query -> empty
    # 2. Drift evaluations query -> empty
    # 3. Active deployments query -> 0
    # 4. Telemetry metrics query -> empty
    # 5. Prediction feedback query -> 0
    # 6. Data quality report query -> None
    models_res = MagicMock()
    models_res.all.return_value = []

    drift_res = MagicMock()
    drift_res.scalars().all.return_value = []

    dep_count_res = MagicMock()
    dep_count_res.scalar.return_value = 0

    tel_res = MagicMock()
    tel_res.scalars().all.return_value = []

    pred_res = MagicMock()
    pred_res.scalar.return_value = 0

    quality_res = MagicMock()
    quality_res.scalar_one_or_none.return_value = None

    mock_db.execute.side_effect = [
        models_res,
        drift_res,
        dep_count_res,
        tel_res,
        pred_res,
        quality_res,
    ]

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/monitoring/summary")

    assert resp.status_code == 200
    data = resp.json()
    assert data["model_name"] == "default-model"
    assert data["models_available"] == []
    assert data["latest_drift"] is None
    assert data["drift_history"] == []
    assert data["telemetry"] == []
    assert data["active_deployments"] == 0
    assert data["total_predictions"] == 0
    assert data["latest_quality"] is None


@pytest.mark.asyncio
async def test_get_monitoring_summary_with_real_data(test_app, mock_db):
    """Verify monitoring summary properly maps real DB objects when present."""
    models_res = MagicMock()
    models_res.all.return_value = [("credit-risk",)]

    drift_eval = DriftEvaluation(
        model_name="credit-risk",
        drift_share=0.15,
        drift_status=DriftSeverity.MEDIUM,
        drifted_features=["income"],
        metrics_json={"income": {"drift_detected": True, "p_value": 0.02}},
        created_at=datetime.now(UTC),
    )
    drift_eval.id = "eval-1"
    drift_res = MagicMock()
    drift_res.scalars().all.return_value = [drift_eval]

    dep_count_res = MagicMock()
    dep_count_res.scalar.return_value = 2

    tel_res = MagicMock()
    tel_res.scalars().all.return_value = []

    pred_res = MagicMock()
    pred_res.scalar.return_value = 140

    quality_res = MagicMock()
    quality_res.scalar_one_or_none.return_value = None

    mock_db.execute.side_effect = [
        models_res,
        drift_res,
        dep_count_res,
        tel_res,
        pred_res,
        quality_res,
    ]

    transport = ASGITransport(app=test_app)
    async with AsyncClient(transport=transport, base_url="http://test") as client:
        resp = await client.get("/api/v1/monitoring/summary?model_name=credit-risk")

    assert resp.status_code == 200
    data = resp.json()
    assert data["model_name"] == "credit-risk"
    assert data["models_available"] == ["credit-risk"]
    assert data["latest_drift"] is not None
    assert data["latest_drift"]["drift_share"] == 0.15
    assert data["latest_drift"]["drift_status"] == "MEDIUM"
    assert data["latest_drift"]["drifted_features"] == ["income"]
    assert data["active_deployments"] == 2
    assert data["total_predictions"] == 140


@pytest.mark.asyncio
async def test_trigger_drift_check_endpoint(test_app, mock_db):
    """Verify trigger drift check executes real DataDriftDetector and returns response."""
    # Mock no registered dataset found in DB
    any_ds_res = MagicMock()
    any_ds_res.scalar_one_or_none.return_value = None
    mock_db.execute.return_value = any_ds_res

    created_eval = DriftEvaluation(
        model_name="fraud-detection",
        drift_share=0.0,
        drift_status=DriftSeverity.LOW,
        drifted_features=[],
        metrics_json={},
        created_at=datetime.now(UTC),
    )
    created_eval.id = "eval-101"

    with patch("apps.api.routers.monitoring.DataDriftDetector") as mock_detector_cls:
        mock_instance = MagicMock()
        mock_instance.evaluate_drift = AsyncMock(return_value=created_eval)
        mock_detector_cls.return_value = mock_instance

        transport = ASGITransport(app=test_app)
        async with AsyncClient(transport=transport, base_url="http://test") as client:
            resp = await client.post(
                "/api/v1/monitoring/drift/check",
                json={"model_name": "fraud-detection", "drift_threshold": 0.20},
            )

        assert resp.status_code == 201
        data = resp.json()
        assert data["model_name"] == "fraud-detection"
        assert data["drift_share"] == 0.0
        assert data["drift_status"] == "LOW"
