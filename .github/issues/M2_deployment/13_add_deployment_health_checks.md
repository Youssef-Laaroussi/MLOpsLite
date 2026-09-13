# #13 — Add deployment health checks, probes, and resource metrics

> **Milestone:** M2 — Deployment  
> **Priority:** `P1`  
> **Labels:** `deployment` `P1`  

---

## Problem
Once a model container is launched, its availability, memory consumption, and error rates are unknown unless actively monitored. A crashed model container or deadlocked worker thread leads to silent production downtime.

## Objective
Implement automated health probes (liveness, readiness), periodic status polling, and container resource metrics (CPU %, Memory MB, request count, error rate) in the MLite deployment supervisor.

## Proposed solution
Implement `GET /health` inside the model serving container checking model loaded state. Add a background health polling routine in `apps/api` (or worker) that regularly probes active deployments, queries Docker stats for CPU/memory consumption, and flags degraded or dead instances.

## Technical requirements
- Serving container endpoint: `GET /health` returning `{status: 'healthy', model_loaded: true, uptime_seconds: int}`.
- Serving container endpoint: `GET /live` and `GET /ready` for Kubernetes compatibility.
- Supervisor poller: runs every 30 seconds, performs HTTP GET to deployment health endpoint, inspects Docker container state.
- Container metrics collection via Docker API: CPU percentage, Memory usage vs limit, network I/O bytes.
- Database table `deployment_metrics`: records historical health status, latency percentiles, and resource utilization.

## Acceptance criteria
- Deployment health endpoint returns 200 OK within 50ms when healthy, and 503 Service Unavailable if the model fails to load.
- If a container stops unexpectedly, MLite API marks its status as `FAILED` within 30 seconds and logs the exit code.
- `mlite deployment status <id>` displays live CPU, memory, and uptime metrics in the terminal.

## Tests
- Integration test simulating a container crash and asserting status transition to `FAILED`.
- Unit test for the health supervisor background routine and metrics parser.

## Documentation
- Create `docs/deployment/health_and_monitoring.md` documenting probe endpoints and supervisor configuration.
- Add troubleshooting tips for failed or out-of-memory container deployments.

## Dependencies
Issue #11 (Docker model deployment), Issue #12 (Prediction endpoint).
