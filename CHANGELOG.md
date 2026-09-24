# Changelog

All notable changes to the **MLite (MLOpsLite)** platform will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.0.0] - 2026-09-18

### General Availability & Enterprise Production Release

This milestone marks the **v1.0.0 General Availability (GA)** release of MLite. Starting with this release, the core public APIs, CLI commands, and database schemas are frozen and covered by semantic versioning backwards-compatibility guarantees.

### Added
- **Tutorial & Example Ecosystem (M8)**:
  - Added end-to-end **Iris Classification Starter** ([#36](https://github.com/Youssef-Laaroussi/MLOpsLite/issues/36)).
  - Added production **Credit Card Fraud Detection** with synthetic feature drift injection and automated rollback ([#37](https://github.com/Youssef-Laaroussi/MLOpsLite/issues/37)).
  - Added **Retail Demand Forecasting** time-series regression example with delayed ground-truth feedback ingestion ([#38](https://github.com/Youssef-Laaroussi/MLOpsLite/issues/38)).
- **Documentation & Operations (M8 & M9)**:
  - Comprehensive documentation site built with MkDocs Material theme ([#33](https://github.com/Youssef-Laaroussi/MLOpsLite/issues/33)).
  - Full CLI command and autocompletion guide for 11 command groups ([#34](https://github.com/Youssef-Laaroussi/MLOpsLite/issues/34)).
  - Complete REST API endpoints and error contract specifications ([#35](https://github.com/Youssef-Laaroussi/MLOpsLite/issues/35)).
  - Enterprise Self-Hosting Production Deployment guide ([#40](https://github.com/Youssef-Laaroussi/MLOpsLite/issues/40)).
  - 25-point Production Readiness Checklist covering architecture, security, and DR ([#40](https://github.com/Youssef-Laaroussi/MLOpsLite/issues/40)).
- **Release Verification**:
  - Added automated pre-flight release smoke test suite (`scripts/release_smoke_test.py`) ([#39](https://github.com/Youssef-Laaroussi/MLOpsLite/issues/39)).

### Changed
- Production security hardening: serving container base images updated to non-root `USER mlite` with drop-capabilities.
- Standardized error handling format across all FastAPI routes.
- Strict API freeze: all `/api/v1/` endpoints guaranteed backwards compatible across 1.x releases.

---

## [0.1.0] - 2026-09-18

### MVP Community Preview Release

Initial MVP release of the MLite lightweight self-hosted MLOps platform.

### Added
- **Core Architecture & Storage (M0 & M1)**:
  - Base project structure, package namespaces, and configuration loader (`mlite.yaml`).
  - MinIO and S3-compatible blob storage client with automatic bucket provisioning.
  - Asynchronous SQLAlchemy ORM repository layer supporting both SQLite and PostgreSQL.
- **Data Versioning (M1)**:
  - Dataset registration with SHA-256 content-addressable checksum calculation.
  - CLI `mlite data` commands for listing, registering, and retrieving dataset metadata.
- **Experiment Tracking (M2)**:
  - Native MLflow tracking client integration.
  - Run management, hyperparameter logging, metric time-series recording, and artifact attachment.
  - CLI `mlite experiments` commands.
- **Model Registry (M3)**:
  - Model metadata registry with semantic version tracking and lifecycle stages (`staging`, `production`, `archived`).
  - Automated artifact serialization and storage in MinIO.
  - Input and output schema signature enforcement.
- **Serving & Container Orchestration (M4)**:
  - Dockerized isolated model serving containers with dynamic port allocation and resource boundaries.
  - Standardized `/predict` and `/health` HTTP endpoints.
  - Pre-flight readiness and liveness probe validation.
- **Monitoring & Quality (M5)**:
  - Continuous data drift detection using Evidently AI (Kolmogorov-Smirnov, Wasserstein distance).
  - Data quality assertion engine and anomaly alerting.
  - Delayed ground-truth feedback endpoint (`/api/v1/deployments/{id}/feedback`) for realized regression metrics.
- **Reliability & Rollback (M5)**:
  - Automated rollback policies triggered on error spikes or detected distribution shift.
  - Safe zero-downtime traffic switching with pre-flight health validation.
  - CLI `mlite rollback` command.
- **Security & Governance (M6)**:
  - JWT bearer token authentication and API key management.
  - Role-Based Access Control (RBAC) with `viewer`, `operator`, and `admin` scopes.
  - Write-only immutable audit logging engine for all state mutations.
- **Quality & CI/CD (M7)**:
  - Comprehensive unit, integration, and E2E test suites with 80%+ test coverage.
  - GitHub Actions CI/CD workflows for linting, security scanning (Trivy), testing, and multi-arch Docker image publishing.
