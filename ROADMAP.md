# 🗺️ MLite Project Roadmap & GitHub Issues Catalog

> **Platform:** MLite — Lightweight Self-Hosted MLOps Platform  
> **Total Issues:** 40  
> **Milestones:** 10 (M0 → M9)  
> **Governance:** Apache 2.0 Open Source  

This document serves as the master index for all **40 concrete GitHub Issues** planned for MLite.  
Each issue is fully documented in English with complete technical specifications across the 8 mandatory engineering sections:
**Problem**, **Objective**, **Proposed solution**, **Technical requirements**, **Acceptance criteria**, **Tests**, **Documentation**, and **Dependencies**.

---

## 🎯 Milestones Overview

```
M0: Project Setup (#1 - #6) ──────► M1: Core MLOps (#7 - #10) ─────► M2: Deployment (#11 - #13)
                                                                             │
M5: Reliability (#23 - #24) ◄───── M4: Monitoring (#17 - #22) ◄───── M3: Dashboard (#14 - #16)
          │
          ▼
M6: Security (#25 - #27) ────────► M7: Quality & CI/CD (#28 - #32)
                                             │
M9: Release (#39 - #40)   ◄─────── M8: Docs & Examples (#33 - #38)
```

| Milestone | Title | Priority Focus | Issues | Status | Description |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **M0** | [M0 — Project Setup](#m0-project-setup) | P0/P1 | `#1 → #6` | `DONE (100%)` | Foundational repository structure, Docker Compose orchestration, PostgreSQL, MLflow, MinIO, and FastAPI core. |
| **M1** | [M1 — Core MLOps](#m1-core-mlops) | P0/P1 | `#7 → #10` | `DONE (100%)` | Project management API, developer CLI with Typer, MLflow experiment tracking integration, and model registry. |
| **M2** | [M2 — Deployment](#m2-deployment) | P0/P1 | `#11 → #13` | `DONE (100%)` | Docker containerized model deployment, standardized REST prediction endpoints, and health monitoring probes. |
| **M3** | [M3 — Dashboard & Data](#m3-dashboard) | P0/P1 | `#14 → #16` | `DONE (100%)` | React single-pane dashboard with Tailwind CSS, tabular dataset management, and Git-compatible DVC integration. |
| **M4** | [M4 — Monitoring & Alerting](#m4-monitoring) | P0/P1 | `#17 → #22` | `DONE (100%)` | Data quality profiling, Evidently AI integration, feature drift detection, delayed feedback monitoring, and multi-channel alerting. |
| **M5** | [M5 — Reliability & Rollback](#m5-reliability) | P0/P1 | `#23 → #24` | `DONE (100%)` | Instant controlled traffic rollback to stable model versions and automated policy-driven degradation recovery. |
| **M6** | [M6 — Security & Governance](#m6-security) | P0/P1 | `#25 → #27` | `DONE (100%)` | JWT authentication, API keys, Role-Based Access Control (Admin, Maintainer, Developer, Viewer), and append-only audit logging. |
| **M7** | [M7 — Quality & CI/CD](#m7-quality-cicd) | P0/P1 | `#28 → #32` | `DONE (100%)` | Unit tests (>=80% coverage), integration test suite, E2E full lifecycle testing, GitHub Actions CI, and multi-arch Docker image publishing. |
| **M8** | [M8 — Documentation & Examples](#m8-docs-examples) | P0/P1 | `#33 → #38` | `DONE (100%)` | Comprehensive installation guide, CLI reference, OpenAPI documentation, and starter examples (Iris, Fraud Detection, Demand Forecasting). |
| **M9** | [M9 — Release](#m9-release) | P0/P1 | `#39 → #40` | `DONE (100%)` | v0.1.0 MVP community release package and v1.0.0 General Availability production release. |

---

## 📋 Complete Issues Catalog

### <a id="m0-project-setup"></a>M0 — Project Setup

> *Foundational repository structure, Docker Compose orchestration, PostgreSQL, MLflow, MinIO, and FastAPI core.*

| # | Issue Title | Priority | Labels | Specification File |
| :-: | :--- | :---: | :--- | :--- |
| **#1** | **Initialize repository structure and monorepo workspace** | `P0` | `setup` `P0` | [📄 View Issue Spec](.github/issues/M0_project_setup/01_initialize_repository_structure.md) |
| **#2** | **Add Docker Compose infrastructure and environment configurations** | `P0` | `setup` `P0` | [📄 View Issue Spec](.github/issues/M0_project_setup/02_add_docker_compose_infrastructure.md) |
| **#3** | **Configure PostgreSQL database and async SQLAlchemy/Alembic layer** | `P0` | `backend` `P0` | [📄 View Issue Spec](.github/issues/M0_project_setup/03_configure_postgresql.md) |
| **#4** | **Configure MLflow tracking server and artifact integration** | `P0` | `mlflow` `P0` | [📄 View Issue Spec](.github/issues/M0_project_setup/04_configure_mlflow.md) |
| **#5** | **Configure MinIO S3-compatible object storage and SDK client wrapper** | `P0` | `storage` `P0` | [📄 View Issue Spec](.github/issues/M0_project_setup/05_configure_minio.md) |
| **#6** | **Create FastAPI core application with modular routing and OpenAPI schema** | `P0` | `backend` `P0` | [📄 View Issue Spec](.github/issues/M0_project_setup/06_create_fastapi_application.md) |

### <a id="m1-core-mlops"></a>M1 — Core MLOps

> *Project management API, developer CLI with Typer, MLflow experiment tracking integration, and model registry.*

| # | Issue Title | Priority | Labels | Specification File |
| :-: | :--- | :---: | :--- | :--- |
| **#7** | **Implement project management API and workspace lifecycle** | `P0` | `feature` `P0` | [📄 View Issue Spec](.github/issues/M1_core_mlops/07_implement_project_management_api.md) |
| **#8** | **Implement MLite CLI developer experience with Typer and Rich** | `P0` | `cli` `P0` | [📄 View Issue Spec](.github/issues/M1_core_mlops/08_implement_mlite_cli.md) |
| **#9** | **Implement experiment tracking engine and training run runner** | `P0` | `mlflow` `P0` | [📄 View Issue Spec](.github/issues/M1_core_mlops/09_implement_experiment_tracking.md) |
| **#10** | **Implement centralized model registry with staging and promotion** | `P0` | `registry` `P0` | [📄 View Issue Spec](.github/issues/M1_core_mlops/10_implement_model_registry.md) |

### <a id="m2-deployment"></a>M2 — Deployment

> *Docker containerized model deployment, standardized REST prediction endpoints, and health monitoring probes.*

| # | Issue Title | Priority | Labels | Specification File |
| :-: | :--- | :---: | :--- | :--- |
| **#11** | **Implement Docker model packaging and deployment engine** | `P1` | `deployment` `P1` | [📄 View Issue Spec](.github/issues/M2_deployment/11_implement_docker_model_deployment.md) |
| **#12** | **Create standardized prediction REST endpoint and request validation** | `P1` | `deployment` `P1` | [📄 View Issue Spec](.github/issues/M2_deployment/12_create_prediction_endpoint.md) |
| **#13** | **Add deployment health checks, probes, and resource metrics** | `P1` | `deployment` `P1` | [📄 View Issue Spec](.github/issues/M2_deployment/13_add_deployment_health_checks.md) |

### <a id="m3-dashboard"></a>M3 — Dashboard & Data

> *React single-pane dashboard with Tailwind CSS, tabular dataset management, and Git-compatible DVC integration.*

| # | Issue Title | Priority | Labels | Specification File |
| :-: | :--- | :---: | :--- | :--- |
| **#14** | **Build unified React dashboard with Vite, TypeScript, and Tailwind CSS** | `P1` | `frontend` `P1` | [📄 View Issue Spec](.github/issues/M3_dashboard/14_build_react_dashboard.md) |
| **#15** | **Add dataset management, schema inspection, and metadata tracking** | `P1` | `data` `P1` | [📄 View Issue Spec](.github/issues/M3_dashboard/15_add_dataset_management.md) |
| **#16** | **Integrate DVC for reproducible data and pipeline version control** | `P1` | `data` `P1` | [📄 View Issue Spec](.github/issues/M3_dashboard/16_integrate_dvc.md) |

### <a id="m4-monitoring"></a>M4 — Monitoring & Alerting

> *Data quality profiling, Evidently AI integration, feature drift detection, delayed feedback monitoring, and multi-channel alerting.*

| # | Issue Title | Priority | Labels | Specification File |
| :-: | :--- | :---: | :--- | :--- |
| **#17** | **Implement automated data quality checks and validation reports** | `P1` | `monitoring` `P1` | [📄 View Issue Spec](.github/issues/M4_monitoring/17_implement_data_quality_checks.md) |
| **#18** | **Integrate Evidently AI for automated ML evaluation and reports** | `P1` | `monitoring` `P1` | [📄 View Issue Spec](.github/issues/M4_monitoring/18_integrate_evidently.md) |
| **#19** | **Implement feature data drift detection and threshold analysis** | `P1` | `monitoring` `P1` | [📄 View Issue Spec](.github/issues/M4_monitoring/19_implement_data_drift_detection.md) |
| **#20** | **Implement model performance and concept drift monitoring** | `P1` | `monitoring` `P1` | [📄 View Issue Spec](.github/issues/M4_monitoring/20_implement_model_monitoring.md) |
| **#21** | **Implement multi-channel alert engine and threshold evaluation** | `P1` | `alerting` `P1` | [📄 View Issue Spec](.github/issues/M4_monitoring/21_implement_alert_system.md) |
| **#22** | **Add webhook, Slack, Discord, and Email notification dispatchers** | `P1` | `alerting` `P1` | [📄 View Issue Spec](.github/issues/M4_monitoring/22_add_webhook_notifications.md) |

### <a id="m5-reliability"></a>M5 — Reliability & Rollback

> *Instant controlled traffic rollback to stable model versions and automated policy-driven degradation recovery.*

| # | Issue Title | Priority | Labels | Specification File |
| :-: | :--- | :---: | :--- | :--- |
| **#23** | **Implement controlled model rollback and instant traffic cutover** | `P1` | `rollback` `P1` | [📄 View Issue Spec](.github/issues/M5_reliability/23_implement_model_rollback.md) |
| **#24** | **Add automated rollback policies and degradation triggers** | `P2` | `rollback` `P2` | [📄 View Issue Spec](.github/issues/M5_reliability/24_add_automatic_rollback_policies.md) |

### <a id="m6-security"></a>M6 — Security & Governance

> *JWT authentication, API keys, Role-Based Access Control (Admin, Maintainer, Developer, Viewer), and append-only audit logging.*

| # | Issue Title | Priority | Labels | Specification File |
| :-: | :--- | :---: | :--- | :--- |
| **#25** | **Add JWT authentication, user accounts, and API key management** | `P2` | `security` `P2` | [📄 View Issue Spec](.github/issues/M6_security/25_add_authentication.md) |
| **#26** | **Implement Role-Based Access Control (RBAC) and permissions** | `P2` | `security` `P2` | [📄 View Issue Spec](.github/issues/M6_security/26_implement_rbac.md) |
| **#27** | **Add immutable audit logs for compliance and operational tracking** | `P2` | `security` `P2` | [📄 View Issue Spec](.github/issues/M6_security/27_add_audit_logs.md) |

### <a id="m7-quality-cicd"></a>M7 — Quality & CI/CD

> *Unit tests (>=80% coverage), integration test suite, E2E full lifecycle testing, GitHub Actions CI, and multi-arch Docker image publishing.*

| # | Issue Title | Priority | Labels | Specification File |
| :-: | :--- | :---: | :--- | :--- |
| **#28** | **Establish unit test suite with Pytest and 80%+ code coverage** | `P0` | `testing` `P0` | [📄 View Issue Spec](.github/issues/M7_quality_cicd/28_add_unit_tests.md) |
| **#29** | **Add integration test suite for PostgreSQL, MLflow, and MinIO** | `P1` | `testing` `P1` | [📄 View Issue Spec](.github/issues/M7_quality_cicd/29_add_integration_tests.md) |
| **#30** | **Add End-to-End (E2E) complete ML lifecycle automated tests** | `P1` | `testing` `P1` | [📄 View Issue Spec](.github/issues/M7_quality_cicd/30_add_end_to_end_tests.md) |
| **#31** | **Configure GitHub Actions CI pipeline for linting, typing, and testing** | `P0` | `ci/cd` `P0` | [📄 View Issue Spec](.github/issues/M7_quality_cicd/31_configure_github_actions_ci.md) |
| **#32** | **Add automated Docker image build and publishing pipeline** | `P1` | `ci/cd` `P1` | [📄 View Issue Spec](.github/issues/M7_quality_cicd/32_add_docker_image_publishing.md) |

### <a id="m8-docs-examples"></a>M8 — Documentation & Examples

> *Comprehensive installation guide, CLI reference, OpenAPI documentation, and starter examples (Iris, Fraud Detection, Demand Forecasting).*

| # | Issue Title | Priority | Labels | Specification File |
| :-: | :--- | :---: | :--- | :--- |
| **#33** | **Write comprehensive installation and zero-to-hero onboarding guide** | `P0` | `docs` `P0` | [📄 View Issue Spec](.github/issues/M8_docs_examples/33_write_installation_documentation.md) |
| **#34** | **Write complete CLI command reference and shell autocompletion guide** | `P1` | `docs` `P1` | [📄 View Issue Spec](.github/issues/M8_docs_examples/34_write_cli_documentation.md) |
| **#35** | **Write REST API reference with OpenAPI interactive documentation** | `P1` | `docs` `P1` | [📄 View Issue Spec](.github/issues/M8_docs_examples/35_write_api_documentation.md) |
| **#36** | **Create end-to-end Iris classification starter example** | `P1` | `example` `P1` | [📄 View Issue Spec](.github/issues/M8_docs_examples/36_create_iris_example.md) |
| **#37** | **Create production fraud detection example with drift and rollback** | `P1` | `example` `P1` | [📄 View Issue Spec](.github/issues/M8_docs_examples/37_create_fraud_detection_example.md) |
| **#38** | **Create demand forecasting example with time-series evaluation** | `P2` | `example` `P2` | [📄 View Issue Spec](.github/issues/M8_docs_examples/38_create_demand_forecasting_example.md) |

### <a id="m9-release"></a>M9 — Release

> *v0.1.0 MVP community release package and v1.0.0 General Availability production release.*

| # | Issue Title | Priority | Labels | Specification File |
| :-: | :--- | :---: | :--- | :--- |
| **#39** | **Prepare and publish MLite v0.1.0 MVP community release** | `P0` | `release` `P0` | [📄 View Issue Spec](.github/issues/M9_release/39_prepare_v010_release.md) |
| **#40** | **Prepare and publish MLite v1.0.0 General Availability (GA) production release** | `P2` | `release` `P2` | [📄 View Issue Spec](.github/issues/M9_release/40_prepare_v100_release.md) |

---

## 🚀 How to Create These Issues on GitHub

As a maintainer, you can create each issue directly in the GitHub web interface:

1. Go to your repository on GitHub: [github.com/Youssef-Laaroussi/MLOpsLite](https://github.com/Youssef-Laaroussi/MLOpsLite)
2. Open the **Milestones** tab (`/milestones`) and create the 10 Milestones (M0 to M9).
3. Open the **Labels** tab (`/labels`) and ensure tags (`setup`, `backend`, `mlflow`, `storage`, `feature`, `cli`, `registry`, `deployment`, `frontend`, `data`, `monitoring`, `alerting`, `rollback`, `security`, `testing`, `ci/cd`, `docs`, `example`, `release`, `P0`, `P1`, `P2`) exist.
4. Click **New Issue**, copy the title and the complete Markdown content from the corresponding `.github/issues/...` file, assign the Milestone and Labels, and click **Submit new issue**.

---

*Generated for MLite open-source community development.*
