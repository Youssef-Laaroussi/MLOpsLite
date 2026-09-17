# Deployment Health Probes & Resource Monitoring

> Automated container health checks, crash recovery, and live resource utilization telemetry.

---

## Health Check Architecture

MLite implements a multi-tier health monitoring system for deployed model containers:

```
┌────────────────────────────────────────────────────────┐
│ Deployed Container (:8000)                             │
│   ├── GET /health ──> Model loaded + Uptime            │
│   ├── GET /live   ──> HTTP server responsiveness       │
│   └── GET /ready  ──> Ready to ingest prediction queue │
└────────────────────────────────────────────────────────┘
          ▲
          │ Periodic HTTP Polling (every 30s)
┌────────────────────────────────────────────────────────┐
│ MLite DeploymentSupervisor                             │
│   ├── Docker Engine: Checks container status & exit    │
│   ├── Docker Stats: Collects CPU %, Memory MB          │
│   └── Database: Persists metrics & flags FAILED state  │
└────────────────────────────────────────────────────────┘
```

---

## Container Probe Endpoints

### 1. `GET /health`

Comprehensive check verifying both web server responsiveness and that the model weights are loaded in memory.

**Healthy Response (`200 OK`):**
```json
{
  "status": "healthy",
  "model_loaded": true,
  "uptime_seconds": 1420
}
```

**Unhealthy Response (`503 Service Unavailable`):**
```json
{
  "detail": {
    "status": "unhealthy",
    "model_loaded": false,
    "uptime_seconds": 3,
    "error": "Model artifact failed to load"
  }
}
```

### 2. `GET /live`

Kubernetes-style liveness probe. Fast verification that the Uvicorn event loop is unblocked.

```json
{"status": "alive"}
```

### 3. `GET /ready`

Kubernetes-style readiness probe. Confirms that inference pipeline initialization is complete and predictions can be served.

```json
{"status": "ready", "model_loaded": true}
```

---

## Supervisor Polling & Crash Detection

The `DeploymentSupervisor` continuously monitors active containers:

1. **Crash Detection**: If a container exits (e.g. SIGKILL, uncaught exception, or segfault), the supervisor detects the non-zero exit code immediately.
2. **Auto-Status Transition**: The deployment record status in PostgreSQL transitions from `RUNNING` to `FAILED`.
3. **Error Logging**: The container exit code and Docker daemon error message are saved in `deployments.error_message`.
4. **Port Reclaim**: If the container dies permanently, the allocated host port is scheduled for reclamation.

---

## Live Monitoring via CLI

To inspect real-time resource utilization:

```bash
mlite deployment status <deployment-id>
```

Example terminal output:
```
╭──────────────── Deployment Health & Status [d92a18f4] ────────────────╮
│ Model: fraud-detector v1                                              │
│ Container Status: RUNNING                                             │
│ Health Probe: ● HEALTHY                                               │
│ Endpoint: http://localhost:8100                                       │
│                                                                       │
│ Resource Utilization:                                                 │
│   • CPU Usage: 4.2%                                                   │
│   • Memory Usage: 312.4 MB / 1024.0 MB                                │
│   • p50 Latency: 3.1 ms                                               │
╰───────────────────────────────────────────────────────────────────────╯
```

---

## Troubleshooting Guide

### 1. Exit Code 137 (OOMKilled)
- **Cause**: Model prediction or batch size caused memory consumption to exceed the container's 1GB limit.
- **Remedy**:
  - Decrease prediction batch size (e.g. max 256 rows per request).
  - Increase deployment memory limit in config:
    ```bash
    mlite deploy fraud-detector --version 1 --config '{"memory_limit": "2g"}'
    ```

### 2. 503 Service Unavailable on `/health`
- **Cause**: Model artifact file corrupted, missing dependencies in base image, or incompatible pickle version.
- **Remedy**:
  - Check container logs: `docker logs <container_id>`.
  - Re-register model version with self-contained conda / pip requirements in MLflow.

### 3. Port Conflict on Startup
- **Cause**: Port already occupied by another host process outside MLite.
- **Remedy**:
  - Let MLite auto-select a port from the pool: `mlite deploy fraud-detector --version 1` (omit `--port`).
