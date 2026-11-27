"""Real SQL and in-memory objects: immutable uploads and lossless migration."""

import hashlib
from pathlib import Path

import pytest
import pytest_asyncio
from sqlalchemy import create_engine, inspect, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine

import packages.core.models  # noqa: F401
from packages.core.db.base import Base
from packages.core.models.dataset import Dataset, DatasetVersion
from packages.core.models.model_registry import ModelVersion, RegisteredModel
from packages.core.models.monitoring import DataQualityReport, DriftEvaluation
from packages.core.models.project import Project, ProjectMembership, ProjectRole
from packages.core.models.user import User
from packages.core.services.storage_schema import upgrade_storage_schema
from packages.core.storage.client import StorageClient, StorageError
from packages.core.storage.reorganize import (
    backup_object,
    build_plan,
    copy_verified,
    lock_references,
    remove_originals,
    update_references,
)
from packages.data.service import DatasetService


class MemoryStorage:
    default_bucket = "mlite-datasets"
    compute_sha256 = staticmethod(StorageClient.compute_sha256)

    def __init__(self):
        self.objects = {}
        self._s3 = self
        self.corrupt_copy = False

    def list_files(self, prefix="", bucket_name=None):
        return [key for bucket, key in self.objects if bucket == bucket_name and key.startswith(prefix)]

    def file_exists(self, key, bucket_name=None):
        return (bucket_name or self.default_bucket, key) in self.objects

    def upload_file(self, path, key, bucket_name=None, *, overwrite=True):
        target = (bucket_name or self.default_bucket, key)
        if target in self.objects and not overwrite:
            raise StorageError("immutable")
        self.objects[target] = Path(path).read_bytes()

    def download_file(self, key, path, bucket_name=None):
        Path(path).write_bytes(self.objects[bucket_name or self.default_bucket, key])

    def object_sha256(self, key, bucket_name=None):
        return hashlib.sha256(self.objects[bucket_name or self.default_bucket, key]).hexdigest()

    def head_object(self, Bucket, Key):
        return {"ETag": self.object_sha256(Key, Bucket)}

    def copy_object(self, Bucket, Key, CopySource, CopySourceIfMatch, **kwargs):
        assert self.object_sha256(CopySource["Key"], CopySource["Bucket"]) == CopySourceIfMatch
        self.objects[Bucket, Key] = b"corrupted" if self.corrupt_copy else self.objects[CopySource["Bucket"], CopySource["Key"]]

    def delete_file(self, key, bucket_name=None):
        del self.objects[bucket_name or self.default_bucket, key]


@pytest_asyncio.fixture
async def storage_database(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'storage.db'}")
    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory.begin() as db:
        db.add(User(id="u", username="private-user", email="qa@example.test", hashed_password="test"))
        db.add(Project(id="p", slug="iris", name="Iris"))
        await db.flush()
        db.add(ProjectMembership(project_id="p", user_id="u", project_role=ProjectRole.OWNER))
        db.add(Dataset(id="d", owner_id="u", project_id="p", name="Données Été"))
        db.add(RegisteredModel(id="m", owner_id="u", project_id="p", name="iris-model"))
    yield factory
    await engine.dispose()


@pytest.mark.asyncio
async def test_versions_have_frozen_paths_and_original_names(storage_database, tmp_path):
    source = tmp_path / "tmp-random.csv"
    source.write_text("feature,target\n1,0\n2,1\n")
    storage = MemoryStorage()
    async with storage_database.begin() as db:
        first = await DatasetService(db, storage).register_version("d", file_path=source, original_filename="My upload.csv")
        assert first.s3_key.endswith("/versions/v000001/data.csv")
        assert first.original_filename == "My upload.csv"
        prefix = (await db.get(Dataset, "d")).storage_prefix
        assert prefix == "users/u/projects/iris-p/datasets/donnees-ete-d"
    async with storage_database.begin() as db:
        (await db.get(Dataset, "d")).name = "Renamed dataset"
        (await db.get(Project, "p")).slug = "renamed-project"
        second = await DatasetService(db, storage).register_version("d", file_path=source)
        assert second.s3_key == f"s3://mlite-datasets/{prefix}/versions/v000002/data.csv"
    assert len(storage.objects) == 2
    assert all(not key.endswith("manifest.json") for bucket, key in storage.objects)


@pytest.mark.asyncio
async def test_storage_failure_never_persists_a_fake_version(storage_database, tmp_path, monkeypatch):
    source = tmp_path / "data.csv"
    source.write_text("feature\n1\n")
    storage = MemoryStorage()

    def unavailable(*args, **kwargs):
        raise StorageError("MinIO unavailable")

    monkeypatch.setattr(storage, "upload_file", unavailable)
    with pytest.raises(StorageError):
        async with storage_database.begin() as db:
            await DatasetService(db, storage).register_version("d", file_path=source)
    async with storage_database() as db:
        assert list(await db.scalars(select(DatasetVersion))) == []


@pytest.mark.asyncio
async def test_http_upload_and_quality_archive_use_the_same_private_tree(storage_database, monkeypatch):
    from httpx import ASGITransport, AsyncClient

    from apps.api.dependencies import get_db
    from apps.api.main import create_app
    from packages.core.security.dependencies import get_current_user

    storage = MemoryStorage()
    monkeypatch.setattr("packages.data.service.get_storage_client", lambda: storage)
    async with storage_database() as db:
        user = await db.get(User, "u")

    async def connection():
        async with storage_database() as db:
            try:
                yield db
                await db.commit()
            except Exception:
                await db.rollback()
                raise

    app = create_app()
    app.dependency_overrides[get_db] = connection
    app.dependency_overrides[get_current_user] = lambda: user
    async with AsyncClient(transport=ASGITransport(app), base_url="http://test") as client:
        uploaded = await client.post("/api/v1/datasets/d/upload", files={"file": ("Original File.csv", b"feature,target\n1,0\n2,1\n", "text/csv")})
        assert uploaded.status_code == 201, uploaded.text
        assert uploaded.json()["original_filename"] == "Original File.csv"
        assert uploaded.json()["s3_key"] is None
        result = await client.post("/api/v1/datasets/d/validate")
        assert result.status_code == 201, result.text
        assert result.json()["rows_count"] == 2
        forbidden = await client.post("/api/v1/datasets/d/versions", json={"s3_key": "s3://mlite-datasets/users/another-user/data.csv"})
        assert forbidden.status_code == 422
    keys = list(storage.objects)
    assert len(keys) == 2
    assert any(bucket == "mlite-evaluations" and "/versions/v000001/quality/" in key for bucket, key in keys)
    assert all(key.startswith("users/u/projects/iris-p/datasets/donnees-ete-d/") for bucket, key in keys)


@pytest.mark.asyncio
async def test_verified_migration_preserves_bytes_and_updates_all_references(storage_database, tmp_path):
    storage = MemoryStorage()
    storage.objects = {
        ("mlite-datasets", "iris/hash/tmp.csv"): b"feature\n1\n",
        ("mlite-evaluations", "iris/eval/report.html"): b"<html>drift</html>",
        ("mlite-evaluations", "iris/eval/metrics.json"): b'{"drift_share":0}',
        ("mlite-evaluations", "quality/old.json"): b'{"score":100}',
        ("mlite-datasets", "forgotten/hash/tmp.csv"): b"legacy data",
        ("mlite-datasets", "dvc-cache/files/ab/cd"): b"DVC cache",
        ("mlflow-artifacts", "1/run/artifacts/model/MLmodel"): b"MLflow model",
        ("mlite-datasets", "older-model/model.pkl"): b"registered legacy model",
    }
    async with storage_database.begin() as db:
        db.add(ModelVersion(model_id="m", version=1, artifact_path="s3://mlite-datasets/older-model"))
        db.add(DatasetVersion(id="v", dataset_id="d", version_num=1, hash_sha256="0" * 64,
                              s3_key="s3://mlite-datasets/iris/hash/tmp.csv"))
        db.add(DriftEvaluation(id="e", model_name="iris-model", drift_share=0,
                               html_report_path="s3://mlite-evaluations/iris/eval/report.html"))
        db.add(DataQualityReport(id="q", dataset_id="d", score=100,
                                 s3_report_key="s3://mlite-evaluations/quality/old.json"))
    before = dict(storage.objects)
    async with storage_database() as db:
        plan = await build_plan(db, storage, archive_unreferenced=True)
        await db.rollback()
    assert len(plan["moves"]) == 5
    assert len(plan["updates"]) == 3
    backup = tmp_path / "backup"
    backup.mkdir()
    for move in plan["moves"]:
        backup_object(storage, move, backup)
    async with storage_database.begin() as db:
        await lock_references(db, plan)
        for move in plan["moves"]:
            copy_verified(storage, move)
        await update_references(db, plan)
    remove_originals(storage, plan)
    for move in plan["moves"]:
        assert storage.objects[move["bucket"], move["target"]] == before[move["bucket"], move["source"]]
        assert (backup / move["backup"]).read_bytes() == before[move["bucket"], move["source"]]
        assert (move["bucket"], move["source"]) not in storage.objects
    assert storage.objects["mlflow-artifacts", "1/run/artifacts/model/MLmodel"] == b"MLflow model"
    assert storage.objects["mlite-datasets", "dvc-cache/files/ab/cd"] == b"DVC cache"
    assert storage.objects["mlite-datasets", "older-model/model.pkl"] == b"registered legacy model"
    async with storage_database() as db:
        version = await db.get(DatasetVersion, "v")
        assert version.s3_key.endswith("/versions/v000001/data.csv")
        second_plan = await build_plan(db, storage, archive_unreferenced=True)
        assert second_plan["moves"] == []
        assert second_plan["updates"] == []


def test_copy_corruption_preserves_original(tmp_path):
    storage = MemoryStorage()
    storage.objects["mlite-datasets", "original"] = b"original bytes"
    move = {"bucket": "mlite-datasets", "source": "original", "target": "destination"}
    backup_object(storage, move, tmp_path)
    storage.corrupt_copy = True
    with pytest.raises(RuntimeError, match="checksum mismatch"):
        copy_verified(storage, move)
    assert storage.objects["mlite-datasets", "original"] == b"original bytes"


def test_additive_schema_upgrade_is_idempotent():
    engine = create_engine("sqlite:///:memory:")
    with engine.begin() as connection:
        for table in ("projects", "datasets", "registered_models", "dataset_versions"):
            connection.exec_driver_sql(f"CREATE TABLE {table} (id VARCHAR PRIMARY KEY)")
            connection.exec_driver_sql(f"INSERT INTO {table} (id) VALUES ('existing')")
        upgrade_storage_schema(connection)
        upgrade_storage_schema(connection)
        assert "storage_prefix" in {c["name"] for c in inspect(connection).get_columns("datasets")}
        assert "original_filename" in {c["name"] for c in inspect(connection).get_columns("dataset_versions")}
        assert connection.exec_driver_sql("SELECT id FROM datasets").scalar_one() == "existing"
    engine.dispose()
