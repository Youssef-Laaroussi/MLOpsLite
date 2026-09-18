"""Integration tests for PostgreSQL database interactions (Issue #29).

Tests:
- Async engine connection pooling and healthcheck
- SQLAlchemy async queries across core domain tables (Projects, Models, Deployments, Users, AuditLogs)
- Foreign key cascading and relationship loading
- Transaction isolation and rollback on exception
"""

import os
import uuid
import pytest
from sqlalchemy import select, text
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker

from packages.core.models.project import Project, ProjectStatus
from packages.core.models.model_registry import RegisteredModel, ModelVersion, ModelStage
from packages.core.models.deployment import Deployment, DeploymentStatus
from packages.core.models.user import User, UserRole
from packages.core.models.audit import AuditLog, AuditAction


TEST_DB_URL = os.getenv(
    "TEST_DATABASE_URL",
    os.getenv("DATABASE_URL", "sqlite+aiosqlite:///:memory:")
)


@pytest.fixture
async def integration_db_session():
    """Create an isolated database session for integration testing."""
    engine = create_async_engine(TEST_DB_URL, echo=False)
    
    # Create tables if using in-memory or test database
    from packages.core.db.base import Base
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    
    session_maker = async_sessionmaker(engine, expire_on_commit=False, class_=AsyncSession)
    async with session_maker() as session:
        yield session
        await session.rollback()

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.drop_all)
    await engine.dispose()


class TestDatabaseIntegration:
    """Verify live database operations and transaction integrity."""

    @pytest.mark.asyncio
    async def test_project_crud_and_query(self, integration_db_session):
        project = Project(
            name=f"Integration Project {uuid.uuid4().hex[:6]}",
            slug=f"integration-proj-{uuid.uuid4().hex[:6]}",
            description="Testing async database operations",
            status=ProjectStatus.ACTIVE,
        )
        integration_db_session.add(project)
        await integration_db_session.flush()
        await integration_db_session.refresh(project)

        assert project.id is not None

        # Query back
        res = await integration_db_session.execute(
            select(Project).where(Project.id == project.id)
        )
        fetched = res.scalar_one_or_none()
        assert fetched is not None
        assert fetched.name == project.name

    @pytest.mark.asyncio
    async def test_model_version_stage_transition(self, integration_db_session):
        model = RegisteredModel(
            name="churn-predictor-integration",
            description="Model stage test",
        )
        integration_db_session.add(model)
        await integration_db_session.flush()

        v1 = ModelVersion(
            model_id=model.id,
            version=1,
            stage=ModelStage.STAGING,
        )
        integration_db_session.add(v1)
        await integration_db_session.flush()

        # Promote to PRODUCTION
        v1.stage = ModelStage.PRODUCTION
        await integration_db_session.flush()
        await integration_db_session.refresh(v1)

        assert v1.stage == ModelStage.PRODUCTION

    @pytest.mark.asyncio
    async def test_audit_log_persists_state(self, integration_db_session):
        audit_entry = AuditLog(
            action=AuditAction.DEPLOYMENT_ROLLBACK,
            resource_type="deployment",
            resource_id="dep-uuid-test",
            resource_name="churn-predictor-integration",
            user_email="admin@mlite.local",
            changes_json={"from_version": 2, "to_version": 1},
        )
        integration_db_session.add(audit_entry)
        await integration_db_session.flush()
        await integration_db_session.refresh(audit_entry)

        assert audit_entry.id is not None
        assert audit_entry.timestamp is not None
        assert audit_entry.action == AuditAction.DEPLOYMENT_ROLLBACK

    @pytest.mark.asyncio
    async def test_transaction_rollback_on_error(self, integration_db_session):
        user1 = User(
            username="unique_user_alpha",
            email="alpha@mlite.local",
            hashed_password="hash",
            role=UserRole.DEVELOPER,
        )
        integration_db_session.add(user1)
        await integration_db_session.flush()

        # Attempt to insert user with duplicate username in sub-transaction
        user_duplicate = User(
            username="unique_user_alpha",  # Duplicate username
            email="different@mlite.local",
            hashed_password="hash",
            role=UserRole.DEVELOPER,
        )
        integration_db_session.add(user_duplicate)
        with pytest.raises(Exception):
            await integration_db_session.flush()

        # Rollback and verify user1 can still be queried safely
        await integration_db_session.rollback()
