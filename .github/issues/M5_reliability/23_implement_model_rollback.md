# #23 — Implement controlled model rollback and instant traffic cutover

> **Milestone:** M5 — Reliability  
> **Priority:** `P1`  
> **Labels:** `rollback` `P1`  

---

## Problem
When a newly deployed model exhibits erratic behavior, severe latency spikes, or sudden runtime exceptions, teams need an immediate, dependable way to roll back to the previous stable model version. Currently, rolling back requires manual container teardown and re-deployment, which takes minutes and causes downtime.

## Objective
Build the Rollback Engine in `packages/rollback` and CLI command `mlite rollback <model> --to <version>` to perform an instantaneous, zero-downtime traffic cutover to a previously verified stable model container.

## Proposed solution
Implement a controlled rollback coordinator. When a rollback is requested: 1) Ensure the target previous stable model container is running and healthy (start it if stopped); 2) Atomically switch the production routing proxy / port mapping to the target container; 3) Update the Model Registry stage so the previous version is marked `PRODUCTION` and the faulty version is marked `ARCHIVED` or `FAILED`; 4) Gracefully stop the faulty container after active connections drain.

## Technical requirements
- Rollback coordinator in `packages/rollback/coordinator.py`.
- Atomic traffic redirection (proxy or port reassignment).
- State transitions: target model version updated to `PRODUCTION`, current faulty version updated to `ARCHIVED`.
- API endpoint: `POST /api/v1/deployments/{id}/rollback` with payload `{target_version: Optional[str], reason: str}`.
- CLI command: `mlite rollback <model-name> [--to <version>] [--reason <text>]`.

## Acceptance criteria
- Executing `mlite rollback fraud-detector --to 15` switches production traffic to v15 within 5 seconds.
- The rollback operation is atomic: if the target model container fails health checks, the cutover is aborted and current traffic remains untouched.
- A permanent audit log entry is written detailing the rollback timestamp, user, target version, and reason.
- `mlite deployment list` immediately reflects the rolled-back version as active.

## Tests
- Integration test `tests/integration/test_rollback.py` launching v1 and v2, executing rollback to v1, and asserting prediction endpoint output matches v1.
- Unit test verifying safety abort when target model fails health check.

## Documentation
- Write `docs/reliability/rollback.md` explaining rollback architecture, safety checks, and CLI commands.
- Include runbook for emergency manual rollback.

## Dependencies
Issue #10 (Model Registry), Issue #11 (Docker Deployment), Issue #13 (Health Checks).
