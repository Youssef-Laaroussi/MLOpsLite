"""One-time setup and explicit, non-destructive adoption of existing Solo installations."""

import hashlib
import secrets
from datetime import UTC, datetime

from fastapi import HTTPException
from sqlalchemy import exists, func, select, text, update
from sqlalchemy.ext.asyncio import AsyncEngine, AsyncSession

from packages.core.db.base import Base
from packages.core.models.audit import AuditAction, AuditLog
from packages.core.models.instance import InstanceState
from packages.core.models.project import Project, ProjectMembership, ProjectRole
from packages.core.models.user import User, UserRole


def token_hash(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


async def initialize_instance(engine: AsyncEngine, configured_token: str = "") -> str | None:
    """Add tables without altering existing ones; return a new local setup code only once."""
    # Import every model before creating the schema, including foreign-key targets.
    import packages.core.models  # noqa: F401

    async with engine.begin() as connection:
        if connection.dialect.name == "postgresql":
            await connection.execute(text("SELECT pg_advisory_xact_lock(716003)"))
        elif connection.dialect.name == "sqlite":
            await connection.exec_driver_sql("BEGIN IMMEDIATE")
        await connection.run_sync(Base.metadata.create_all)
        async with AsyncSession(bind=connection, expire_on_commit=False) as session:
            state = await session.get(InstanceState, 1)
            if state is not None:
                return None
            has_users = bool(await session.scalar(select(func.count()).select_from(User)))
            code = None if has_users else configured_token or secrets.token_urlsafe(32)
            session.add(InstanceState(
                id=1,
                completed_at=datetime.now(UTC) if has_users else None,
                setup_token_hash=token_hash(code) if code else None,
            ))
            await session.flush()
            return code


async def get_instance_state(session: AsyncSession) -> InstanceState:
    state = await session.get(InstanceState, 1)
    if state is None:
        raise HTTPException(503, "Installation state unavailable. Restart the API to migrate its schema.")
    return state


async def claim_setup(session: AsyncSession, code: str) -> None:
    """Atomically consume the local code; rollback restores it if account creation fails."""
    result = await session.execute(
        update(InstanceState)
        .where(
            InstanceState.id == 1,
            InstanceState.completed_at.is_(None),
            InstanceState.setup_token_hash == token_hash(code),
        )
        .values(completed_at=datetime.now(UTC), setup_token_hash=None)
    )
    if result.rowcount != 1:
        raise HTTPException(403, "Invalid setup code or installation already configured.")
    if await session.scalar(select(func.count()).select_from(User)):
        raise HTTPException(409, "Existing accounts must be migrated locally; web setup is disabled.")


async def rotate_setup_code(session: AsyncSession) -> str:
    """Local operator recovery only; never reopen an already initialized installation."""
    code = secrets.token_urlsafe(32)
    result = await session.execute(
        update(InstanceState)
        .where(InstanceState.id == 1, InstanceState.completed_at.is_(None))
        .values(setup_token_hash=token_hash(code))
    )
    if result.rowcount != 1 or await session.scalar(select(func.count()).select_from(User)):
        raise ValueError("Setup is closed. Use adopt-solo for an existing account.")
    return code


async def adopt_solo_account(
    session: AsyncSession, username: str, claim_unowned_projects: bool = False,
) -> int:
    """Explicit local migration: preserve users, passwords, resources and existing owners."""
    state = await get_instance_state(session)
    # Serialize adoption and administrator-role changes against the singleton row.
    await session.execute(update(InstanceState).where(InstanceState.id == 1).values(id=1))
    user = await session.scalar(select(User).where(User.username == username))
    if user is None or not user.is_active:
        raise ValueError("Choose an existing active account by its exact username.")
    old_role = user.role
    user.role = UserRole.ADMIN
    state.completed_at = state.completed_at or datetime.now(UTC)
    state.setup_token_hash = None
    session.add(AuditLog(
        action=AuditAction.USER_UPDATE, resource_type="user", resource_id=user.id,
        resource_name=user.username, user_id=user.id, user_email=user.email,
        changes_json={"local_solo_adoption": True, "role": {"from": old_role.value, "to": "ADMIN"}},
    ))
    claimed = 0
    if claim_unowned_projects:
        projects = list((await session.scalars(select(Project).where(~exists().where(
            ProjectMembership.project_id == Project.id,
            ProjectMembership.project_role == ProjectRole.OWNER,
        )))).all())
        for project in projects:
            membership = await session.get(ProjectMembership, (project.id, user.id))
            if membership is None:
                session.add(ProjectMembership(
                    project_id=project.id, user_id=user.id, project_role=ProjectRole.OWNER,
                ))
            else:
                membership.project_role = ProjectRole.OWNER
            session.add(AuditLog(
                action=AuditAction.PROJECT_UPDATE, resource_type="project", resource_id=project.id,
                resource_name=project.slug, user_id=user.id, user_email=user.email,
                changes_json={"local_solo_adoption": True, "owner_id": user.id},
            ))
            claimed += 1
    await session.flush()
    return claimed
