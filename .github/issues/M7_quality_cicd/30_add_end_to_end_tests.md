# #30 — Add End-to-End (E2E) complete ML lifecycle automated tests

> **Milestone:** M7 — Quality & CI/CD  
> **Priority:** `P1`  
> **Labels:** `testing` `P1`  

---

## Problem
While individual units and components may pass tests, the complete end-to-end developer journey (Project Init → Data Version → Experiment → Model Register → Deploy → Predict → Drift → Rollback) must be verified continuously to ensure the platform delivers on its unified promise.

## Objective
Implement a fully automated End-to-End (E2E) workflow test in `tests/e2e/test_full_lifecycle.py` that executes the complete 11-step MLite user journey via the CLI and REST API.

## Proposed solution
Author an automated E2E test scenario: 1. `mlite init test-project` initializes workspace; 2. `mlite data add` registers training dataset; 3. `mlite experiment run` trains a Scikit-Learn model; 4. `mlite model promote` promotes to production; 5. `mlite deploy` spins up the REST endpoint; 6. Send inference requests to `/predict`; 7. Send shifted data to trigger high drift alert; 8. Deploy candidate v2 with poor performance; 9. Execute `mlite rollback` restoring v1; 10. Verify production endpoint returns v1 predictions.

## Technical requirements
- Autonomous E2E test script using Python `subprocess` / Typer `CliRunner` and `httpx`.
- Clean workspace creation in a temporary directory (`tmp_path`).
- Timeout protection for container deployment and teardown (max 120 seconds per run).
- Verification assertions at every lifecycle stage.

## Acceptance criteria
- Complete lifecycle test executes and succeeds from start to finish.
- Deployed container starts, serves predictions, responds to health probes, and terminates cleanly.
- Drift is detected and logged during the test run.
- Rollback successfully redirects traffic to the previous version with 200 OK responses.

## Tests
- Run `pytest tests/e2e/test_full_lifecycle.py` in an environment with Docker daemon access.
- Assert zero leftover orphan Docker containers after test completion.

## Documentation
- Create `docs/contributing/e2e_testing.md` detailing the full lifecycle test scenario and prerequisites.
- Add diagrams of the E2E verification loop.

## Dependencies
Issue #8 (CLI), Issue #9 (Tracking), Issue #10 (Registry), Issue #11 (Deployment), Issue #19 (Drift), Issue #23 (Rollback).
