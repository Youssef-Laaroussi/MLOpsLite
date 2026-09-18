# Auto-Rollback Policies

> **Module:** `packages/rollback/policies.py`  
> **CLI:** `mlite rollback-policy [list|create|enable|disable|delete|evaluate]`  
> **API:** `/api/v1/rollback-policies`

## Overview

Auto-rollback policies provide **policy-driven, automated rollback** that detects catastrophic model failure and restores the last known good version **without human intervention** (unless approval is required).

Auto-rollback is **disabled by default** for safety. When enabled, a background evaluator periodically inspects active deployments against configurable rules.

## Configuration

### Supported Metrics

| Metric | Description | Violation Condition |
|--------|-------------|---------------------|
| `error_rate` | Ratio of error responses to total requests | `value > threshold` |
| `latency_p95` | 95th percentile response latency (ms) | `value > threshold` |
| `accuracy` | Model prediction accuracy | `value < threshold` |
| `drift_share` | Proportion of drifted features (0.0–1.0) | `value > threshold` |

### Policy Parameters

| Parameter | Default | Description |
|-----------|---------|-------------|
| `enabled` | `false` | Must be explicitly enabled |
| `require_approval` | `false` | If true, creates `PENDING_APPROVAL` record instead of executing |
| `metric` | `error_rate` | Which metric to evaluate |
| `threshold` | `0.05` | Breach threshold |
| `evaluation_window_seconds` | `300` | Sliding window for metric aggregation |
| `consecutive_violations` | `3` | Windows that must breach before triggering |
| `cooldown_hours` | `24` | Rate limit between auto-rollbacks |

## Safety Features

### 1. Disabled by Default
Auto-rollback is opt-in. Teams must explicitly enable it per model.

### 2. Oscillation Guard
Rate-limited to **1 auto-rollback per deployment per 24 hours** (configurable). This prevents ping-ponging between two unstable versions.

### 3. Consecutive Violation Threshold
A single spike won't trigger rollback. The violation must persist across multiple consecutive evaluation windows (default: 3).

### 4. Approval Workflow
When `require_approval: true`:
- Auto-rollback enters `PENDING_APPROVAL` status
- Operators are notified via the alert system
- Traffic continues to the current version until approved
- Manual approval can be granted via API or CLI

### 5. Automatic Counter Reset
If a healthy evaluation window is observed, the violation counter resets to zero.

## CLI Usage

### Create a Policy
```bash
mlite rollback-policy create fraud-detector \
  --metric error_rate \
  --threshold 0.05 \
  --window 300 \
  --violations 3 \
  --enabled
```

### List Policies
```bash
mlite rollback-policy list
mlite rollback-policy list --model fraud-detector --enabled
```

### Enable/Disable
```bash
mlite rollback-policy enable <policy-id>
mlite rollback-policy disable <policy-id>
```

### Manual Evaluation Trigger
```bash
mlite rollback-policy evaluate
```

### Delete a Policy
```bash
mlite rollback-policy delete <policy-id>
```

## API Endpoints

### Create Policy
```http
POST /api/v1/rollback-policies
Content-Type: application/json

{
    "model_name": "fraud-detector",
    "enabled": true,
    "require_approval": false,
    "metric": "error_rate",
    "threshold": 0.05,
    "evaluation_window_seconds": 300,
    "consecutive_violations": 3,
    "cooldown_hours": 24
}
```

### List Policies
```http
GET /api/v1/rollback-policies?model_name=fraud-detector&enabled_only=true
```

### Update Policy
```http
PATCH /api/v1/rollback-policies/{policy_id}
```

### Delete Policy
```http
DELETE /api/v1/rollback-policies/{policy_id}
```

### Trigger Evaluation
```http
POST /api/v1/rollback-policies/evaluate
```

## Evaluation Flow

```
                    ┌─────────────┐
                    │ Enabled     │
                    │ Policies    │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Cooldown    │──── In cooldown? → SKIP
                    │ Check       │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Compute     │──── Insufficient data? → SKIP
                    │ Metric      │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Threshold   │──── Below threshold? → OK (reset counter)
                    │ Check       │
                    └──────┬──────┘
                           │ Violation!
                    ┌──────▼──────┐
                    │ Increment   │──── Below consecutive limit? → VIOLATION
                    │ Counter     │
                    └──────┬──────┘
                           │ Limit reached!
                    ┌──────▼──────┐
                    │ Approval    │──── Required? → PENDING_APPROVAL
                    │ Check       │
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │ Execute     │
                    │ Rollback    │
                    └─────────────┘
```

## Edge Cases: Flapping Services

### What is flapping?
A service that oscillates between healthy and unhealthy states, potentially causing rollback loops.

### Prevention
1. **Consecutive violations**: Requires sustained failure, not single spikes
2. **Cooldown period**: Prevents more than one auto-rollback per 24 hours
3. **Counter reset**: A single healthy window resets the violation counter
4. **Approval mode**: For high-risk models, require human validation

### Recommended Settings for Flap-Prone Services
```yaml
rollback:
  enabled: true
  require_approval: true
  metric: error_rate
  threshold: 0.10         # Higher threshold to avoid false positives
  evaluation_window: 600  # Longer window (10 min) for more stable signal
  consecutive: 5          # More windows before triggering
  cooldown_hours: 48      # Longer cooldown to prevent oscillation
```

## Dependencies

- **Alert System** (Issue #21): Notification dispatch on auto-rollback events
- **Model Rollback** (Issue #23): Core rollback execution engine
