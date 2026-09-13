# #21 — Implement multi-channel alert engine and threshold evaluation

> **Milestone:** M4 — Monitoring  
> **Priority:** `P1`  
> **Labels:** `alerting` `P1`  

---

## Problem
When anomalies, severe data drift, or model accuracy degradation occur, operators must be alerted immediately. Without an alert engine, issues remain buried in logs until business metrics or downstream consumers break.

## Objective
Build the Alert Engine in `packages/alerting` and `apps/api/routers/alerts.py` to evaluate incoming monitoring events against configurable alert rules, manage alert states (OPEN, ACKNOWLEDGED, RESOLVED), and record alert history.

## Proposed solution
Create an alert dispatcher subscribing to monitoring event triggers (High Drift, High Error Rate, Latency Spike, Performance Drop, Container Failure). Evaluate severity (`INFO`, `WARNING`, `HIGH`, `CRITICAL`), deduplicate duplicate notifications within a cool-off window, and persist alerts to the database.

## Technical requirements
- Database model `Alert`: `id`, `project_id`, `model_name`, `deployment_id`, `event_type`, `severity`, `title`, `message`, `details_json`, `status`, `created_at`, `resolved_at`.
- Severity thresholds: INFO, WARNING, HIGH, CRITICAL.
- De-duplication and cooldown logic (e.g. suppress duplicate alerts for the same model within 1 hour).
- Endpoints: `GET /api/v1/alerts`, `POST /api/v1/alerts/{id}/acknowledge`, `POST /api/v1/alerts/{id}/resolve`.
- CLI command: `mlite alert list`, `mlite alert ack <id>`.

## Acceptance criteria
- A high data drift event automatically creates an alert with severity `HIGH` and detailed drift scores.
- Alerts are listed in the Web UI and CLI with color-coded severity badges.
- Cool-down window prevents alert fatigue by suppressing redundant notifications.
- Operators can acknowledge and resolve alerts via API and CLI.

## Tests
- Unit tests in `tests/unit/alerting/test_alert_engine.py` testing alert trigger conditions, deduplication, and state transitions.
- Integration test verifying alert persistence and query filtering.

## Documentation
- Write `docs/alerting/overview.md` describing alert rules, severities, and lifecycle states.
- Provide sample configuration for defining custom alert rules in `mlite.yaml`.

## Dependencies
Issue #13 (Health checks), Issue #19 (Drift detection), Issue #20 (Model monitoring).
