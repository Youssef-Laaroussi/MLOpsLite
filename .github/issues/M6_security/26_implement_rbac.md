# #26 — Implement Role-Based Access Control (RBAC) and permissions

> **Milestone:** M6 — Security  
> **Priority:** `P2`  
> **Labels:** `security` `P2`  

---

## Problem
In collaborative environments, different team members have distinct responsibilities. A developer or data scientist should be able to run experiments, but promoting models to production or initiating rollbacks should be restricted to Maintainers and Admins, while external stakeholders need read-only access.

## Objective
Implement a granular Role-Based Access Control (RBAC) framework in `packages/core/security/rbac.py` supporting roles (`Admin`, `Maintainer`, `Developer`, `Viewer`) with declarative route decorators.

## Proposed solution
Define explicit role hierarchies and permission sets according to Section 18 of the specification: `Admin` (full system control, user management, configuration); `Maintainer` (model promotion, deployment, rollback); `Developer` (create projects, run experiments, register models); `Viewer` (read-only inspection of dashboards and metrics). Enforce permissions using a FastAPI dependency decorator `@require_role(Role.MAINTAINER)`.

## Technical requirements
- Role Enum: `ADMIN`, `MAINTAINER`, `DEVELOPER`, `VIEWER` with hierarchical inheritance.
- Permission mapping dictionary defining allowed actions per role.
- FastAPI dependency: `require_permission(permission: str)` checking user's role against required capability.
- Default admin bootstrap: initialize default admin account on first boot from environment variables (`MLITE_ADMIN_USER`, `MLITE_ADMIN_PASSWORD`).

## Acceptance criteria
- Users with `VIEWER` role can view models and metrics, but receiving HTTP 403 Forbidden when attempting to deploy or promote.
- Only `MAINTAINER` and `ADMIN` can execute `POST /api/v1/models/{id}/promote` and `POST /deployments/{id}/rollback`.
- Attempting an unauthorized action returns HTTP 403 with descriptive error message indicating missing permission.
- Bootstrap admin account is created securely on first initialization.

## Tests
- Unit tests in `tests/unit/security/test_rbac.py` testing each role against all permission matrices.
- Integration tests verifying HTTP 403 responses across protected endpoints for developer and viewer tokens.

## Documentation
- Write `docs/security/rbac.md` documenting the permission matrix, role responsibilities, and how to assign roles.
- Add role administration guide for administrators.

## Dependencies
Issue #25 (Authentication).
