# Model Rollback Architecture

> **Module:** `packages/rollback/coordinator.py`  
> **CLI:** `mlite rollback <model-name> [--to <version>] [--reason <text>]`  
> **API:** `POST /api/v1/deployments/{id}/rollback`, `POST /api/v1/models/{name}/rollback`

## Overview

The Rollback Engine provides **instant, zero-downtime traffic cutover** to a previously verified stable model version. When a newly deployed model exhibits erratic behavior, latency spikes, or runtime exceptions, operators can immediately revert to the last known good version.

## Architecture

```
┌──────────────────────────────────────────────────────┐
│                  Rollback Coordinator                │
├──────────────────────────────────────────────────────┤
│  1. Validate: Find active deployment + target version│
│  2. Start:    Launch target container (if stopped)   │
│  3. Health:   Probe /health endpoint (5s timeout)    │
│  4. Cutover:  Atomic port reassignment               │
│  5. Registry: target → PRODUCTION, faulty → ARCHIVED │
│  6. Drain:    Stop faulty container after drain      │
│  7. Audit:    Write permanent RollbackRecord         │
└──────────────────────────────────────────────────────┘
```

## Safety Checks

### Atomic Rollback
The rollback operation is **atomic**: if the target model container fails health checks at step 3, the cutover is **aborted** and current traffic remains completely untouched. The operator receives an `ABORTED` status with the failure reason.

### Health Probing
Before redirecting traffic, the coordinator sends an HTTP GET to the target container's `/health` endpoint:
- **Timeout:** 5 seconds
- **Pass condition:** HTTP 200
- **Simulated containers:** Always pass (for offline/testing environments)

### Registry Consistency
After a successful rollback:
- **Target version** → `PRODUCTION`
- **Faulty version** → `ARCHIVED`
- Only one version can be `PRODUCTION` at any time

## CLI Usage

### Basic Rollback (to previous version)
```bash
mlite rollback fraud-detector --reason "High error rate in production"
```

### Rollback to Specific Version
```bash
mlite rollback fraud-detector --to 15 --reason "Reverting to stable v15"
```

### Expected Output
```
╭─ 🔄 Model Rollback ──────────────────────╮
│ ✅ Rollback completed successfully!       │
│                                           │
│   Model: fraud-detector                   │
│   From version: v17                       │
│   To version:   v15                       │
│   Reason: Reverting to stable v15         │
│   Rollback ID: a1b2c3d4-...              │
╰───────────────────────────────────────────╯
```

## API Endpoints

### Rollback by Deployment ID
```http
POST /api/v1/deployments/{deployment_id}/rollback
Content-Type: application/json

{
    "target_version": 15,
    "reason": "High error rate detected"
}
```

### Rollback by Model Name
```http
POST /api/v1/models/{model_name}/rollback
Content-Type: application/json

{
    "target_version": null,
    "reason": "Automatic revert to previous version"
}
```

### Query Rollback History
```http
GET /api/v1/rollbacks?model_name=fraud-detector&limit=10
```

### Get Specific Rollback
```http
GET /api/v1/rollbacks/{rollback_id}
```

## Audit Log

Every rollback operation creates a permanent `RollbackRecord` containing:

| Field | Description |
|-------|-------------|
| `id` | Unique rollback UUID |
| `model_name` | Model being rolled back |
| `from_version` | Version that was active before |
| `to_version` | Target version rolled back to |
| `reason` | Operator or system reason |
| `trigger` | `MANUAL`, `AUTOMATIC`, `CLI`, `API` |
| `status` | `COMPLETED`, `FAILED`, `ABORTED`, `PENDING_APPROVAL` |
| `initiated_by` | User or system entity |
| `completed_at` | Completion timestamp |
| `details_json` | Health check results, deployment IDs |

## Emergency Manual Rollback Runbook

### Scenario: Model container is crashing and automated rollback is not configured

1. **Identify the faulty deployment:**
   ```bash
   mlite deployment list
   ```

2. **Execute immediate rollback:**
   ```bash
   mlite rollback <model-name> --to <stable-version> --reason "Emergency: container crash loop"
   ```

3. **Verify the rollback succeeded:**
   ```bash
   mlite deployment list
   ```

4. **Check the audit log:**
   ```bash
   # Via API
   curl http://localhost:8000/api/v1/rollbacks?model_name=<model-name>
   ```

5. **If rollback fails (ABORTED):**
   - Check the target version's health endpoint manually
   - Verify the target version exists in the model registry
   - Try a different target version
   - As a last resort, stop the faulty deployment and redeploy manually

### Scenario: Docker daemon is unresponsive

1. **Stop the faulty container directly:**
   ```bash
   docker stop <container-id>
   docker rm <container-id>
   ```

2. **Start the stable version manually:**
   ```bash
   docker run -d --name mlite-<model>-v<version>-<port> \
     -p <port>:8000 \
     -e MODEL_NAME=<model> \
     -e MODEL_VERSION=<version> \
     mlite/serving:latest
   ```

3. **Update the database** (via API or direct SQL) to reflect the new active deployment.

## Dependencies

- **Model Registry** (Issue #10): Required for version lookup and stage management
- **Docker Deployment** (Issue #11): Container lifecycle operations
- **Health Checks** (Issue #13): Probing target container health before cutover
