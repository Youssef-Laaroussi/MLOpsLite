"""Deferred security regression checks for one-account Solo setup and ownership."""

import asyncio

import pytest
from fastapi import HTTPException
from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import async_sessionmaker, create_async_engine
from starlette.requests import Request

from apps.api.errors import NotFoundError
from apps.api.routers.auth import register, update_user
from apps.api.routers.setup import SetupRequest, complete_setup, setup_status
from packages.core.models.instance import InstanceState
from packages.core.models.project import Project, ProjectMembership, ProjectRole
from packages.core.models.user import User, UserRole
from packages.core.schemas.project import ProjectCreate
from packages.core.schemas.security import UserRegisterRequest, UserUpdate
from packages.core.security.auth import hash_password
from packages.core.services.instance_service import (
    adopt_solo_account,
    initialize_instance,
    rotate_setup_code,
)
from packages.core.services.project_service import ProjectService


@pytest.fixture
async def installation(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'solo.db'}")
    code = await initialize_instance(engine)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    yield engine, factory, code
    await engine.dispose()


def request():
    return Request({"type": "http", "client": ("127.0.0.1", 1234), "headers": []})


def account(code, username="personal"):
    return SetupRequest(
        setup_code=code, username=username, email=f"{username}@example.test",
        password="personal-strong-password",
    )


async def finish(factory, payload):
    async with factory.begin() as session:
        return await complete_setup(payload, request(), session)


async def test_setup_creates_one_personal_admin_and_cannot_be_replayed(installation):
    _, factory, code = installation
    tokens = await finish(factory, account(code))
    assert tokens["access_token"] and tokens["refresh_token"]
    async with factory() as session:
        user = (await session.scalars(select(User))).one()
        assert user.username == "personal" and user.role == UserRole.ADMIN
        state = await session.get(InstanceState, 1)
        assert state.completed_at and state.setup_token_hash is None
    with pytest.raises(HTTPException) as rejected:
        await finish(factory, account(code, "another"))
    assert rejected.value.status_code == 403


async def test_invalid_code_does_not_consume_setup(installation):
    _, factory, code = installation
    with pytest.raises(HTTPException):
        await finish(factory, account("x" * 32))
    async with factory() as session:
        assert (await setup_status(session))["setup_required"] is True
    await finish(factory, account(code))


async def test_competing_setups_can_create_only_one_admin(installation):
    _, factory, code = installation
    results = await asyncio.gather(
        finish(factory, account(code, "first")),
        finish(factory, account(code, "second")),
        return_exceptions=True,
    )
    assert sum(isinstance(result, dict) for result in results) == 1
    assert sum(isinstance(result, HTTPException) for result in results) == 1
    async with factory() as session:
        assert await session.scalar(select(func.count()).select_from(User)) == 1


async def test_restart_does_not_reset_password_role_or_reopen_setup(installation):
    engine, factory, code = installation
    await finish(factory, account(code))
    async with factory.begin() as session:
        user = await session.scalar(select(User))
        user.hashed_password = "operator-changed-password-hash"
        user.role = UserRole.USER
    assert await initialize_instance(engine, "different-code" * 4) is None
    async with factory() as session:
        user = await session.scalar(select(User))
        assert user.hashed_password == "operator-changed-password-hash"
        assert user.role == UserRole.USER
        assert (await setup_status(session))["setup_required"] is False


async def test_code_rotation_invalidates_previous_code(installation):
    _, factory, code = installation
    async with factory.begin() as session:
        replacement = await rotate_setup_code(session)
    with pytest.raises(HTTPException):
        await finish(factory, account(code))
    await finish(factory, account(replacement))


async def test_registration_cannot_claim_initial_administrator(installation, monkeypatch):
    from types import SimpleNamespace

    _, factory, code = installation
    monkeypatch.setattr("apps.api.routers.auth.get_settings", lambda: SimpleNamespace(
        allow_registration=True, jwt_secret_key="isolated-test-signing-key-at-least-32-chars",
    ))
    payload = UserRegisterRequest(username="ordinary", email="ordinary@example.test", password="ordinary-password")
    async with factory.begin() as session:
        assert (await setup_status(session))["registration_enabled"] is True
        tokens = await register(payload, request(), session)
        assert tokens["access_token"]
        ordinary = await session.scalar(select(User).where(User.username == "ordinary"))
        assert ordinary.role == UserRole.USER
        assert await session.scalar(select(func.count()).select_from(User).where(User.role == UserRole.ADMIN)) == 0
    async with factory() as session:
        assert (await setup_status(session))["setup_required"] is False
    with pytest.raises(HTTPException) as rejected:
        await finish(factory, account(code))
    assert rejected.value.status_code == 403


async def test_disabled_registration_does_not_consume_initialization(installation, monkeypatch):
    from types import SimpleNamespace

    _, factory, _ = installation
    monkeypatch.setattr("apps.api.routers.auth.get_settings", lambda: SimpleNamespace(allow_registration=False))
    with pytest.raises(HTTPException) as rejected:
        async with factory.begin() as session:
            await register(UserRegisterRequest(username="ordinary", email="ordinary@example.test", password="ordinary-password"), request(), session)
    assert rejected.value.status_code == 403
    async with factory() as session:
        assert (await session.get(InstanceState, 1)).completed_at is None
        assert await session.scalar(select(func.count()).select_from(User)) == 0


@pytest.mark.parametrize("change", [{"role": UserRole.USER}, {"is_active": False}])
async def test_last_active_admin_cannot_remove_own_administration(installation, change):
    _, factory, code = installation
    await finish(factory, account(code))
    with pytest.raises(HTTPException) as rejected:
        async with factory.begin() as session:
            user = await session.scalar(select(User))
            await update_user(user.id, UserUpdate(**change), request(), session, user)
    assert rejected.value.status_code == 409


async def test_new_project_has_real_owner_and_is_hidden_from_unrelated_account(installation):
    _, factory, code = installation
    await finish(factory, account(code))
    async with factory.begin() as session:
        owner = await session.scalar(select(User))
        project = await ProjectService(session).create(ProjectCreate(name="Fraud", slug="fraud"), owner.id)
        membership = await session.get(ProjectMembership, (project.id, owner.id))
        assert membership.project_role == ProjectRole.OWNER
        projects, count = await ProjectService(session).list_projects(user_id=owner.id)
        assert count == 1 and projects[0].owner_id == owner.id
        hidden, count = await ProjectService(session).list_projects(user_id="unrelated")
        assert not hidden and count == 0
        with pytest.raises(NotFoundError):
            await ProjectService(session).require_owner(project, "unrelated")


async def test_explicit_adoption_keeps_passwords_and_existing_project_owners(installation):
    _, factory, code = installation
    await finish(factory, account(code))
    async with factory.begin() as session:
        first = await session.scalar(select(User))
        owned = await ProjectService(session).create(ProjectCreate(name="Owned", slug="owned"), first.id)
        other = User(username="existing", email="existing@example.test", hashed_password=hash_password("existing-password"), role=UserRole.USER)
        session.add(other)
        legacy = Project(name="Legacy", slug="legacy", default_branch="main")
        session.add(legacy)
        await session.flush()
        original_password = other.hashed_password
        assert await adopt_solo_account(session, "existing", claim_unowned_projects=True) == 1
        assert other.hashed_password == original_password and other.role == UserRole.ADMIN
        assert (await session.get(ProjectMembership, (owned.id, first.id))).project_role == ProjectRole.OWNER
        assert (await session.get(ProjectMembership, (legacy.id, other.id))).project_role == ProjectRole.OWNER


async def test_existing_database_never_reopens_web_setup(tmp_path):
    engine = create_async_engine(f"sqlite+aiosqlite:///{tmp_path / 'existing.db'}")
    from packages.core.db.base import Base

    async with engine.begin() as connection:
        await connection.run_sync(Base.metadata.create_all)
    factory = async_sessionmaker(engine, expire_on_commit=False)
    async with factory.begin() as session:
        session.add(User(username="legacy", email="legacy@example.test", role=UserRole.USER, hashed_password="keep-me"))
    assert await initialize_instance(engine) is None
    async with factory() as session:
        assert (await session.get(InstanceState, 1)).completed_at is not None
        assert (await setup_status(session))["migration_required"] is True
    await engine.dispose()
