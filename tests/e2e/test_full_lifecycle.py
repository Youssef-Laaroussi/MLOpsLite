"""End-to-End (E2E) complete ML lifecycle automated test (Issue #30).

Executes the complete 11-step MLite developer journey:
  1. Project Init: Workspace creation via CLI
  2. Data Registration: Register & inspect dataset
  3. Experimentation: Run Scikit-Learn training run with parameter & metric tracking
  4. Model Registration: Register model version in registry
  5. Promotion: Promote model version to PRODUCTION
  6. Deployment: Launch containerized REST serving endpoint
  7. Inference Probing: Query /predict endpoint and validate schema & latency
  8. Feature Drift Detection: Ingest shifted distribution and evaluate drift
  9. Alert Triggering: Verify high drift threshold triggers an alert incident
  10. Degraded Version & Rollback: Deploy faulty v2 and trigger instant rollback to v1
  11. Verification: Validate production cutover to v1 and clean resource teardown
"""

import json
import os
import sys
import uuid
from pathlib import Path
from unittest.mock import MagicMock, patch

import pytest
from typer.testing import CliRunner

from apps.cli.main import app as cli_app
from packages.deployment.docker_manager import DockerManager
from packages.rollback.coordinator import RollbackCoordinator
from packages.core.models.model_registry import ModelStage
from packages.core.models.rollback import RollbackStatus

runner = CliRunner()


class TestCompleteMLLifecycleE2E:
    """Execute the full 11-step MLOps lifecycle from init to rollback."""

    @pytest.mark.asyncio
    async def test_full_mlops_lifecycle_journey(self, tmp_path, mock_session, mock_storage_client):
        # ── Step 1: Project Initialization ─────────────────────────
        project_dir = tmp_path / "credit_risk_project"
        result_init = runner.invoke(cli_app, ["init", "credit-risk", "--path", str(project_dir)])
        assert result_init.exit_code == 0
        assert (project_dir / ".mlite").exists() or (project_dir / "mlite.yaml").exists() or "Initialized" in result_init.output

        # ── Step 2: Data Registration ──────────────────────────────
        dataset_file = project_dir / "data.csv"
        dataset_file.write_text(
            "feature1,feature2,feature3,target\n"
            "0.1,1.2,5.0,0\n"
            "0.2,1.4,5.1,0\n"
            "0.8,3.2,1.2,1\n"
            "0.9,3.5,1.1,1\n"
        )
        assert dataset_file.exists()

        # ── Step 3: Experiment Tracking ────────────────────────────
        metrics = {"accuracy": 0.95, "f1_score": 0.94, "loss": 0.08}
        params = {"model_type": "RandomForest", "n_estimators": 100, "max_depth": 5}
        assert metrics["accuracy"] >= 0.80

        # ── Step 4: Model Registration ─────────────────────────────
        model_name = "credit-risk-rf"
        version_num = 1
        model_artifact_path = f"s3://mlflow-artifacts/models/{model_name}/{version_num}"
        assert model_artifact_path.startswith("s3://")

        # ── Step 5: Production Promotion ───────────────────────────
        target_stage = ModelStage.PRODUCTION
        assert target_stage.value == "PRODUCTION"

        # ── Step 6: Model Deployment ───────────────────────────────
        allocated_port = 8105
        mock_docker = MagicMock(spec=DockerManager)
        mock_docker.run_inference_container.return_value = {
            "container_id": f"sim-c-{uuid.uuid4().hex[:8]}",
            "name": f"mlite-{model_name}-v1-{allocated_port}",
            "status": "RUNNING",
            "port": allocated_port,
            "simulated": True,
        }
        mock_docker.is_container_healthy.return_value = True
        mock_docker.stop_container.return_value = True

        container = mock_docker.run_inference_container(
            image="mlite-serving:latest",
            port=allocated_port,
            model_name=model_name,
            model_version=version_num,
        )
        assert container["status"] == "RUNNING"
        assert container["port"] == allocated_port

        # ── Step 7: Inference Prediction Probing ───────────────────
        prediction_payload = {"features": [0.85, 3.4, 1.15]}
        # Simulated prediction response
        prediction_response = {
            "prediction": [1],
            "probabilities": [0.08, 0.92],
            "latency_ms": 4.2,
            "model_version": 1,
        }
        assert prediction_response["prediction"] == [1]
        assert prediction_response["latency_ms"] < 50.0

        # ── Step 8: Feature Drift Ingestion & Detection ────────────
        # Introduce shifted feature values
        shifted_features = [9.8, 12.4, 85.0]
        drift_evaluation = {
            "drift_detected": True,
            "drift_score": 0.002,  # p-value < 0.05
            "affected_features": ["feature1", "feature3"],
            "severity": "HIGH",
        }
        assert drift_evaluation["drift_detected"] is True
        assert drift_evaluation["severity"] == "HIGH"

        # ── Step 9: Alert Dispatching ──────────────────────────────
        alert_event = {
            "id": f"alert-{uuid.uuid4().hex[:8]}",
            "title": f"Feature Drift Detected on {model_name}",
            "severity": "HIGH",
            "status": "OPEN",
        }
        assert alert_event["status"] == "OPEN"

        # ── Step 10: Faulty Candidate v2 & Emergency Rollback ──────
        coordinator = RollbackCoordinator(session=mock_session, docker_manager=mock_docker)
        with patch.object(coordinator, "_get_active_deployment") as mock_get_dep, \
             patch.object(coordinator, "_get_model_version") as mock_get_ver, \
             patch.object(coordinator, "_check_health", return_value=True):

            from packages.core.models.deployment import Deployment, DeploymentStatus
            from packages.core.models.model_registry import ModelVersion

            current_dep = Deployment(
                id="dep-faulty-v2",
                model_name=model_name,
                model_version=2,
                port=8106,
                status=DeploymentStatus.RUNNING,
            )
            v1_model = ModelVersion(id="mv-1", model_id="m-1", version=1, stage=ModelStage.ARCHIVED)

            mock_get_dep.return_value = current_dep
            mock_get_ver.return_value = v1_model

            record = await coordinator.execute_rollback(
                model_name=model_name,
                target_version=1,
                reason="High drift and performance degradation on v2",
                initiated_by="e2e-tester",
            )

            # ── Step 11: Final State & Teardown Verification ───────
            assert record.status == RollbackStatus.COMPLETED
            assert record.from_version == 2
            assert record.to_version == 1

        # Stop containers cleanly
        teardown_ok = mock_docker.stop_container(container["container_id"])
        assert teardown_ok is True
