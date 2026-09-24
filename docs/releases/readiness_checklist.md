# MLite Production Readiness Checklist

This document provides a comprehensive **25-point operational readiness checklist** that engineering and MLOps teams must review before promoting an MLite deployment into mission-critical production environments.

---

## 1. Infrastructure & Architecture

- [ ] **1. High-Availability Database**: PostgreSQL 15+ configured with automated failover, read replicas, and regular WAL archiving.
- [ ] **2. Resilient Object Storage**: MinIO deployed in distributed mode (4+ nodes) or backed by enterprise S3 with versioning enabled.
- [ ] **3. Reverse Proxy & TLS**: Nginx, Traefik, or Cloudflare terminating TLS 1.3 with automated certificate renewal (Let's Encrypt / ACME).
- [ ] **4. Resource Boundaries**: Host machine configured with sufficient CPU cores (minimum 4 cores, 16GB RAM) and disk space alerts (>80% utilization warning).
- [ ] **5. Network Isolation**: Docker serving bridge network isolated from internal management networks; only port 80/443 exposed publicly.

---

## 2. Data & Model Registry Governance

- [ ] **6. Dataset Immutability**: All production datasets registered with SHA-256 checksums in the MLite data registry.
- [ ] **7. Model Artifact Signatures**: Registered models have explicit input/output feature schemas defined in metadata.
- [ ] **8. Staging Validation**: Every model candidate successfully tested in `staging` lifecycle stage before being promoted to `production`.
- [ ] **9. Artifact Backup**: MinIO bucket `mlite-models` backed up with cross-region replication or daily snapshot policies.
- [ ] **10. Reproducibility Guarantee**: Every production model links to an immutable MLflow Git commit SHA and parameter registry.

---

## 3. Serving & Container Orchestration

- [ ] **11. Hardened Base Containers**: Model serving images run under unprivileged user (`USER mlite`, UID 10001) with `no-new-privileges`.
- [ ] **12. Health Check Probes**: `/health` liveness and readiness probes enabled with 5s timeout and 3 failure threshold.
- [ ] **13. Container Resource Limits**: Every deployed container configured with explicit memory (`--memory=2g`) and CPU limits (`--cpus=1.5`).
- [ ] **14. Dynamic Port Management**: Docker host ports verified for zero port collision before container boot.
- [ ] **15. Graceful Termination**: Serving containers handle `SIGTERM` signals with 15s draining window for in-flight requests.

---

## 4. Monitoring, Drift & Alerting

- [ ] **16. Baseline Distributions**: Reference feature distributions registered for all production inference pipelines.
- [ ] **17. Continuous Drift Scheduling**: Kolmogorov-Smirnov drift tests scheduled at appropriate intervals (hourly or daily).
- [ ] **18. Delayed Feedback Ingestion**: `/api/v1/deployments/{id}/feedback` connected to upstream ground-truth data pipeline.
- [ ] **19. Multi-Channel Alerting**: Webhook or Slack notifications configured for `HIGH` and `CRITICAL` severity alerts.
- [ ] **20. Metric Retention Policy**: Performance telemetry pruned or partitioned older than 90 days to conserve database space.

---

## 5. Reliability & Disaster Recovery

- [ ] **21. Automated Rollback Policy**: Explicit auto-rollback policies configured on production deployments (error rate > 5% or KS p-value < 0.01).
- [ ] **22. Manual Rollback Drill**: Operations team has performed a dry-run manual rollback drill using `mlite rollback`.
- [ ] **23. Point-in-Time Database Recovery (PITR)**: Automated daily PostgreSQL dump scripts tested and verified with restore drills.
- [ ] **24. Failover Procedure Documented**: Runbooks published for node failure, MinIO disk degradation, and API service restart.

---

## 6. Security, Compliance & Governance

- [ ] **25. RBAC & Secret Rotation**: Default admin passwords rotated; JWT secrets generated with cryptographically secure 256-bit entropy (`openssl rand -hex 32`); least-privilege API keys assigned to client applications.
- [ ] **26. Immutable Audit Trail**: Audit logging active and verified via `mlite audit list` for all administrative actions.
- [ ] **27. Vulnerability Scanning**: Base container images scanned via Trivy with zero `CRITICAL` or `HIGH` unresolved CVEs.

---

## Sign-Off

| Reviewer Role | Name / Signature | Date | Status |
| :--- | :--- | :--- | :--- |
| **MLOps Lead** | | | [ ] Approved |
| **SecOps Lead** | | | [ ] Approved |
| **Infrastructure Lead**| | | [ ] Approved |
