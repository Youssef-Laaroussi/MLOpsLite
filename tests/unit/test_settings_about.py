"""About metadata reports installed versions without exposing database URLs."""
from types import SimpleNamespace
from unittest.mock import patch
from importlib.metadata import PackageNotFoundError

import pytest
from apps.api.routers.health import get_about_information, router


@pytest.mark.asyncio
async def test_about_uses_runtime_metadata_and_only_public_database_name():
    session = SimpleNamespace(bind=SimpleNamespace(dialect=SimpleNamespace(name="postgresql", server_version_info=(16, 4))))
    with patch("importlib.metadata.version", return_value="2.15.0"):
        result = await get_about_information(settings=SimpleNamespace(app_version="0.1.0"), db=session, current_user=object())
    assert result["version"] == "0.1.0"
    assert result["database"] == "PostgreSQL 16.4"
    assert result["mlflow"] == "2.15.0"
    assert set(result) == {"version", "python", "fastapi", "database", "mlflow", "dvc", "runtime"}


@pytest.mark.asyncio
async def test_about_missing_optional_packages_are_not_invented():
    with patch("importlib.metadata.version", side_effect=PackageNotFoundError):
        result = await get_about_information(settings=SimpleNamespace(app_version="0.1.0"), db=SimpleNamespace(bind=None), current_user=object())
    assert result["dvc"] is None
    assert result["database"] is None


def test_about_requires_authentication():
    route = next(route for route in router.routes if route.path == "/api/v1/settings/about")
    assert "get_current_user" in {dependency.call.__name__ for dependency in route.dependant.dependencies}
