# Docker Model Serving & Deployment

> Orchestrating standardized, lightweight inference containers for MLite models.

---

## Overview

MLite packages and deploys registered machine learning models into dedicated Docker containers using a standardized runtime environment (`mlite/serving:latest`). This ensures:
- **Zero Kubernetes Overhead**: Instant single-host deployment on developer machines or single VM instances.
- **Port Isolation**: Dynamic port allocation avoids collisions (default range `8100–8200`).
- **Resource Constraints**: CPU and memory limits per container prevent out-of-memory cascading failures.
- **Standardized API Contract**: Uniform inference endpoints (`/predict`, `/metadata`, `/health`) across all models.

---

## Container Architecture

Each deployed model runs inside an isolated container with the following stack:

```
┌────────────────────────────────────────────────────────┐
│ Docker Container (mlite/serving:latest)                │
│                                                        │
│  FastAPI Inference Server (Port 8000)                  │
│    ├── POST /predict     (Input validation & scoring)  │
│    ├── GET  /metadata    (Feature schemas & version)   │
│    ├── GET  /health      (Readiness / Liveness probe)  │
│    └── Logger            (Async inference telemetry)   │
│                                                        │
│  Model Engine (Pickle, ONNX, MLflow PyFunc)            │
│  Base: Python 3.12-slim, libgomp1, Uvicorn             │
└────────────────────────────────────────────────────────┘
          ▲
          │ Port Mapping (e.g. Host 8101 -> Container 8000)
┌────────────────────────────────────────────────────────┐
│ MLite Host Daemon                                      │
│   ├── PortAllocator: Tracks 8100-8200 host ports       │
│   ├── DeploymentService: PostgreSQL DB tracking        │
│   └── DeploymentSupervisor: Periodic health & stats    │
└────────────────────────────────────────────────────────┘
```

---

## Dynamic Port Allocation

When a deployment is requested:
1. `PortAllocator` scans the designated port pool (`8100–8200`).
2. Checks socket availability on `0.0.0.0` and cross-references active database deployments.
3. Allocates the first available port and binds host traffic to container port 8000.
4. When the deployment is stopped (`mlite deployment stop <id>`), the port is released back to the pool.

---

## Resource Constraints

Containers are launched with enforced cgroup constraints:
- **Memory Limit**: Defaults to `1GB` (`--memory 1g`). Exceeding memory triggers an OOM event captured by the supervisor.
- **CPU Quota**: Defaults to 1 CPU core (`nano_cpus = 1_000_000_000`).
- **Restart Policy**: `on-failure:3` to auto-recover from transient hiccups.

---

## CLI Reference

### Deploy a Registered Model

```bash
# Auto-allocate port from range 8100-8200
mlite deploy fraud-detector --version 1

# Specify custom port
mlite deploy fraud-detector --version 1 --port 8150
```

Output:
```
✓ Deployment Successful!
ID: d92a18f4-6e21-4f12-a720-bc85b1a37c10
Model: fraud-detector v1
Status: RUNNING
Port: 8100
Endpoint: http://localhost:8100
```

### List Active Deployments

```bash
mlite deployment list
```

### Inspect Live Health & Resource Usage

```bash
mlite deployment status d92a18f4
```

### Stop and Clean Up Container

```bash
mlite deployment stop d92a18f4-6e21-4f12-a720-bc85b1a37c10
```
