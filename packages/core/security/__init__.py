"""Core security package — authentication, authorization, and audit (Milestone M6)."""

from packages.core.models.user import User, UserRole, ApiKey
from packages.core.models.audit import AuditLog, AuditAction
from packages.core.security.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
)
from packages.core.security.rbac import (
    has_minimum_role,
    has_permission,
    get_permissions,
    Permission,
    ROLE_HIERARCHY,
    ROLE_PERMISSIONS,
)
from packages.core.security.audit import AuditService
from packages.core.security.dependencies import (
    get_current_user,
    get_optional_user,
    require_role,
    require_permission,
)

__all__ = [
    "User",
    "UserRole",
    "ApiKey",
    "AuditLog",
    "AuditAction",
    "hash_password",
    "verify_password",
    "create_access_token",
    "create_refresh_token",
    "decode_token",
    "has_minimum_role",
    "has_permission",
    "get_permissions",
    "Permission",
    "ROLE_HIERARCHY",
    "ROLE_PERMISSIONS",
    "AuditService",
    "get_current_user",
    "get_optional_user",
    "require_role",
    "require_permission",
]
