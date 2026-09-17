# Webhook & Notification Dispatchers

> Delivering real-time alerts to Slack, Discord, Email, and custom webhooks with exponential retry.

---

## Overview

When the MLite Alert Engine detects an anomaly, `NotificationManager` fans out alerts to configured notification dispatchers. If an endpoint experiences a transient network outage, delivery is retried up to 3 times using exponential backoff.

---

## Supported Notification Channels

### 1. Slack Incoming Webhooks

Posts rich Block Kit cards with color-coded side borders corresponding to the severity level (`#0284c7` for INFO, `#f59e0b` for WARNING, `#ea580c` for HIGH, `#dc2626` for CRITICAL).

```yaml
# mlite.yaml
notifications:
  slack:
    enabled: true
    webhook_url: "https://hooks.slack.com/services/T00/B00/XXXX"
```

---

### 2. Discord Webhooks

Delivers embedded cards containing event details, model names, and direct links.

```yaml
# mlite.yaml
notifications:
  discord:
    enabled: true
    webhook_url: "https://discord.com/api/webhooks/12345/abcdef"
```

---

### 3. Generic Webhook (HMAC-SHA256 Signed)

Sends an HTTP POST containing structured JSON. If `secret_key` is provided, the request contains an `X-MLite-Signature` header calculated using HMAC-SHA256.

```yaml
# mlite.yaml
notifications:
  webhook:
    enabled: true
    url: "https://api.mycompany.com/ml-alerts"
    secret_key: "your-hmac-secret-token"
```

#### Sample Webhook JSON Payload

```json
{
  "id": "c7a8b9e1-2345-4a67-89ab-cdef01234567",
  "event_type": "DATA_DRIFT",
  "severity": "HIGH",
  "title": "High Data Drift Detected",
  "message": "33.3% of features exhibited significant distribution shift",
  "model_name": "fraud-detector",
  "deployment_id": "dep-8101",
  "details": {
    "drift_share": 0.333,
    "drifted_features": ["transaction_amount", "user_velocity"]
  },
  "created_at": "2026-09-17T20:30:00Z"
}
```

---

### 4. SMTP Email Notifications

Sends responsive HTML emails with TLS encryption.

```yaml
# mlite.yaml
notifications:
  email:
    enabled: true
    smtp_host: "smtp.sendgrid.net"
    smtp_port: 587
    smtp_user: "apikey"
    smtp_password: "SG.XXXX"
    from_email: "alerts@mlite.local"
    recipients:
      - "oncall-ml@mycompany.com"
```
