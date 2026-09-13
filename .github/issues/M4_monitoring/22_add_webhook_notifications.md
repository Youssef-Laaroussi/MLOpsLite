# #22 — Add webhook, Slack, Discord, and Email notification dispatchers

> **Milestone:** M4 — Monitoring  
> **Priority:** `P1`  
> **Labels:** `alerting` `P1`  

---

## Problem
Alerts saved only to a database require active polling. Teams need external notifications delivered to their collaboration tools (Slack, Discord), custom microservices (HTTP Webhooks), or Email without relying on proprietary third-party SaaS.

## Objective
Implement pluggable notification dispatchers in `packages/alerting/dispatchers/` supporting HTTP Webhooks, Slack Incoming Webhooks, Discord Webhooks, and SMTP Email.

## Proposed solution
Design an extensible `NotificationDispatcher` interface. Implement `WebhookDispatcher` (signed HTTP POST with HMAC-SHA256 signature), `SlackDispatcher` (Block Kit formatted cards), `DiscordDispatcher` (Rich embed cards), and `EmailDispatcher` (HTML email templates). Dispatch notifications asynchronously via background task worker with automatic retry.

## Technical requirements
- Base dispatcher interface: `async def dispatch(self, alert: Alert) -> bool`.
- Slack webhook payload with color borders corresponding to alert severity and action buttons.
- Discord webhook payload with rich embeds and formatted fields.
- Generic Webhook with JSON payload and optional `X-MLite-Signature` header for payload verification.
- SMTP email sender supporting TLS / STARTTLS with fallback handling.
- Retry policy: exponential backoff up to 3 attempts on network failure.

## Acceptance criteria
- Triggering an alert successfully posts formatted message to configured Slack and Discord test channels.
- Generic webhook receives signed JSON payload with model metadata, drift scores, and timestamp.
- Failed delivery attempts are logged and retried up to 3 times without crashing the main application.
- Notification channels can be enabled/disabled dynamically via `mlite.yaml`.

## Tests
- Unit tests in `tests/unit/alerting/test_dispatchers.py` using mock HTTP responses and assertion of generated payloads.
- Integration test testing retry mechanism on transient HTTP 500 responses.

## Documentation
- Write `docs/alerting/notifications.md` covering Slack, Discord, Email, and Webhook setup with screenshots.
- Provide sample JSON payloads for external webhook consumer implementations.

## Dependencies
Issue #21 (Alert System).
