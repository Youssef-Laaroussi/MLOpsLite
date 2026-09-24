"""Unit tests for Role-Based Access Control (RBAC) and permissions (Issue #26).

Tests:
- Role hierarchy levels (ADMIN > MAINTAINER > DEVELOPER > VIEWER)
- Permission inheritance across role hierarchy
- Permission checking via has_permission
- FastAPI dependency checks (require_role, require_permission)
"""

import pytest
from fastapi import HTTPException

from packages.core.models.user import User, UserRole
from packages.core.security.rbac import (
    has_minimum_role,
    has_permission,
    get_permissions,
    role_level,
    Permission,
    ROLE_HIERARCHY,
)
from packages.core.security.dependencies import require_role, require_permission


class TestRoleHierarchy:
    """Verify role ranking and inheritance levels."""

    def test_hierarchy_ordering(self):
        assert role_level(UserRole.ADMIN) > role_level(UserRole.MAINTAINER)
        assert role_level(UserRole.MAINTAINER) > role_level(UserRole.DEVELOPER)
        assert role_level(UserRole.DEVELOPER) > role_level(UserRole.VIEWER)

    def test_has_minimum_role_admin(self):
        assert has_minimum_role(UserRole.ADMIN, UserRole.ADMIN) is True
        assert has_minimum_role(UserRole.ADMIN, UserRole.MAINTAINER) is True
        assert has_minimum_role(UserRole.ADMIN, UserRole.DEVELOPER) is True
        assert has_minimum_role(UserRole.ADMIN, UserRole.VIEWER) is True

    def test_has_minimum_role_maintainer(self):
        assert has_minimum_role(UserRole.MAINTAINER, UserRole.ADMIN) is False
        assert has_minimum_role(UserRole.MAINTAINER, UserRole.MAINTAINER) is True
        assert has_minimum_role(UserRole.MAINTAINER, UserRole.DEVELOPER) is True
        assert has_minimum_role(UserRole.MAINTAINER, UserRole.VIEWER) is True

    def test_has_minimum_role_developer(self):
        assert has_minimum_role(UserRole.DEVELOPER, UserRole.ADMIN) is False
        assert has_minimum_role(UserRole.DEVELOPER, UserRole.MAINTAINER) is False
        assert has_minimum_role(UserRole.DEVELOPER, UserRole.DEVELOPER) is True
        assert has_minimum_role(UserRole.DEVELOPER, UserRole.VIEWER) is True

    def test_has_minimum_role_viewer(self):
        assert has_minimum_role(UserRole.VIEWER, UserRole.ADMIN) is False
        assert has_minimum_role(UserRole.VIEWER, UserRole.MAINTAINER) is False
        assert has_minimum_role(UserRole.VIEWER, UserRole.DEVELOPER) is False
        assert has_minimum_role(UserRole.VIEWER, UserRole.VIEWER) is True


class TestPermissionMatrix:
    """Verify permissions assigned to each role with cumulative inheritance."""

    def test_viewer_permissions(self):
        viewer_perms = get_permissions(UserRole.VIEWER)
        # Viewer has view permissions
        assert Permission.PROJECT_VIEW in viewer_perms
        assert Permission.MODEL_VIEW in viewer_perms
        assert Permission.DEPLOYMENT_VIEW in viewer_perms
        assert Permission.DATASET_VIEW in viewer_perms
        assert Permission.MONITORING_VIEW in viewer_perms

        # Viewer does NOT have write / mutate permissions
        assert Permission.PROJECT_CREATE not in viewer_perms
        assert Permission.MODEL_PROMOTE not in viewer_perms
        assert Permission.DEPLOYMENT_CREATE not in viewer_perms
        assert Permission.DEPLOYMENT_ROLLBACK not in viewer_perms

    def test_developer_permissions(self):
        dev_perms = get_permissions(UserRole.DEVELOPER)
        # Inherits viewer
        assert Permission.MODEL_VIEW in dev_perms
        # Can create/run
        assert Permission.PROJECT_CREATE in dev_perms
        assert Permission.MODEL_REGISTER in dev_perms
        assert Permission.EXPERIMENT_RUN in dev_perms
        assert Permission.DATASET_CREATE in dev_perms
        # Cannot promote, deploy, rollback
        assert Permission.MODEL_PROMOTE not in dev_perms
        assert Permission.DEPLOYMENT_CREATE not in dev_perms
        assert Permission.DEPLOYMENT_ROLLBACK not in dev_perms
        assert Permission.USER_MANAGE not in dev_perms

    def test_maintainer_permissions(self):
        maint_perms = get_permissions(UserRole.MAINTAINER)
        # Inherits developer + viewer
        assert Permission.PROJECT_CREATE in maint_perms
        assert Permission.MODEL_REGISTER in maint_perms
        # Has operational control
        assert Permission.MODEL_PROMOTE in maint_perms
        assert Permission.DEPLOYMENT_CREATE in maint_perms
        assert Permission.DEPLOYMENT_STOP in maint_perms
        assert Permission.DEPLOYMENT_ROLLBACK in maint_perms
        assert Permission.AUDIT_VIEW in maint_perms
        # Does NOT have admin-only user management
        assert Permission.USER_MANAGE not in maint_perms
        assert Permission.API_KEY_MANAGE not in maint_perms

    def test_admin_permissions(self):
        admin_perms = get_permissions(UserRole.ADMIN)
        # Admin has all permissions
        assert Permission.USER_MANAGE in admin_perms
        assert Permission.API_KEY_MANAGE in admin_perms
        assert Permission.PROJECT_DELETE in admin_perms
        assert Permission.MODEL_PROMOTE in admin_perms
        assert Permission.DEPLOYMENT_ROLLBACK in admin_perms
        assert Permission.AUDIT_VIEW in admin_perms


class TestFastAPISecurityDependencies:
    """Verify require_role and require_permission dependency logic."""

    @pytest.mark.asyncio
    async def test_require_role_granted(self):
        user = User(
            id="u1", username="lead", email="lead@mlite.local",
            hashed_password="hash", role=UserRole.ADMIN,
        )
        checker = require_role(UserRole.MAINTAINER)
        result = await checker(current_user=user)
        assert result == user

    @pytest.mark.asyncio
    async def test_require_role_denied(self):
        user = User(
            id="u2", username="reader", email="reader@mlite.local",
            hashed_password="hash", role=UserRole.VIEWER,
        )
        checker = require_role(UserRole.MAINTAINER)
        with pytest.raises(HTTPException) as exc_info:
            await checker(current_user=user)
        assert exc_info.value.status_code == 403
        assert "Insufficient permissions" in exc_info.value.detail

    @pytest.mark.asyncio
    async def test_require_permission_granted(self):
        user = User(
            id="u3", username="maint", email="maint@mlite.local",
            hashed_password="hash", role=UserRole.MAINTAINER,
        )
        checker = require_permission(Permission.MODEL_PROMOTE)
        result = await checker(current_user=user)
        assert result == user

    @pytest.mark.asyncio
    async def test_require_permission_denied(self):
        user = User(
            id="u4", username="dev", email="dev@mlite.local",
            hashed_password="hash", role=UserRole.DEVELOPER,
        )
        checker = require_permission(Permission.MODEL_PROMOTE)
        with pytest.raises(HTTPException) as exc_info:
            await checker(current_user=user)
        assert exc_info.value.status_code == 403
        assert "Missing permission" in exc_info.value.detail
