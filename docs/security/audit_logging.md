# 📜 Immutable Audit Logging & Governance

> **Component:** `packages/core/models/audit.py`, `packages/core/security/audit.py`, `apps/api/routers/audit.py`  
> **Milestone:** M6 — Security & Governance (Issue #27)  
> **Status:** Production-Ready

---

## Overview

In regulated enterprise environments (e.g. SOC2, HIPAA, ISO 27001, finance, and healthcare), complete traceability of model lifecycle operations is legally required. Organizations must answer:
- *Who promoted model v16 to Production, and when?*
- *Who triggered an emergency rollback at 03:00 AM?*
- *What configuration diff was applied to alert thresholds?*

MLite includes an **append-only, immutable audit logging subsystem** that records every state-altering action across the platform, capturing the acting user, source IP address, timestamp, target resource, and before/after metadata diff.

---

## Immutability Guarantees

1. **Append-Only Database Schema:** The `audit_logs` table only accepts `INSERT` queries.
2. **API Protection:** The REST API strictly rejects any `PUT`, `PATCH`, or `DELETE` request against `/api/v1/audit/logs/*`, responding with HTTP `405 Method Not Allowed`.
3. **RBAC Guard:** Querying audit logs is restricted to `MAINTAINER` and `ADMIN` roles (`Permission.AUDIT_VIEW`).

---

## Audited Event Types

| Category | Action Key | Trigger Scenario |
| :--- | :--- | :--- |
| **Model Registry** | `MODEL_REGISTER` | New model or version added to the registry |
| | `MODEL_PROMOTE` | Model version promoted to `STAGING`, `PRODUCTION`, or `ARCHIVED` |
| | `MODEL_DELETE` | Model version removed from registry |
| **Deployment** | `DEPLOYMENT_CREATE` | Container instance deployed with port allocation |
| | `DEPLOYMENT_STOP` | Running container stopped and decommissioned |
| | `DEPLOYMENT_ROLLBACK`| Production traffic rolled back to previous stable version |
| **Reliability** | `ROLLBACK_EXECUTE` | Rollback coordinator completes traffic cutover |
| | `AUTO_ROLLBACK_TRIGGER` | Degradation policy triggers automated recovery |
| | `ROLLBACK_POLICY_CREATE`| New automated rollback policy defined |
| **Alerting** | `ALERT_ACKNOWLEDGE` | On-call engineer acknowledges an active incident |
| | `ALERT_RESOLVE` | Incident marked as resolved |
| | `ALERT_CONFIG_UPDATE` | Notification channel or threshold modified |
| **Access & Governance**| `USER_LOGIN` | User successfully authenticates |
| | `USER_CREATE` | Administrator registers a new user |
| | `USER_UPDATE` | User role or active status updated |
| | `API_KEY_CREATE` | New programmatic API key issued |
| | `API_KEY_REVOKE` | API key invalidated |

---

## Audit Log Entry Schema

Each audit record contains:

```json
{
  "id": "e3057e62-c07a-4ecb-99f5-7dc94371465e",
  "user_id": "b2c174f8-4e89-4d62-a521-8f56fa68bdfa",
  "user_email": "lead@mlite.local",
  "ip_address": "192.168.1.100",
  "action": "MODEL_PROMOTE",
  "resource_type": "model",
  "resource_id": "f8a706da-c8bc-4b95-a0bc-4340d02b9e6f",
  "resource_name": "fraud-detector:v2",
  "changes_json": {
    "target_stage": "PRODUCTION",
    "version": 2
  },
  "timestamp": "2026-09-18T18:42:00.000000Z"
}
```

---

## API Query Endpoint

### `GET /api/v1/audit/logs`

Requires `MAINTAINER` or `ADMIN` role.

#### Query Parameters
- `action`: Filter by exact `AuditAction` (e.g. `MODEL_PROMOTE`)
- `resource_type`: Filter by resource type (e.g. `model`, `deployment`, `user`)
- `resource_id`: Filter by specific target resource UUID
- `user_id`: Filter by the acting user UUID
- `from_date`: ISO 8601 timestamp for starting window
- `to_date`: ISO 8601 timestamp for ending window
- `limit`: Maximum entries to retrieve (default: `50`, max: `500`)

#### Example Request
```bash
curl -H "Authorization: Bearer <token>" \
     "http://localhost:8000/api/v1/audit/logs?resource_type=deployment&limit=10"
```

---

## CLI Usage

Inspect audit logs directly from the terminal using the `mlite audit` command:

```bash
# View the latest 50 audit entries
mlite audit list

# Filter by resource type
mlite audit list --resource model

# Filter by specific action
mlite audit list --action DEPLOYMENT_ROLLBACK

# Filter by user ID with custom limit
mlite audit list --user b2c174f8-4e89-4d62-a521-8f56fa68bdfa --limit 20
```

Sample output:
```
                       MLite Operational & Compliance Audit Logs                        
┏━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━┳━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┓
┃ Timestamp           ┃ Action              ┃ Resource   ┃ Target Name       ┃ Actor            ┃ IP Address    ┃ Details                           ┃
┡━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━╇━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━┩
│ 2026-09-18 18:45:12 │ MODEL_PROMOTE       │ model      │ fraud-detector:v2 │ lead@mlite.local │ 192.168.1.100 │ {"target_stage": "PRODUCTION"...} │
│ 2026-09-18 18:44:30 │ DEPLOYMENT_CREATE   │ deployment │ fraud-detector:v2 │ lead@mlite.local │ 192.168.1.100 │ {"port": 8102, "model_name": ...} │
│ 2026-09-18 18:40:05 │ USER_LOGIN          │ user       │ lead              │ lead@mlite.local │ 192.168.1.100 │ —                                 │
└─────────────────────┴─────────────────────┴────────────┴───────────────────┴──────────────────┴───────────────┴───────────────────────────────────┘
```
