"""Milestone 6: Security & Governance (Issues #25 -> #27)"""

M6_ISSUES = [
    {
        "number": 25,
        "title": "Add JWT authentication, user accounts, and API key management",
        "milestone": "M6 — Security",
        "milestone_code": "M6_security",
        "priority": "P2",
        "labels": ["security", "P2"],
        "filename": "25_add_authentication.md",
        "problem": (
            "During initial MVP development, endpoints may operate in trusted local networks without authentication. "
            "However, deploying MLite in shared company infrastructure or remote servers requires securing API endpoints, "
            "CLI operations, and the Web UI against unauthorized access."
        ),
        "objective": (
            "Implement a secure, self-hosted authentication system using OAuth2 password flow with JWT bearer tokens, "
            "argon2/bcrypt password hashing, and long-lived API keys for headless CLI and automated CI/CD pipelines."
        ),
        "proposed_solution": (
            "Create `User` and `ApiKey` database entities. Implement authentication endpoints under `/api/v1/auth`: "
            "`/login` (generates access and refresh tokens), `/refresh`, `/me`, and `/api-keys` (create/revoke scoped keys). "
            "Add FastAPI security dependencies enforcing authentication on protected routes."
        ),
        "technical_requirements": [
            "Password hashing using `passlib` with `bcrypt` or `argon2`.",
            "JWT token generation using `PyJWT` or `python-jose` with HS256/RS256 signing, configurable expiration (default 60 mins).",
            "Long-lived API Keys prefixed with `mlite_` stored as cryptographic SHA-256 hashes.",
            "FastAPI dependency `get_current_user` extracting credentials from Bearer token or `X-API-Key` header.",
            "CLI command `mlite login` saving session token to local credentials store `~/.mlite/credentials`."
        ],
        "acceptance_criteria": [
            "Protected API endpoints return HTTP 401 Unauthorized when requested without a valid token or API key.",
            "Logging in via `mlite login` validates credentials and enables subsequent CLI calls.",
            "API keys can be generated with expiration dates and revoked instantly.",
            "Passwords are never logged or stored in plain text."
        ],
        "tests": [
            "Unit tests in `tests/unit/security/test_auth.py` verifying password hashing, JWT generation, expiration validation, and invalid signatures.",
            "Integration tests verifying API key authentication and revocation."
        ],
        "documentation": [
            "Write `docs/security/authentication.md` explaining JWT token mechanics, API key generation, and CLI login.",
            "Provide instructions for setting `JWT_SECRET_KEY` in production."
        ],
        "dependencies": "Issue #3 (PostgreSQL), Issue #6 (FastAPI Core)."
    },
    {
        "number": 26,
        "title": "Implement Role-Based Access Control (RBAC) and permissions",
        "milestone": "M6 — Security",
        "milestone_code": "M6_security",
        "priority": "P2",
        "labels": ["security", "P2"],
        "filename": "26_implement_rbac.md",
        "problem": (
            "In collaborative environments, different team members have distinct responsibilities. "
            "A developer or data scientist should be able to run experiments, but promoting models to production or "
            "initiating rollbacks should be restricted to Maintainers and Admins, while external stakeholders need read-only access."
        ),
        "objective": (
            "Implement a granular Role-Based Access Control (RBAC) framework in `packages/core/security/rbac.py` supporting "
            "roles (`Admin`, `Maintainer`, `Developer`, `Viewer`) with declarative route decorators."
        ),
        "proposed_solution": (
            "Define explicit role hierarchies and permission sets according to Section 18 of the specification: "
            "`Admin` (full system control, user management, configuration); `Maintainer` (model promotion, deployment, rollback); "
            "`Developer` (create projects, run experiments, register models); `Viewer` (read-only inspection of dashboards and metrics). "
            "Enforce permissions using a FastAPI dependency decorator `@require_role(Role.MAINTAINER)`."
        ),
        "technical_requirements": [
            "Role Enum: `ADMIN`, `MAINTAINER`, `DEVELOPER`, `VIEWER` with hierarchical inheritance.",
            "Permission mapping dictionary defining allowed actions per role.",
            "FastAPI dependency: `require_permission(permission: str)` checking user's role against required capability.",
            "Default admin bootstrap: initialize default admin account on first boot from environment variables (`MLITE_ADMIN_USER`, `MLITE_ADMIN_PASSWORD`)."
        ],
        "acceptance_criteria": [
            "Users with `VIEWER` role can view models and metrics, but receiving HTTP 403 Forbidden when attempting to deploy or promote.",
            "Only `MAINTAINER` and `ADMIN` can execute `POST /api/v1/models/{id}/promote` and `POST /deployments/{id}/rollback`.",
            "Attempting an unauthorized action returns HTTP 403 with descriptive error message indicating missing permission.",
            "Bootstrap admin account is created securely on first initialization."
        ],
        "tests": [
            "Unit tests in `tests/unit/security/test_rbac.py` testing each role against all permission matrices.",
            "Integration tests verifying HTTP 403 responses across protected endpoints for developer and viewer tokens."
        ],
        "documentation": [
            "Write `docs/security/rbac.md` documenting the permission matrix, role responsibilities, and how to assign roles.",
            "Add role administration guide for administrators."
        ],
        "dependencies": "Issue #25 (Authentication)."
    },
    {
        "number": 27,
        "title": "Add immutable audit logs for compliance and operational tracking",
        "milestone": "M6 — Security",
        "milestone_code": "M6_security",
        "priority": "P2",
        "labels": ["security", "P2"],
        "filename": "27_add_audit_logs.md",
        "problem": (
            "In enterprise or regulated settings (finance, healthcare), organizations must know who performed critical actions: "
            "who promoted model v16 to production? Who triggered an emergency rollback? Who updated alert thresholds? "
            "Without an audit log, accountability is impossible to verify."
        ),
        "objective": (
            "Implement an immutable audit logging subsystem in `packages/core/audit.py` that automatically records all "
            "state-altering events, capturing user ID, IP address, timestamp, resource target, and before/after diffs."
        ),
        "proposed_solution": (
            "Create an `AuditLog` table in PostgreSQL with append-only access (no update/delete permissions). "
            "Build an audit middleware or SQLAlchemy event hook intercepting state changes on Projects, Models, "
            "Deployments, and Alerts. Expose an audit log viewer in the API (`GET /api/v1/audit/logs`) and React Dashboard."
        ),
        "technical_requirements": [
            "Database table `audit_logs`: `id`, `user_id`, `user_email`, `ip_address`, `action` (e.g. `MODEL_PROMOTE`, `DEPLOYMENT_CREATE`, `DEPLOYMENT_ROLLBACK`), `resource_type`, `resource_id`, `changes_json`, `timestamp`.",
            "Append-only database design: API rejects any modification or deletion of audit records.",
            "API endpoints: `GET /api/v1/audit/logs` with filters by user, action, resource, and time range.",
            "CLI command: `mlite audit list --resource <type> --limit 50`."
        ],
        "acceptance_criteria": [
            "Every model promotion, deployment, and rollback operation automatically creates a corresponding audit log record.",
            "Audit records accurately record the acting user's ID, client IP, and the exact metadata diff.",
            "Audit logs cannot be updated or deleted via API.",
            "Audit log queries support high-performance filtering by date and resource."
        ],
        "tests": [
            "Integration test verifying that creating a deployment and promoting a model writes valid audit entries.",
            "Test asserting that audit log endpoints require `ADMIN` or `MAINTAINER` role."
        ],
        "documentation": [
            "Write `docs/security/audit_logging.md` describing audited event types, retention guidelines, and query API.",
            "Include sample JSON audit log entries."
        ],
        "dependencies": "Issue #3 (PostgreSQL), Issue #25 (Authentication), Issue #26 (RBAC)."
    }
]
