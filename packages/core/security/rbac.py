"""Role-Based Access Control (RBAC) framework (Issue #26).

Defines role hierarchy, permission matrix, and FastAPI dependency
decorators for enforcing access control on API routes.

Role Hierarchy (higher includes all lower permissions):
    ADMIN > MAINTAINER > DEVELOPER > VIEWER
"""

import logging
from enum import IntEnum
from typing import Any

from packages.core.models.user import UserRole

logger = logging.getLogger(__name__)


# ── Role Hierarchy ──────────────────────────────────────────────

ROLE_HIERARCHY: dict[UserRole, int] = {
    UserRole.VIEWER: 0,
    UserRole.DEVELOPER: 1,
    UserRole.USER: 1,
    UserRole.MAINTAINER: 2,
    UserRole.ADMIN: 3,
}


def role_level(role: UserRole) -> int:
    """Get the numeric hierarchy level for a role."""
    return ROLE_HIERARCHY.get(role, 0)


def has_minimum_role(user_role: UserRole, required_role: UserRole) -> bool:
    """Check if user_role meets or exceeds the required_role level."""
    return role_level(user_role) >= role_level(required_role)


# ── Permission Definitions ──────────────────────────────────────

class Permission:
    """Named permission constants."""

    # Projects
    PROJECT_VIEW = "project:view"
    PROJECT_CREATE = "project:create"
    PROJECT_UPDATE = "project:update"
    PROJECT_DELETE = "project:delete"

    # Models
    MODEL_VIEW = "model:view"
    MODEL_REGISTER = "model:register"
    MODEL_PROMOTE = "model:promote"
    MODEL_DELETE = "model:delete"

    # Deployments
    DEPLOYMENT_VIEW = "deployment:view"
    DEPLOYMENT_CREATE = "deployment:create"
    DEPLOYMENT_STOP = "deployment:stop"
    DEPLOYMENT_ROLLBACK = "deployment:rollback"

    # Datasets
    DATASET_VIEW = "dataset:view"
    DATASET_CREATE = "dataset:create"
    DATASET_DELETE = "dataset:delete"

    # Experiments
    EXPERIMENT_VIEW = "experiment:view"
    EXPERIMENT_RUN = "experiment:run"

    # Monitoring
    MONITORING_VIEW = "monitoring:view"
    MONITORING_CONFIGURE = "monitoring:configure"

    # Alerts
    ALERT_VIEW = "alert:view"
    ALERT_ACKNOWLEDGE = "alert:acknowledge"
    ALERT_CONFIGURE = "alert:configure"

    # Rollback policies
    ROLLBACK_POLICY_VIEW = "rollback_policy:view"
    ROLLBACK_POLICY_MANAGE = "rollback_policy:manage"

    # Users & Security
    USER_VIEW = "user:view"
    USER_MANAGE = "user:manage"
    API_KEY_MANAGE = "api_key:manage"

    # Audit
    AUDIT_VIEW = "audit:view"


# ── Permission Matrix ──────────────────────────────────────────

ROLE_PERMISSIONS: dict[UserRole, set[str]] = {
    UserRole.VIEWER: {
        Permission.PROJECT_VIEW,
        Permission.MODEL_VIEW,
        Permission.DEPLOYMENT_VIEW,
        Permission.DATASET_VIEW,
        Permission.EXPERIMENT_VIEW,
        Permission.MONITORING_VIEW,
        Permission.ALERT_VIEW,
        Permission.ROLLBACK_POLICY_VIEW,
    },
    UserRole.USER: {
        # Full operational lifecycle for all MLOps team members
        Permission.PROJECT_VIEW,
        Permission.PROJECT_CREATE,
        Permission.PROJECT_UPDATE,
        Permission.MODEL_VIEW,
        Permission.MODEL_REGISTER,
        Permission.MODEL_PROMOTE,
        Permission.MODEL_DELETE,
        Permission.DEPLOYMENT_VIEW,
        Permission.DEPLOYMENT_CREATE,
        Permission.DEPLOYMENT_STOP,
        Permission.DEPLOYMENT_ROLLBACK,
        Permission.DATASET_VIEW,
        Permission.DATASET_CREATE,
        Permission.DATASET_DELETE,
        Permission.EXPERIMENT_VIEW,
        Permission.EXPERIMENT_RUN,
        Permission.MONITORING_VIEW,
        Permission.MONITORING_CONFIGURE,
        Permission.ALERT_VIEW,
        Permission.ALERT_ACKNOWLEDGE,
        Permission.ALERT_CONFIGURE,
        Permission.ROLLBACK_POLICY_VIEW,
        Permission.ROLLBACK_POLICY_MANAGE,
    },
    UserRole.DEVELOPER: {
        # Inherits VIEWER permissions +
        Permission.PROJECT_CREATE,
        Permission.PROJECT_UPDATE,
        Permission.MODEL_REGISTER,
        Permission.DATASET_CREATE,
        Permission.EXPERIMENT_RUN,
        Permission.ALERT_ACKNOWLEDGE,
    },
    UserRole.MAINTAINER: {
        # Inherits DEVELOPER permissions +
        Permission.MODEL_PROMOTE,
        Permission.MODEL_DELETE,
        Permission.DEPLOYMENT_CREATE,
        Permission.DEPLOYMENT_STOP,
        Permission.DEPLOYMENT_ROLLBACK,
        Permission.DATASET_DELETE,
        Permission.MONITORING_CONFIGURE,
        Permission.ALERT_CONFIGURE,
        Permission.ROLLBACK_POLICY_MANAGE,
        Permission.AUDIT_VIEW,
    },
    UserRole.ADMIN: {
        # Inherits USER/MAINTAINER permissions + exclusive administrative control
        Permission.PROJECT_DELETE,
        Permission.USER_VIEW,
        Permission.USER_MANAGE,
        Permission.API_KEY_MANAGE,
        Permission.AUDIT_VIEW,
    },
}


def _build_effective_permissions() -> dict[UserRole, set[str]]:
    """Build cumulative permission sets respecting role hierarchy."""
    effective: dict[UserRole, set[str]] = {}
    sorted_roles = sorted(ROLE_HIERARCHY.keys(), key=lambda r: ROLE_HIERARCHY[r])

    accumulated: set[str] = set()
    for role in sorted_roles:
        accumulated = accumulated | ROLE_PERMISSIONS.get(role, set())
        effective[role] = accumulated.copy()

    return effective


EFFECTIVE_PERMISSIONS = _build_effective_permissions()


def has_permission(user_role: UserRole, permission: str) -> bool:
    """Check if a role has a specific permission."""
    return permission in EFFECTIVE_PERMISSIONS.get(user_role, set())


def get_permissions(role: UserRole) -> set[str]:
    """Get all effective permissions for a role."""
    return EFFECTIVE_PERMISSIONS.get(role, set())
