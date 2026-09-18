# 🛡️ Role-Based Access Control (RBAC)

> **Component:** `packages/core/security/rbac.py`, `packages/core/security/dependencies.py`  
> **Milestone:** M6 — Security & Governance (Issue #26)  
> **Status:** Production-Ready

---

## Overview

MLite implements a hierarchical **Role-Based Access Control (RBAC)** architecture to govern access across multi-user environments. Team members are assigned one of four standard roles depending on their responsibilities:
- **`ADMIN`**: Full platform governance, user management, system configuration, and data deletion.
- **`MAINTAINER`**: Operational control: promoting models to production, launching containers, executing rollbacks, and managing alert thresholds.
- **`DEVELOPER`**: Core data science workflows: creating projects, running training experiments, uploading datasets, and registering candidate model versions.
- **`VIEWER`**: Read-only stakeholder access: viewing dashboards, inspecting performance metrics, and checking drift reports.

---

## Role Hierarchy

The roles follow a strict hierarchical inheritance model where higher roles inherit all permissions granted to lower roles:

```
┌────────────────────────────────────────────────────────┐
│                        ADMIN                           │
│  (User administration, system config, hard deletion)   │
└───────────────────────────┬────────────────────────────┘
                            │ inherits
┌───────────────────────────▼────────────────────────────┐
│                      MAINTAINER                        │
│  (Model promotion, deployments, rollbacks, alerts)     │
└───────────────────────────┬────────────────────────────┘
                            │ inherits
┌───────────────────────────▼────────────────────────────┐
│                      DEVELOPER                         │
│  (Projects, training runs, datasets, model register)   │
└───────────────────────────┬────────────────────────────┘
                            │ inherits
┌───────────────────────────▼────────────────────────────┐
│                        VIEWER                          │
│  (Read-only dashboards, metric evaluation, reports)    │
└────────────────────────────────────────────────────────┘
```

---

## Permission Matrix

| Capability | Permission Key | `VIEWER` | `DEVELOPER` | `MAINTAINER` | `ADMIN` |
| :--- | :--- | :---: | :---: | :---: | :---: |
| View Projects & Dashboards | `project:view` | ✅ | ✅ | ✅ | ✅ |
| Create / Edit Projects | `project:create`, `project:update` | ❌ | ✅ | ✅ | ✅ |
| Delete Projects | `project:delete` | ❌ | ❌ | ❌ | ✅ |
| View Models & Versions | `model:view` | ✅ | ✅ | ✅ | ✅ |
| Register Model Version | `model:register` | ❌ | ✅ | ✅ | ✅ |
| **Promote to Production** | `model:promote` | ❌ | ❌ | ✅ | ✅ |
| Delete Model | `model:delete` | ❌ | ❌ | ✅ | ✅ |
| View Deployments & Metrics | `deployment:view` | ✅ | ✅ | ✅ | ✅ |
| **Create Deployment** | `deployment:create` | ❌ | ❌ | ✅ | ✅ |
| Stop Deployment | `deployment:stop` | ❌ | ❌ | ✅ | ✅ |
| **Trigger Rollback** | `deployment:rollback` | ❌ | ❌ | ✅ | ✅ |
| View Datasets | `dataset:view` | ✅ | ✅ | ✅ | ✅ |
| Upload Dataset / Sync DVC | `dataset:create` | ❌ | ✅ | ✅ | ✅ |
| Delete Dataset | `dataset:delete` | ❌ | ❌ | ✅ | ✅ |
| Run Experiments & Training | `experiment:run` | ❌ | ✅ | ✅ | ✅ |
| Manage Alerts & Policies | `alert:configure`, `rollback_policy:manage` | ❌ | ❌ | ✅ | ✅ |
| **Inspect Audit Logs** | `audit:view` | ❌ | ❌ | ✅ | ✅ |
| **User Management** | `user:manage` | ❌ | ❌ | ❌ | ✅ |
| Platform API Key Control | `api_key:manage` | ❌ | ❌ | ❌ | ✅ |

---

## Route Protection & Declarative Dependency Injection

FastAPI endpoints enforce access control declaratively using reusable dependency factories from `packages.core.security.dependencies`:

### 1. Enforcing Specific Permissions
```python
from fastapi import APIRouter, Depends
from packages.core.security.dependencies import require_permission
from packages.core.security.rbac import Permission

router = APIRouter()

@router.post(
    "/deployments/{id}/rollback",
    dependencies=[Depends(require_permission(Permission.DEPLOYMENT_ROLLBACK))],
)
async def rollback(id: str):
    ...
```

### 2. Enforcing Minimum Role Level
```python
from packages.core.models.user import UserRole
from packages.core.security.dependencies import require_role

@router.get(
    "/admin/config",
    dependencies=[Depends(require_role(UserRole.ADMIN))],
)
async def get_system_config():
    ...
```

### 3. Error Responses
When an unauthorized user attempts an operation:
- **Missing Token / API Key:** HTTP `401 Unauthorized`
  ```json
  {"detail": "Invalid or missing authentication credentials"}
  ```
- **Insufficient Role / Missing Permission:** HTTP `403 Forbidden`
  ```json
  {"detail": "Missing permission: 'model:promote'. Your role 'DEVELOPER' does not have this capability."}
  ```

---

## Default Bootstrap Admin Account

On first boot, the application automatically ensures at least one `ADMIN` account exists. The credentials are configurable via environment variables:

```bash
# In .env or Docker Compose
MLITE_ADMIN_USER="admin"
MLITE_ADMIN_EMAIL="admin@mlite.local"
MLITE_ADMIN_PASSWORD="super-strong-admin-password"
```

During startup (`lifespan` hook), if no account matching `MLITE_ADMIN_USER` exists, MLite provisions the administrator account automatically with hashed credentials.

---

## User Administration via CLI

Administrators can manage accounts using the `mlite user` command group:

```bash
# List all registered users
mlite user list

# Create a new team member with MAINTAINER role
mlite user create engineer@mlite.local alex --role MAINTAINER --name "Alex Doe"

# Create a read-only viewer account
mlite user create auditor@company.com viewer_sam --role VIEWER --name "Sam Vance"
```
