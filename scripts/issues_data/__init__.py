"""Aggregate all 40 issues across all 10 milestones."""

from .m0_setup import M0_ISSUES
from .m1_core import M1_ISSUES
from .m2_deployment import M2_ISSUES
from .m3_dashboard import M3_ISSUES
from .m4_monitoring import M4_ISSUES
from .m5_reliability import M5_ISSUES
from .m6_security import M6_ISSUES
from .m7_quality import M7_ISSUES
from .m8_docs import M8_ISSUES
from .m9_release import M9_ISSUES

ALL_ISSUES = (
    M0_ISSUES
    + M1_ISSUES
    + M2_ISSUES
    + M3_ISSUES
    + M4_ISSUES
    + M5_ISSUES
    + M6_ISSUES
    + M7_ISSUES
    + M8_ISSUES
    + M9_ISSUES
)

MILESTONES = [
    {
        "code": "M0_project_setup",
        "title": "M0 — Project Setup",
        "description": "Foundational repository structure, Docker Compose orchestration, PostgreSQL, MLflow, MinIO, and FastAPI core.",
        "issues": [1, 2, 3, 4, 5, 6]
    },
    {
        "code": "M1_core_mlops",
        "title": "M1 — Core MLOps",
        "description": "Project management API, developer CLI with Typer, MLflow experiment tracking integration, and model registry.",
        "issues": [7, 8, 9, 10]
    },
    {
        "code": "M2_deployment",
        "title": "M2 — Deployment",
        "description": "Docker containerized model deployment, standardized REST prediction endpoints, and health monitoring probes.",
        "issues": [11, 12, 13]
    },
    {
        "code": "M3_dashboard",
        "title": "M3 — Dashboard & Data",
        "description": "React single-pane dashboard with Tailwind CSS, tabular dataset management, and Git-compatible DVC integration.",
        "issues": [14, 15, 16]
    },
    {
        "code": "M4_monitoring",
        "title": "M4 — Monitoring & Alerting",
        "description": "Data quality profiling, Evidently AI integration, feature drift detection, delayed feedback monitoring, and multi-channel alerting.",
        "issues": [17, 18, 19, 20, 21, 22]
    },
    {
        "code": "M5_reliability",
        "title": "M5 — Reliability & Rollback",
        "description": "Instant controlled traffic rollback to stable model versions and automated policy-driven degradation recovery.",
        "issues": [23, 24]
    },
    {
        "code": "M6_security",
        "title": "M6 — Security & Governance",
        "description": "JWT authentication, API keys, Role-Based Access Control (Admin, Maintainer, Developer, Viewer), and append-only audit logging.",
        "issues": [25, 26, 27]
    },
    {
        "code": "M7_quality_cicd",
        "title": "M7 — Quality & CI/CD",
        "description": "Unit tests (>=80% coverage), integration test suite, E2E full lifecycle testing, GitHub Actions CI, and multi-arch Docker image publishing.",
        "issues": [28, 29, 30, 31, 32]
    },
    {
        "code": "M8_docs_examples",
        "title": "M8 — Documentation & Examples",
        "description": "Comprehensive installation guide, CLI reference, OpenAPI documentation, and starter examples (Iris, Fraud Detection, Demand Forecasting).",
        "issues": [33, 34, 35, 36, 37, 38]
    },
    {
        "code": "M9_release",
        "title": "M9 — Release",
        "description": "v0.1.0 MVP community release package and v1.0.0 General Availability production release.",
        "issues": [39, 40]
    }
]
