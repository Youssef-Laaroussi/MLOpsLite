# #24 — Add automated rollback policies and degradation triggers

> **Milestone:** M5 — Reliability  
> **Priority:** `P2`  
> **Labels:** `rollback` `P2`  

---

## Problem
Manual rollback relies on human intervention, which introduces latency during off-hours or critical incidents. Teams need an optional, policy-driven auto-rollback capability that can detect catastrophic model failure and restore the last known good version automatically without human intervention.

## Objective
Implement configurable auto-rollback policies in `packages/rollback/policies.py` evaluating live error rates, latency percentiles, severe drift, or accuracy drops, and executing automatic rollback when criteria are breached.

## Proposed solution
Define an automated evaluation daemon that inspects active deployments against rules defined in `mlite.yaml`. Support policy parameters: `enabled` (default false for safety), `require_approval`, `metric`, `minimum_threshold`, and `error_rate_threshold`. If violation conditions persist across consecutive observation windows, initiate auto-rollback.

## Technical requirements
- Configuration schema in `mlite.yaml`: `rollback: {enabled: bool, require_approval: bool, metric: str, minimum: float, max_error_rate: float, evaluation_window_seconds: int}`.
- Safety guards: auto-rollback is disabled by default; rate-limited to at most 1 auto-rollback per deployment per 24 hours to prevent oscillation loops.
- Background evaluator: evaluates sliding window metrics every 60 seconds.
- Notification integration: dispatches HIGH/CRITICAL alert immediately when an auto-rollback is triggered.

## Acceptance criteria
- When enabled in `mlite.yaml`, if error rate exceeds `max_error_rate` (e.g. 5%) over the evaluation window, auto-rollback triggers automatically.
- When `require_approval: true` is set, auto-rollback enters `PENDING_APPROVAL` status and notifies operators rather than cutting over automatically.
- Rollback oscillation guard prevents ping-ponging between two unstable versions.
- All auto-rollback actions are logged with full trigger metrics and timestamps.

## Tests
- Integration test simulating a sudden influx of HTTP 500 prediction errors and verifying that auto-rollback fires and restores the stable version.
- Unit test verifying oscillation loop prevention and threshold math.

## Documentation
- Write `docs/reliability/auto_rollback_policies.md` detailing policy configuration, safety best practices, and approval workflows.
- Document edge-case handling for flapping services.

## Dependencies
Issue #21 (Alert System), Issue #23 (Model Rollback).
