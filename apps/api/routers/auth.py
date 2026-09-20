"""Authentication and user management REST endpoints (Issues #25, #26).

Provides:
- /api/v1/auth/login — OAuth2 password flow login
- /api/v1/auth/refresh — Refresh access token
- /api/v1/auth/me — Current user profile
- /api/v1/auth/api-keys — API key management
- /api/v1/users — User CRUD (admin only)
"""

import hashlib
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError, ConflictError
from packages.core.models.user import User, UserRole, ApiKey
from packages.core.models.audit import AuditAction
from packages.core.security.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES,
)
from packages.core.security.rbac import get_permissions, Permission
from packages.core.security.dependencies import (
    get_current_user,
    require_role,
    require_permission,
)
from packages.core.schemas.security import (
    LoginRequest,
    TokenResponse,
    RefreshRequest,
    UserCreate,
    UserUpdate,
    UserResponse,
    UserListResponse,
    UserMeResponse,
    ApiKeyCreate,
    ApiKeyResponse,
    ApiKeyListResponse,
)

router = APIRouter(prefix="/api/v1", tags=["Authentication & Users"])


# ── Auth Endpoints ──────────────────────────────────────────────


@router.post("/auth/login", response_model=TokenResponse)
async def login(
    payload: LoginRequest,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Authenticate with username/email and password, receive JWT tokens."""
    from packages.core.security.audit import AuditService

    # Find user by username or email
    result = await db.execute(
        select(User).where(
            (User.username == payload.username) | (User.email == payload.username)
        )
    )
    user = result.scalar_one_or_none()

    if user is None or not verify_password(payload.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
        )

    token_data = {"sub": user.id, "email": user.email, "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Audit log
    audit = AuditService(session=db)
    await audit.log(
        action=AuditAction.USER_LOGIN,
        resource_type="user",
        resource_id=user.id,
        resource_name=user.username,
        user_id=user.id,
        user_email=user.email,
        ip_address=request.client.host if request.client else None,
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/auth/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
async def register(
    payload: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Register a new user account and receive JWT tokens for immediate login."""
    from packages.core.security.audit import AuditService
    from sqlalchemy import func

    # Check for existing email or username
    existing = await db.execute(
        select(User).where(
            (User.email == payload.email) | (User.username == payload.username)
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictError("User with this email or username already exists")

    # If first user, make admin, otherwise keep role from payload (or DEVELOPER)
    count_res = await db.execute(select(func.count(User.id)))
    user_count = count_res.scalar() or 0
    assigned_role = UserRole.ADMIN if user_count == 0 else (payload.role or UserRole.DEVELOPER)

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=assigned_role,
        is_active=True,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    token_data = {"sub": user.id, "email": user.email, "role": user.role.value}
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(token_data)

    # Audit log
    audit = AuditService(session=db)
    await audit.log(
        action=AuditAction.USER_CREATE,
        resource_type="user",
        resource_id=user.id,
        resource_name=user.username,
        user_id=user.id,
        user_email=user.email,
        ip_address=request.client.host if request.client else None,
        details={"self_registered": True, "role": user.role.value},
    )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "expires_in": DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.post("/auth/refresh", response_model=TokenResponse)
async def refresh_token(
    payload: RefreshRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Exchange a valid refresh token for a new access token pair."""
    decoded = decode_token(payload.refresh_token)
    if decoded is None or decoded.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    user_id = decoded.get("sub")
    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()

    if user is None or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or deactivated",
        )

    token_data = {"sub": user.id, "email": user.email, "role": user.role.value}
    return {
        "access_token": create_access_token(token_data),
        "refresh_token": create_refresh_token(token_data),
        "token_type": "bearer",
        "expires_in": DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    }


@router.get("/auth/me", response_model=UserMeResponse)
async def get_me(
    current_user: User = Depends(get_current_user),
) -> Any:
    """Get the current authenticated user's profile and permissions."""
    perms = get_permissions(current_user.role)
    return {
        "id": current_user.id,
        "email": current_user.email,
        "username": current_user.username,
        "full_name": current_user.full_name,
        "role": current_user.role,
        "permissions": sorted(perms),
    }


# ── API Key Management ──────────────────────────────────────────


@router.post("/auth/api-keys", response_model=ApiKeyResponse, status_code=status.HTTP_201_CREATED)
async def create_api_key(
    payload: ApiKeyCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """Generate a new API key for the authenticated user."""
    from packages.core.security.audit import AuditService

    full_key, key_prefix, key_hash = ApiKey.generate_key()

    api_key = ApiKey(
        user_id=current_user.id,
        name=payload.name,
        key_prefix=key_prefix,
        key_hash=key_hash,
        scopes=payload.scopes,
        expires_at=payload.expires_at,
    )
    db.add(api_key)
    await db.flush()
    await db.refresh(api_key)

    # Audit log
    audit = AuditService(session=db)
    await audit.log(
        action=AuditAction.API_KEY_CREATE,
        resource_type="api_key",
        resource_id=api_key.id,
        resource_name=payload.name,
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else None,
    )

    return {
        "id": api_key.id,
        "name": api_key.name,
        "key_prefix": api_key.key_prefix,
        "key": full_key,  # Only returned once at creation!
        "scopes": api_key.scopes,
        "expires_at": api_key.expires_at,
        "is_revoked": api_key.is_revoked,
        "last_used_at": api_key.last_used_at,
        "created_at": api_key.created_at,
    }


@router.get("/auth/api-keys", response_model=ApiKeyListResponse)
async def list_api_keys(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> Any:
    """List all API keys for the authenticated user."""
    result = await db.execute(
        select(ApiKey)
        .where(ApiKey.user_id == current_user.id)
        .order_by(ApiKey.created_at.desc())
    )
    keys = list(result.scalars().all())
    # Never return full key in list view
    return {"api_keys": keys, "total": len(keys)}


@router.delete("/auth/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
async def revoke_api_key(
    key_id: str,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
) -> None:
    """Revoke an API key immediately."""
    from packages.core.security.audit import AuditService

    result = await db.execute(
        select(ApiKey).where(ApiKey.id == key_id, ApiKey.user_id == current_user.id)
    )
    api_key = result.scalar_one_or_none()
    if api_key is None:
        raise NotFoundError("ApiKey", key_id)

    api_key.is_revoked = True
    await db.flush()

    audit = AuditService(session=db)
    await audit.log(
        action=AuditAction.API_KEY_REVOKE,
        resource_type="api_key",
        resource_id=key_id,
        resource_name=api_key.name,
        user_id=current_user.id,
        user_email=current_user.email,
        ip_address=request.client.host if request.client else None,
    )


# ── User Management (Admin only) ───────────────────────────────


@router.post(
    "/users",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def create_user(
    payload: UserCreate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
) -> Any:
    """Create a new user account (admin only)."""
    from packages.core.security.audit import AuditService

    # Check for existing user
    existing = await db.execute(
        select(User).where(
            (User.email == payload.email) | (User.username == payload.username)
        )
    )
    if existing.scalar_one_or_none():
        raise ConflictError("User with this email or username already exists")

    user = User(
        email=payload.email,
        username=payload.username,
        hashed_password=hash_password(payload.password),
        full_name=payload.full_name,
        role=payload.role,
    )
    db.add(user)
    await db.flush()
    await db.refresh(user)

    audit = AuditService(session=db)
    await audit.log(
        action=AuditAction.USER_CREATE,
        resource_type="user",
        resource_id=user.id,
        resource_name=user.username,
        user_id=admin.id,
        user_email=admin.email,
        ip_address=request.client.host if request.client else None,
        changes={"role": payload.role.value, "email": payload.email},
    )

    return user


@router.get(
    "/users",
    response_model=UserListResponse,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def list_users(
    db: AsyncSession = Depends(get_db),
) -> Any:
    """List all user accounts (admin only)."""
    result = await db.execute(
        select(User).order_by(User.created_at.desc())
    )
    users = list(result.scalars().all())
    return {"users": users, "total": len(users)}


@router.patch(
    "/users/{user_id}",
    response_model=UserResponse,
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def update_user(
    user_id: str,
    payload: UserUpdate,
    request: Request,
    db: AsyncSession = Depends(get_db),
    admin: User = Depends(get_current_user),
) -> Any:
    """Update user details (admin only)."""
    from packages.core.security.audit import AuditService

    result = await db.execute(select(User).where(User.id == user_id))
    user = result.scalar_one_or_none()
    if user is None:
        raise NotFoundError("User", user_id)

    changes: dict[str, Any] = {}
    if payload.full_name is not None:
        changes["full_name"] = {"from": user.full_name, "to": payload.full_name}
        user.full_name = payload.full_name
    if payload.role is not None:
        changes["role"] = {"from": user.role.value, "to": payload.role.value}
        user.role = payload.role
    if payload.is_active is not None:
        changes["is_active"] = {"from": user.is_active, "to": payload.is_active}
        user.is_active = payload.is_active

    await db.flush()
    await db.refresh(user)

    if changes:
        audit = AuditService(session=db)
        await audit.log(
            action=AuditAction.USER_UPDATE,
            resource_type="user",
            resource_id=user_id,
            resource_name=user.username,
            user_id=admin.id,
            user_email=admin.email,
            ip_address=request.client.host if request.client else None,
            changes=changes,
        )

    return user
