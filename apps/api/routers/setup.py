"""Public setup status and locally authorized first-account creation."""

from typing import Any

from fastapi import APIRouter, Depends, Request
from pydantic import Field, SecretStr, field_validator
from sqlalchemy import exists, select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.config import get_settings
from apps.api.dependencies import get_db
from packages.core.models.audit import AuditAction, AuditLog
from packages.core.models.project import Project, ProjectMembership, ProjectRole
from packages.core.models.user import User, UserRole
from packages.core.schemas.security import TokenResponse, UserRegisterRequest
from packages.core.security.auth import create_access_token, create_refresh_token, hash_password
from packages.core.services.instance_service import claim_setup, get_instance_state

router = APIRouter(prefix="/api/v1/setup", tags=["Installation Setup"])


class SetupRequest(UserRegisterRequest):
    setup_code: SecretStr = Field(min_length=32, max_length=256)
    password: str = Field(min_length=12, max_length=72)
    model_config = {"extra": "forbid"}

    @field_validator("password")
    @classmethod
    def bcrypt_password_length(cls, value: str) -> str:
        if len(value.encode("utf-8")) > 72:
            raise ValueError("Password must be at most 72 UTF-8 bytes.")
        return value

    @field_validator("email")
    @classmethod
    def valid_email(cls, value: str) -> str:
        value = value.strip()
        if value.count("@") != 1 or any(char.isspace() for char in value):
            raise ValueError("Enter a valid email address.")
        local, domain = value.split("@")
        if not local or not domain:
            raise ValueError("Enter a valid email address.")
        return value


@router.get("/status")
async def setup_status(db: AsyncSession = Depends(get_db)) -> dict[str, Any]:
    state = await get_instance_state(db)
    initialized = state.completed_at is not None
    missing_admin = initialized and not bool(await db.scalar(select(exists().where(
        User.role == UserRole.ADMIN, User.is_active.is_(True),
    ))))
    owned_projects = select(ProjectMembership.project_id).where(ProjectMembership.project_role == ProjectRole.OWNER)
    unowned_projects = bool(await db.scalar(select(exists().where(
        Project.id.not_in(owned_projects),
    )))) if initialized else False
    return {
        "setup_required": not initialized,
        "registration_enabled": initialized and get_settings().allow_registration,
        "migration_required": bool(missing_admin or unowned_projects),
    }


@router.post("/", response_model=TokenResponse, status_code=201)
async def complete_setup(
    payload: SetupRequest, request: Request, db: AsyncSession = Depends(get_db),
) -> dict[str, Any]:
    await claim_setup(db, payload.setup_code.get_secret_value())
    user = User(
        username=payload.username, email=payload.email, full_name=payload.full_name,
        hashed_password=hash_password(payload.password), role=UserRole.ADMIN, is_active=True,
    )
    db.add(user)
    await db.flush()
    db.add(AuditLog(
        action=AuditAction.USER_CREATE, resource_type="user", resource_id=user.id,
        resource_name=user.username, user_id=user.id, user_email=user.email,
        ip_address=request.client.host if request.client else None,
        changes_json={"installation_setup": True, "role": "ADMIN"},
    ))
    await db.flush()
    settings = get_settings()
    token_data = {"sub": user.id, "email": user.email, "role": "ADMIN"}
    return {
        "access_token": create_access_token(token_data, secret_key=settings.jwt_secret_key),
        "refresh_token": create_refresh_token(token_data, secret_key=settings.jwt_secret_key),
        "token_type": "bearer", "expires_in": settings.jwt_access_token_expire_minutes * 60,
    }
