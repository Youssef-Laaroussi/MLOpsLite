"""Milestone 5: Reliability & Rollback (Issues #23 -> #24)"""

M5_ISSUES = [
    {
        "number": 23,
        "title": "Implement controlled model rollback and instant traffic cutover",
        "milestone": "M5 — Reliability",
        "milestone_code": "M5_reliability",
        "priority": "P1",
        "labels": ["rollback", "P1"],
        "filename": "23_implement_model_rollback.md",
        "problem": (
            "When a newly deployed model exhibits erratic behavior, severe latency spikes, or sudden runtime exceptions, "
            "teams need an immediate, dependable way to roll back to the previous stable model version. "
            "Currently, rolling back requires manual container teardown and re-deployment, which takes minutes and causes downtime."
        ),
        "objective": (
            "Build the Rollback Engine in `packages/rollback` and CLI command `mlite rollback <model> --to <version>` "
            "to perform an instantaneous, zero-downtime traffic cutover to a previously verified stable model container."
        ),
        "proposed_solution": (
            "Implement a controlled rollback coordinator. When a rollback is requested: "
            "1) Ensure the target previous stable model container is running and healthy (start it if stopped); "
            "2) Atomically switch the production routing proxy / port mapping to the target container; "
            "3) Update the Model Registry stage so the previous version is marked `PRODUCTION` and the faulty version is marked `ARCHIVED` or `FAILED`; "
            "4) Gracefully stop the faulty container after active connections drain."
        ),
        "technical_requirements": [
            "Rollback coordinator in `packages/rollback/coordinator.py`.",
            "Atomic traffic redirection (proxy or port reassignment).",
            "State transitions: target model version updated to `PRODUCTION`, current faulty version updated to `ARCHIVED`.",
            "API endpoint: `POST /api/v1/deployments/{id}/rollback` with payload `{target_version: Optional[str], reason: str}`.",
            "CLI command: `mlite rollback <model-name> [--to <version>] [--reason <text>]`."
        ],
        "acceptance_criteria": [
            "Executing `mlite rollback fraud-detector --to 15` switches production traffic to v15 within 5 seconds.",
            "The rollback operation is atomic: if the target model container fails health checks, the cutover is aborted and current traffic remains untouched.",
            "A permanent audit log entry is written detailing the rollback timestamp, user, target version, and reason.",
            "`mlite deployment list` immediately reflects the rolled-back version as active."
        ],
        "tests": [
            "Integration test `tests/integration/test_rollback.py` launching v1 and v2, executing rollback to v1, and asserting prediction endpoint output matches v1.",
            "Unit test verifying safety abort when target model fails health check."
        ],
        "documentation": [
            "Write `docs/reliability/rollback.md` explaining rollback architecture, safety checks, and CLI commands.",
            "Include runbook for emergency manual rollback."
        ],
        "dependencies": "Issue #10 (Model Registry), Issue #11 (Docker Deployment), Issue #13 (Health Checks)."
    },
    {
        "number": 24,
        "title": "Add automated rollback policies and degradation triggers",
        "milestone": "M5 — Reliability",
        "milestone_code": "M5_reliability",
        "priority": "P2",
        "labels": ["rollback", "P2"],
        "filename": "24_add_automatic_rollback_policies.md",
        "problem": (
            "Manual rollback relies on human intervention, which introduces latency during off-hours or critical incidents. "
            "Teams need an optional, policy-driven auto-rollback capability that can detect catastrophic model failure "
            "and restore the last known good version automatically without human intervention."
        ),
        "objective": (
            "Implement configurable auto-rollback policies in `packages/rollback/policies.py` evaluating live error rates, "
            "latency percentiles, severe drift, or accuracy drops, and executing automatic rollback when criteria are breached."
        ),
        "proposed_solution": (
            "Define an automated evaluation daemon that inspects active deployments against rules defined in `mlite.yaml`. "
            "Support policy parameters: `enabled` (default false for safety), `require_approval`, `metric`, `minimum_threshold`, "
            "and `error_rate_threshold`. If violation conditions persist across consecutive observation windows, initiate auto-rollback."
        ),
        "technical_requirements": [
            "Configuration schema in `mlite.yaml`: `rollback: {enabled: bool, require_approval: bool, metric: str, minimum: float, max_error_rate: float, evaluation_window_seconds: int}`.",
            "Safety guards: auto-rollback is disabled by default; rate-limited to at most 1 auto-rollback per deployment per 24 hours to prevent oscillation loops.",
            "Background evaluator: evaluates sliding window metrics every 60 seconds.",
            "Notification integration: dispatches HIGH/CRITICAL alert immediately when an auto-rollback is triggered."
        ],
        "acceptance_criteria": [
            "When enabled in `mlite.yaml`, if error rate exceeds `max_error_rate` (e.g. 5%) over the evaluation window, auto-rollback triggers automatically.",
            "When `require_approval: true` is set, auto-rollback enters `PENDING_APPROVAL` status and notifies operators rather than cutting over automatically.",
            "Rollback oscillation guard prevents ping-ponging between two unstable versions.",
            "All auto-rollback actions are logged with full trigger metrics and timestamps."
        ],
        "tests": [
            "Integration test simulating a sudden influx of HTTP 500 prediction errors and verifying that auto-rollback fires and restores the stable version.",
            "Unit test verifying oscillation loop prevention and threshold math."
        ],
        "documentation": [
            "Write `docs/reliability/auto_rollback_policies.md` detailing policy configuration, safety best practices, and approval workflows.",
            "Document edge-case handling for flapping services."
        ],
        "dependencies": "Issue #21 (Alert System), Issue #23 (Model Rollback)."
    }
]
