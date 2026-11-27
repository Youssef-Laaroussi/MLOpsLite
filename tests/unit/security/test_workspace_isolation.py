"""Exercise isolation with real SQL, including aggregates and foreign-key attacks."""

import pytest
from sqlalchemy import create_engine, delete, func, select
from sqlalchemy.orm import Session

import packages.core.models  # noqa: F401
from apps.api.errors import NotFoundError
from packages.core.db.base import Base
from packages.core.models.alert import AlertRule, NotificationChannel
from packages.core.models.dataset import Dataset, DatasetVersion
from packages.core.models.deployment import Deployment, DeploymentMetric, DeploymentStatus
from packages.core.models.model_registry import ModelVersion, RegisteredModel
from packages.core.models.project import Project, ProjectMembership, ProjectRole
from packages.core.models.user import User, UserRole
from packages.core.security.workspace import SCOPE_KEY


@pytest.fixture
def database(tmp_path):
    engine = create_engine(f"sqlite:///{tmp_path / 'private.db'}")
    Base.metadata.create_all(engine)
    with Session(engine) as session:
        for user_id in ("a", "b", "admin"):
            session.add(User(id=user_id, username=user_id, email=user_id + "@example.test",
                             hashed_password="test", role=UserRole.ADMIN if user_id == "admin" else UserRole.USER))
            session.add(Project(id="p-" + user_id, name=user_id, slug=user_id))
            session.flush()
            session.add(ProjectMembership(project_id="p-" + user_id, user_id=user_id, project_role=ProjectRole.OWNER))
            session.add(Dataset(id="d-" + user_id, owner_id=user_id, name="data-" + user_id, project_id="p-" + user_id))
            session.add(RegisteredModel(id="m-" + user_id, owner_id=user_id, name="model-" + user_id, project_id="p-" + user_id))
            session.flush()
            session.add(DatasetVersion(id="v-" + user_id, dataset_id="d-" + user_id, version_num=1, hash_sha256="a" * 64))
            session.add(ModelVersion(id="mv-" + user_id, model_id="m-" + user_id, version=1))
            session.add(Deployment(id="dep-" + user_id, owner_id=user_id, project_id="p-" + user_id,
                                   model_name="model-" + user_id, model_version=1, port=8100,
                                   endpoint_url="http://localhost:8100", status=DeploymentStatus.RUNNING))
            session.flush()
            session.add(DeploymentMetric(deployment_id="dep-" + user_id, requests_count=10))
            session.add(AlertRule(owner_id=user_id, name=user_id, metric="drift_share", threshold=0.2))
            session.add(NotificationChannel(owner_id=user_id, name=user_id, kind="WEBHOOK", url="https://example.test/" + user_id))
        session.add(Dataset(id="unassigned", name="unresolved legacy data"))
        session.commit()
    yield engine
    engine.dispose()


@pytest.mark.parametrize("user_id", ["a", "b", "admin", "empty-user"])
def test_catalogs_details_counts_and_aliases_are_private(database, user_id):
    with Session(database, info={SCOPE_KEY: user_id}) as session:
        expected = [] if user_id == "empty-user" else ["d-" + user_id]
        assert list(session.scalars(select(Dataset.id))) == expected
        assert session.scalar(select(func.count(Dataset.id))) == len(expected)
        assert session.scalar(select(func.count(ModelVersion.id))) == len(expected)
        assert session.scalar(select(func.sum(DeploymentMetric.requests_count))) == (10 if expected else None)
        assert session.get(Dataset, "unassigned") is None
        assert session.get(Dataset, "d-b") is None if user_id != "b" else True
        assert list(session.scalars(select(Project.id))) == ([] if not expected else ["p-" + user_id])
        assert list(session.scalars(select(NotificationChannel.name))) == ([] if not expected else [user_id])


def test_writes_stamp_creator_and_reject_foreign_references(database):
    with Session(database, info={SCOPE_KEY: "a"}) as session:
        own = Dataset(name="new private data")
        session.add(own)
        session.flush()
        assert own.owner_id == "a"
        session.rollback()
        session.add(Dataset(name="stolen project", project_id="p-b"))
        with pytest.raises(NotFoundError):
            session.flush()


@pytest.mark.parametrize("record", [
    lambda: DatasetVersion(dataset_id="d-b", version_num=2, hash_sha256="b" * 64),
    lambda: ModelVersion(model_id="m-b", version=2),
    lambda: AlertRule(name="foreign rule", model_name="model-b", metric="drift_share", threshold=0.2),
])
def test_foreign_children_cannot_be_created(database, record):
    with Session(database, info={SCOPE_KEY: "a"}) as session:
        session.add(record())
        with pytest.raises(NotFoundError):
            session.flush()


def test_ownership_cannot_be_transferred_by_workspace(database):
    with Session(database, info={SCOPE_KEY: "a"}) as session:
        dataset = session.get(Dataset, "d-a")
        dataset.owner_id = "b"
        with pytest.raises(NotFoundError):
            session.flush()


def test_bulk_delete_cannot_affect_foreign_resources(database):
    with Session(database, info={SCOPE_KEY: "a"}) as session:
        result = session.execute(delete(Dataset).where(Dataset.id == "d-b"))
        assert result.rowcount == 0
        session.commit()
    with Session(database) as administrator:
        assert administrator.get(Dataset, "d-b") is not None
        assert administrator.scalar(select(func.count(Dataset.id))) == 4


def test_legacy_upgrade_preserves_rows_and_only_uses_established_owners():
    from packages.core.services.workspace_migration import upgrade_workspace_schema

    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        connection.exec_driver_sql("CREATE TABLE users (id VARCHAR(36) PRIMARY KEY)")
        connection.exec_driver_sql("CREATE TABLE projects (id VARCHAR(36) PRIMARY KEY)")
        connection.exec_driver_sql("CREATE TABLE project_memberships (project_id VARCHAR(36), user_id VARCHAR(36), project_role VARCHAR(20))")
        connection.exec_driver_sql("CREATE TABLE datasets (id VARCHAR(36) PRIMARY KEY, project_id VARCHAR(36))")
        connection.exec_driver_sql("INSERT INTO users VALUES ('a'), ('b')")
        connection.exec_driver_sql("INSERT INTO projects VALUES ('pa'), ('pb')")
        connection.exec_driver_sql("INSERT INTO project_memberships VALUES ('pa','a','OWNER'), ('pb','b','OWNER')")
        connection.exec_driver_sql("INSERT INTO datasets VALUES ('da','pa'), ('db','pb'), ('unresolved',NULL)")
        upgrade_workspace_schema(connection)
        upgrade_workspace_schema(connection)
        rows = dict(connection.exec_driver_sql("SELECT id, owner_id FROM datasets").all())
        assert rows == {"da": "a", "db": "b", "unresolved": None}
    engine.dispose()
