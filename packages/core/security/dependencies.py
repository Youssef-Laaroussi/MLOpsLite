"""FastAPI security dependencies for authentication and authorization.

Provides injectable dependencies for route protection:
- get_current_user: Extracts user from Bearer JWT or X-API-Key header
- require_role: Dependency factory enforcing minimum role level
- require_permission: Dependency factory enforcing specific permission
"""

import hashlib
import logging
from datetime import datetime, timezone
from typing import Any, Optional

from fastapi import Depends, Header, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from packages.core.models.user import User, UserRole, ApiKey
from packages.core.security.auth import decode_token
from packages.core.security.rbac import has_minimum_role, has_permission

logger = logging.getLogger(__name__)

# Optional bearer scheme — allows routes to be documented but not require auth
_bearer_scheme = HTTPBearer(auto_error=False)


async def get_current_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> User:
    """Extract and validate the current user from JWT bearer token or API key.

    Checks in order:
    1. Bearer JWT token in Authorization header
    2. X-API-Key header

    Raises HTTPException 401 if no valid credentials found.
    """
    from apps.api.config import get_settings

    settings = get_settings()
    secret_key = getattr(settings, "jwt_secret_key", "mlite-dev-secret-key-change-in-production")

    user: Optional[User] = None

    # 1. Try Bearer JWT
    if credentials and credentials.credentials:
        payload = decode_token(credentials.credentials, secret_key=secret_key)
        if payload and payload.get("type") == "access":
            user_id = payload.get("sub")
            if user_id:
                result = await db.execute(
                    select(User).where(User.id == user_id)
                )
                user = result.scalar_one_or_none()

    # 2. Try X-API-Key
    if user is None and x_api_key:
        key_hash = hashlib.sha256(x_api_key.encode()).hexdigest()
        result = await db.execute(
            select(ApiKey).where(
                ApiKey.key_hash == key_hash,
                ApiKey.is_revoked == False,  # noqa: E712
            )
        )
        api_key = result.scalar_one_or_none()
        if api_key:
            # Check expiration
            if api_key.expires_at and api_key.expires_at < datetime.now(timezone.utc):
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="API key has expired",
                )
            # Update last_used_at
            api_key.last_used_at = datetime.now(timezone.utc)
            await db.flush()

            # Load user
            user_result = await db.execute(
                select(User).where(User.id == api_key.user_id)
            )
            user = user_result.scalar_one_or_none()

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or missing authentication credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is deactivated",
        )

    # Attach user to request state for audit logging
    request.state.current_user = user
    return user


def require_role(minimum_role: UserRole):
    """Dependency factory: enforce minimum role level.

    Usage:
        @router.post("/...", dependencies=[Depends(require_role(UserRole.MAINTAINER))])
    """
    async def _check_role(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if not has_minimum_role(current_user.role, minimum_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Insufficient permissions. Required role: {minimum_role.value}, "
                    f"your role: {current_user.role.value}"
                ),
            )
        return current_user

    return _check_role


def require_permission(permission: str):
    """Dependency factory: enforce specific permission.

    Usage:
        @router.post("/...", dependencies=[Depends(require_permission("model:promote"))])
    """
    async def _check_permission(
        current_user: User = Depends(get_current_user),
    ) -> User:
        if not has_permission(current_user.role, permission):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    f"Missing permission: '{permission}'. "
                    f"Your role '{current_user.role.value}' does not have this capability."
                ),
            )
        return current_user

    return _check_permission


async def get_optional_user(
    request: Request,
    db: AsyncSession = Depends(get_db),
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(_bearer_scheme),
    x_api_key: Optional[str] = Header(None, alias="X-API-Key"),
) -> Optional[User]:
    """Like get_current_user but returns None instead of raising 401.

    Useful for endpoints that work differently for authenticated vs anonymous users.
    """
    try:
        return await get_current_user(request, db, credentials, x_api_key)
    except HTTPException:
        return None
