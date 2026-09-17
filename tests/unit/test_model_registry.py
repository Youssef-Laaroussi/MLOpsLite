"""Unit tests for Model Registry service and stage transitions (Issue #10).

Tests model registration, sequential versioning, stage promotion,
and the single-production exclusivity constraint with auto-demotion.
"""

import pytest
from unittest.mock import AsyncMock, MagicMock

from packages.core.models.model_registry import (
    RegisteredModel,
    ModelVersion,
    ModelStage,
)
from packages.registry.service import ModelRegistryService


class TestModelStageEnum:
    """Test model stage enum values."""

    def test_stage_values(self):
        assert ModelStage.DEVELOPMENT == "DEVELOPMENT"
        assert ModelStage.CANDIDATE == "CANDIDATE"
        assert ModelStage.STAGING == "STAGING"
        assert ModelStage.PRODUCTION == "PRODUCTION"
        assert ModelStage.ARCHIVED == "ARCHIVED"

    def test_stage_string_comparison(self):
        assert ModelStage("PRODUCTION") == ModelStage.PRODUCTION
        assert ModelStage("CANDIDATE") == ModelStage.CANDIDATE


class TestModelRegistryEntities:
    """Test entity initialization and properties."""

    def test_registered_model_creation(self):
        model = RegisteredModel(
            name="fraud-detection-xgb",
            description="XGBoost model for credit card fraud",
            project_id="proj-123",
            tags={"framework": "xgboost", "task": "classification"},
        )
        assert model.name == "fraud-detection-xgb"
        assert model.project_id == "proj-123"
        assert model.tags["framework"] == "xgboost"

    def test_model_version_creation(self):
        version = ModelVersion(
            model_id="mod-123",
            version=1,
            stage=ModelStage.DEVELOPMENT,
            mlflow_run_id="run-456",
            mlflow_model_uri="runs:/run-456/model",
            metrics={"accuracy": 0.95, "f1": 0.94},
        )
        assert version.version == 1
        assert version.stage == ModelStage.DEVELOPMENT
        assert version.mlflow_run_id == "run-456"
        assert version.metrics["accuracy"] == 0.95


@pytest.mark.asyncio
class TestModelRegistryService:
    """Test ModelRegistryService business logic with mocked AsyncSession."""

    async def test_register_new_model_first_version(self):
        session = AsyncMock()

        # No existing model
        execute_result_model = MagicMock()
        execute_result_model.scalar_one_or_none.return_value = None

        # Max version = None -> 0
        execute_result_version = MagicMock()
        execute_result_version.scalar.return_value = None

        session.execute.side_effect = [execute_result_model, execute_result_version]

        service = ModelRegistryService(session)
        version = await service.register_model(
            name="churn-predictor",
            run_id="run-abc",
            description="Initial churn model",
            metrics={"accuracy": 0.88},
        )

        assert version.version == 1
        assert version.stage == ModelStage.DEVELOPMENT
        assert version.mlflow_run_id == "run-abc"
        assert version.metrics == {"accuracy": 0.88}
        assert session.add.call_count == 2  # Added RegisteredModel and ModelVersion

    async def test_register_new_version_increments_number(self):
        session = AsyncMock()
        existing_model = RegisteredModel(id="model-1", name="churn-predictor")

        execute_result_model = MagicMock()
        execute_result_model.scalar_one_or_none.return_value = existing_model

        execute_result_version = MagicMock()
        execute_result_version.scalar.return_value = 2  # Current max version is 2

        session.execute.side_effect = [execute_result_model, execute_result_version]

        service = ModelRegistryService(session)
        version = await service.register_model(
            name="churn-predictor",
            run_id="run-xyz",
            metrics={"accuracy": 0.92},
        )

        assert version.version == 3
        assert version.stage == ModelStage.DEVELOPMENT
        assert version.mlflow_run_id == "run-xyz"

    async def test_promote_to_staging(self):
        session = AsyncMock()
        model = RegisteredModel(id="model-1", name="churn-predictor")
        version = ModelVersion(id="ver-1", model_id="model-1", version=1, stage=ModelStage.DEVELOPMENT)

        service = ModelRegistryService(session)
        service.get_model_by_name = AsyncMock(return_value=model)
        service.get_version = AsyncMock(return_value=version)

        promoted = await service.promote("churn-predictor", 1, ModelStage.STAGING)
        assert promoted is not None
        assert promoted.stage == ModelStage.STAGING

    async def test_promote_to_production_auto_demotes_existing_production(self):
        session = AsyncMock()
        model = RegisteredModel(id="model-1", name="churn-predictor")
        v1 = ModelVersion(id="v1", model_id="model-1", version=1, stage=ModelStage.PRODUCTION)
        v2 = ModelVersion(id="v2", model_id="model-1", version=2, stage=ModelStage.STAGING)

        current_prod_scalars = MagicMock()
        current_prod_scalars.scalars.return_value.all.return_value = [v1]
        session.execute.return_value = current_prod_scalars

        service = ModelRegistryService(session)
        service.get_model_by_name = AsyncMock(return_value=model)
        service.get_version = AsyncMock(return_value=v2)

        promoted = await service.promote("churn-predictor", 2, ModelStage.PRODUCTION)

        assert promoted is not None
        assert promoted.stage == ModelStage.PRODUCTION
        # Ensure previous production version was demoted to ARCHIVED
        assert v1.stage == ModelStage.ARCHIVED

    async def test_compare_versions(self):
        session = AsyncMock()
        model = RegisteredModel(id="model-1", name="churn-predictor")
        v1 = ModelVersion(
            id="v1",
            model_id="model-1",
            version=1,
            stage=ModelStage.ARCHIVED,
            metrics={"accuracy": 0.85, "f1": 0.80},
        )
        v2 = ModelVersion(
            id="v2",
            model_id="model-1",
            version=2,
            stage=ModelStage.PRODUCTION,
            metrics={"accuracy": 0.92, "f1": 0.90},
        )

        service = ModelRegistryService(session)
        service.get_version = AsyncMock(side_effect=[v1, v2])

        comparison = await service.compare_versions("churn-predictor", 1, 2)
        assert comparison["model_name"] == "churn-predictor"
        assert comparison["v1"] == 1
        assert comparison["v2"] == 2
        assert comparison["v1_stage"] == "ARCHIVED"
        assert comparison["v2_stage"] == "PRODUCTION"
        assert comparison["v1_metrics"]["accuracy"] == 0.85
        assert comparison["v2_metrics"]["accuracy"] == 0.92
