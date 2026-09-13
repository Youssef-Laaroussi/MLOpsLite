# #27 — Add immutable audit logs for compliance and operational tracking

> **Milestone:** M6 — Security  
> **Priority:** `P2`  
> **Labels:** `security` `P2`  

---

## Problem
In enterprise or regulated settings (finance, healthcare), organizations must know who performed critical actions: who promoted model v16 to production? Who triggered an emergency rollback? Who updated alert thresholds? Without an audit log, accountability is impossible to verify.

## Objective
Implement an immutable audit logging subsystem in `packages/core/audit.py` that automatically records all state-altering events, capturing user ID, IP address, timestamp, resource target, and before/after diffs.

## Proposed solution
Create an `AuditLog` table in PostgreSQL with append-only access (no update/delete permissions). Build an audit middleware or SQLAlchemy event hook intercepting state changes on Projects, Models, Deployments, and Alerts. Expose an audit log viewer in the API (`GET /api/v1/audit/logs`) and React Dashboard.

## Technical requirements
- Database table `audit_logs`: `id`, `user_id`, `user_email`, `ip_address`, `action` (e.g. `MODEL_PROMOTE`, `DEPLOYMENT_CREATE`, `DEPLOYMENT_ROLLBACK`), `resource_type`, `resource_id`, `changes_json`, `timestamp`.
- Append-only database design: API rejects any modification or deletion of audit records.
- API endpoints: `GET /api/v1/audit/logs` with filters by user, action, resource, and time range.
- CLI command: `mlite audit list --resource <type> --limit 50`.

## Acceptance criteria
- Every model promotion, deployment, and rollback operation automatically creates a corresponding audit log record.
- Audit records accurately record the acting user's ID, client IP, and the exact metadata diff.
- Audit logs cannot be updated or deleted via API.
- Audit log queries support high-performance filtering by date and resource.

## Tests
- Integration test verifying that creating a deployment and promoting a model writes valid audit entries.
- Test asserting that audit log endpoints require `ADMIN` or `MAINTAINER` role.

## Documentation
- Write `docs/security/audit_logging.md` describing audited event types, retention guidelines, and query API.
- Include sample JSON audit log entries.

## Dependencies
Issue #3 (PostgreSQL), Issue #25 (Authentication), Issue #26 (RBAC).
