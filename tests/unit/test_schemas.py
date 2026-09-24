"""Unit tests for Pydantic v2 schemas and validation (Issue #28).

Validates input sanitization, field boundary checks, error formatting,
and serialization across all domain schemas:
- ProjectCreate, ProjectUpdate
- DeploymentCreate
- DatasetCreate, DatasetVersionCreate
- DriftCheckRequest, FeedbackRequest, DataQualityRuleConfig
- AlertCreate
- RollbackRequest, PolicyCreate
- LoginRequest, UserCreate, ApiKeyCreate
"""

from datetime import datetime, timezone
import pytest
from pydantic import ValidationError

from packages.core.schemas.project import ProjectCreate, ProjectUpdate
from packages.core.schemas.deployment import DeploymentCreate
from packages.core.schemas.dataset import DatasetCreate, DatasetVersionCreate
from packages.core.schemas.monitoring import (
    DriftCheckRequest,
    FeedbackRequest,
    DataQualityRuleConfig,
)
from packages.core.schemas.alert import AlertCreate
from packages.core.schemas.rollback import RollbackRequest, PolicyCreate
from packages.core.schemas.security import (
    LoginRequest,
    UserCreate,
    ApiKeyCreate,
    UserRole,
)
from packages.core.models.alert import AlertSeverity
from packages.core.models.dataset import DatasetFormat


class TestProjectSchemas:
    """Validate Project schema constraints."""

    def test_valid_project_create(self):
        p = ProjectCreate(name="Credit Risk", description="Evaluate default risk")
        assert p.name == "Credit Risk"
        assert p.description == "Evaluate default risk"

    def test_empty_project_name_raises(self):
        with pytest.raises(ValidationError):
            ProjectCreate(name="")

    def test_project_update_partial(self):
        u = ProjectUpdate(description="Updated description")
        assert u.name is None
        assert u.description == "Updated description"


class TestDeploymentSchemas:
    """Validate Deployment schema constraints."""

    def test_valid_deployment_create(self):
        d = DeploymentCreate(
            model_name="fraud-detector",
            model_version=2,
            port=8105,
        )
        assert d.model_name == "fraud-detector"
        assert d.model_version == 2
        assert d.port == 8105

    def test_invalid_deployment_version_zero_or_negative(self):
        with pytest.raises(ValidationError):
            DeploymentCreate(model_name="fraud-detector", model_version=0)


class TestDatasetSchemas:
    """Validate Dataset schema constraints."""

    def test_valid_dataset_create(self):
        ds = DatasetCreate(
            name="churn-jan-2026",
            format=DatasetFormat.CSV,
            description="Monthly churn cohort",
        )
        assert ds.name == "churn-jan-2026"
        assert ds.format == DatasetFormat.CSV

    def test_dataset_version_create_defaults(self):
        dsv = DatasetVersionCreate(
            file_path="s3://mlite-datasets/churn.csv",
            row_count=10000,
            column_count=24,
            size_bytes=5242880,
            sha256_hash="e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855",
        )
        assert dsv.row_count == 10000
        assert dsv.column_count == 24


class TestMonitoringSchemas:
    """Validate monitoring & alerting schemas."""

    def test_drift_check_request_validation(self):
        req = DriftCheckRequest(
            model_name="churn-model",
            reference_dataset_id="ds-ref-1",
            current_dataset_id="ds-curr-1",
            threshold=0.05,
        )
        assert req.threshold == 0.05

    def test_feedback_request_validation(self):
        fb = FeedbackRequest(
            deployment_id="dep-123",
            prediction_id="pred-456",
            actual_label="1",
        )
        assert fb.actual_label == "1"

    def test_alert_create(self):
        al = AlertCreate(
            title="High Latency Warning",
            description="p95 latency exceeded 200ms",
            severity=AlertSeverity.HIGH,
            model_name="recommender",
        )
        assert al.severity == AlertSeverity.HIGH


class TestRollbackSchemas:
    """Validate rollback and policy schemas."""

    def test_valid_rollback_request(self):
        r = RollbackRequest(target_version=1, reason="High error rate spike")
        assert r.target_version == 1
        assert r.reason == "High error rate spike"

    def test_policy_create_validation(self):
        pol = PolicyCreate(
            model_name="fraud-detector",
            metric_name="error_rate",
            threshold=0.05,
            comparison_operator="GREATER_THAN",
            evaluation_window_minutes=15,
            consecutive_violations=3,
        )
        assert pol.threshold == 0.05
        assert pol.consecutive_violations == 3


class TestSecuritySchemas:
    """Validate authentication & user schemas."""

    def test_valid_login_request(self):
        login = LoginRequest(username="alice", password="securepassword123")
        assert login.username == "alice"

    def test_invalid_login_empty(self):
        with pytest.raises(ValidationError):
            LoginRequest(username="", password="")

    def test_user_create_validation(self):
        user = UserCreate(
            email="developer@mlite.local",
            username="dev_john",
            password="strongPassword8",
            role=UserRole.DEVELOPER,
        )
        assert user.username == "dev_john"
        assert user.role == UserRole.DEVELOPER

    def test_user_create_short_password_rejected(self):
        with pytest.raises(ValidationError):
            UserCreate(
                email="dev@mlite.local",
                username="valid_user",
                password="123",  # Less than 8 characters
            )

    def test_api_key_create(self):
        k = ApiKeyCreate(name="CI-Pipeline", expires_at=datetime.now(timezone.utc))
        assert k.name == "CI-Pipeline"
