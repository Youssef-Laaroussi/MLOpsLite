"""Feedback routing must support registered regression and classification models."""

from types import SimpleNamespace
from unittest.mock import AsyncMock, MagicMock

import pytest
from httpx import ASGITransport, AsyncClient

from apps.api.dependencies import get_db
from packages.core.models.monitoring import ModelPerformanceHistory


@pytest.mark.asyncio
@pytest.mark.parametrize(
    "config,baseline,labels,task",
    [
        ({}, {"rmse": 2.0, "mae": 1.0}, [1.5, 3.2, 5.7, 8.3, 10.1], "regression"),
        ({"task_type": "REGRESSION"}, {}, [1.5, 3.2, 5.7, 8.3, 10.1], "regression"),
        ({}, {"accuracy": 0.9}, [0, 1, 2, 1, 2], "classification"),
        ({"task_type": "classification"}, {"rmse": 2.0}, [0, 1, 2, 1, 2], "classification"),
        ({}, {}, [0, 1, 2, 1, 2], "classification"),
        ({"task_type": "unsupported"}, {}, [0, 1, 2, 1, 2], None),
        ({}, {"accuracy": 0.9}, [1.5, 3.2, 5.7, 8.3, 10.1], None),
    ],
)
async def test_feedback_uses_model_task(authed_app, monkeypatch, config, baseline, labels, task):
    session = AsyncMock()
    session.add = MagicMock()
    history = MagicMock()
    history.scalars.return_value.all.return_value = [
        SimpleNamespace(ground_truth=value, predicted_value=value) for value in labels
    ]
    session.execute.return_value = history
    authed_app.dependency_overrides[get_db] = lambda: session
    deployment = SimpleNamespace(model_name="qa-model", model_version=1, config=config)
    monkeypatch.setattr(
        "packages.deployment.service.DeploymentService.get_deployment",
        AsyncMock(return_value=deployment),
    )
    monkeypatch.setattr(
        "packages.registry.service.ModelRegistryService.get_version",
        AsyncMock(return_value=SimpleNamespace(metrics=baseline)),
    )
    async with AsyncClient(
        transport=ASGITransport(app=authed_app), base_url="http://test"
    ) as client:
        response = await client.post(
            "/api/v1/deployments/qa-deployment/feedback",
            json={
                "prediction_id": "qa-prediction",
                "ground_truth": labels[-1],
                "predicted_value": labels[-1],
            },
        )
    snapshots = [
        call.args[0]
        for call in session.add.call_args_list
        if isinstance(call.args[0], ModelPerformanceHistory)
    ]
    if task is None:
        assert response.status_code == 422
        assert not snapshots
        return
    assert response.status_code == 201, response.text
    assert len(snapshots) == 1
    assert snapshots[0].task_type == task
    assert snapshots[0].metrics_json.get("rmse" if task == "regression" else "accuracy") == (
        0.0 if task == "regression" else 1.0
    )
