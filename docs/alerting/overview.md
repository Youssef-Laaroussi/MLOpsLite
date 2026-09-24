# Alert Engine & Incident Lifecycle

> Multi-channel alerting, cooldown deduplication, and operator incident workflows.

---

## Overview

The MLite Alert Engine aggregates anomaly events generated across the platform (severe data drift, container crashes, latency degradation) and dispatches actionable alerts while guarding against alert fatigue through configurable cooldown windows.

---

## Alert Severities & Lifecycle

### Severities

| Severity | Description | Notification Action |
|---|---|---|
| `INFO` | Routine operational events (e.g. model deployed) | Logged to database |
| `WARNING` | Moderate drift ($10\% - 25\%$) or minor latency blips | Slack/Discord notification |
| `HIGH` | Severe data drift ($> 25\%$) or accuracy degradation ($> 10\%$) | Slack, Discord, and Email alerts |
| `CRITICAL` | Container crashed or inference server unreachable | Immediate multi-channel broadcast with urgent priority |

### Lifecycle States

```
[ OPEN ] ──(Operator acknowledges)──> [ ACKNOWLEDGED ] ──(Issue remediated)──> [ RESOLVED ]
```

---

## Deduplication & Cooldown Window

To prevent floods of notifications when high-throughput inference traffic continuously encounters a shifted feature distribution:
- Identical alert triggers for the same `(event_type, model_name)` are suppressed if an un-resolved alert was created within the last **3,600 seconds (1 hour)**.
- Once marked as `RESOLVED`, new alerts can be raised immediately upon subsequent events.

---

## Configuration in `mlite.yaml`

```yaml
alerting:
  cooldown_seconds: 3600
  rules:
    data_drift:
      severity: HIGH
      threshold: 0.25
    accuracy_degradation:
      severity: HIGH
      threshold_pct: 10.0
    container_failure:
      severity: CRITICAL
```

---

## CLI Reference

```bash
# List all active alerts
mlite alert list

# Filter by severity
mlite alert list --severity HIGH

# Acknowledge an alert
mlite alert ack <alert-id>

# Mark alert as resolved
mlite alert resolve <alert-id>
```
