<div align="center">

# ⚡ MLite

**Lightweight Self-Hosted MLOps Platform**

*MLOps without the cloud, without the complexity.*

[![License](https://img.shields.io/badge/License-Apache_2.0-blue.svg)](LICENSE)
[![Python](https://img.shields.io/badge/Python-3.12%2B-blue.svg)](https://python.org)
[![Docker](https://img.shields.io/badge/Docker-Compose-2496ED.svg?logo=docker&logoColor=white)](docker-compose.yml)
[![MLflow](https://img.shields.io/badge/Tracking-MLflow-0194E2.svg)](https://mlflow.org)
[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React_18-61DAFB.svg?logo=react&logoColor=black)](apps/web)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)

[Quick Start](#-quick-start) • [Architecture](#-architecture) • [Features](#-features) • [Roadmap (40 Issues)](ROADMAP.md) • [Contributing](CONTRIBUTING.md)

</div>

---

## 🎯 Vision

**MLite** is an open-source, lightweight, and self-hosted MLOps platform tailored for AI startups, researchers, data science teams, and individual engineers. It provides an end-to-end operational layer that manages the complete machine learning lifecycle from a **single CLI** and a **unified dashboard**:

$$\text{Data} \longrightarrow \text{Versioning} \longrightarrow \text{Experiment} \longrightarrow \text{Model} \longrightarrow \text{Registry} \longrightarrow \text{Deployment} \longrightarrow \text{Monitoring} \longrightarrow \text{Alerting} \longrightarrow \text{Rollback}$$

Instead of reinventing the wheel, MLite stitches together battle-tested standards (**MLflow**, **DVC**, **Evidently**, **FastAPI**, **MinIO**, **PostgreSQL**) behind a streamlined developer experience.

> **Value Proposition**: *Run your complete ML lifecycle on your own infrastructure, without Kubernetes or cloud vendor lock-in.*

---

## 🛑 Why MLite?

For small teams, setting up standard enterprise MLOps often leads to infrastructure bloat:

```
Traditional MLOps Stack:
Git + DVC + MLflow + Docker + Prometheus + Grafana + Airflow + Kubernetes + S3/GCS + Custom CI/CD
```

This demands dedicated platform engineers and heavy cloud bills.

### The MLite Alternative

MLite delivers that entire lifecycle out-of-the-box using standard **Docker Compose** on any Linux VPS or workstation:

```
MLite Unified Platform:
 ├── 📊 Data & Versioning (DVC + MinIO)
 ├── 🧪 Experiment Tracking (MLflow engine)
 ├── 🏷️ Model Registry (Staging / Production stages)
 ├── 🚀 Instant Deployment (FastAPI containerized endpoints)
 ├── 👁️ Real-time Monitoring & Drift (Evidently AI)
 ├── 🔔 Multi-channel Alerting (Webhooks, Slack, Discord)
 └── 🔄 Controlled Rollback (Automated & Manual recovery)
```

---

## 🚀 Quick Start

### 1. Launch Infrastructure
Start MLite's self-hosted backend, tracking server, storage, and database:

```bash
git clone https://github.com/Youssef-Laaroussi/MLOpsLite.git
cd MLOpsLite
docker compose up -d
```

### 2. Initialize a Project
Install the MLite CLI and bootstrap your project repository:

```bash
pip install mlite-cli

mlite init iris-classifier
cd iris-classifier
```

Project scaffold generated:
```
iris-classifier/
├── mlite.yaml        # Configuration (data, tracking, deployment, rollback)
├── data/             # Versioned datasets
├── src/              # ML training code
├── models/           # Exported artifacts
├── tests/            # Test suites
└── README.md
```

### 3. Track, Promote & Deploy

```bash
# Run training with automatic MLflow experiment logging
mlite experiment run --script src/train.py

# Promote candidate model to production
mlite model promote iris-classifier --version 1 --stage production

# Deploy model container exposing REST API
mlite deploy iris-classifier --version 1
```

Your model is now serving live traffic:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"inputs": [[5.1, 3.5, 1.4, 0.2]]}'
```

---

## 🏗️ Architecture

```
                                 DEVELOPER / USER
                                        │
                       ┌────────────────┴────────────────┐
                       │                                 │
                   MLite CLI                         Web UI
                  (Typer CLI)                    (React + Vite)
                       │                                 │
                       └────────────────┬────────────────┘
                                        │ REST API / JWT
                                        ▼
                                  FastAPI Core
                                        │
           ┌────────────────────────────┼────────────────────────────┐
           ▼                            ▼                            ▼
      Data Manager              Experiment Manager             Model Manager
     (DVC + Polars)                  (MLflow)                    (Registry)
           │                            │                            │
           └────────────────────────────┼────────────────────────────┘
                                        │
                                        ▼
                           MinIO S3 Compatible Storage
                                        │
                                        ▼
                                Deployment Engine
                           (Docker Container Serving)
                                        │
                                        ▼
                               Prediction REST API
                             (POST /predict, Health)
                                        │
                                        ▼
                                Monitoring Engine
                           (Evidently AI Drift Checks)
                                        │
                               ┌────────┴────────┐
                               ▼                 ▼
                          Data Drift       Model Metrics
                               │                 │
                               └────────┬────────┘
                                        ▼
                                 Alerting Engine
                          (Webhooks, Slack, Auto-Rollback)
```

---

## 📦 Technical Stack

| Layer | Technology | Rationale |
| :--- | :--- | :--- |
| **Language** | Python 3.12+ | Modern syntax, standard type hinting, best ML library ecosystem |
| **Backend API** | FastAPI + Pydantic v2 | High performance, auto-generated OpenAPI docs, async I/O |
| **CLI** | Typer + Rich | Intuitive subcommands, colored outputs, shell completion |
| **Database** | PostgreSQL 16 + SQLAlchemy 2.0 | Proven transactional metadata and state storage |
| **Experiment Tracking** | MLflow 2.15+ | Industry-standard tracking backend and artifact interface |
| **Data Versioning** | DVC + Polars | Git-compatible dataset versioning and ultra-fast tabular processing |
| **Object Storage** | MinIO | 100% self-hosted, S3-compatible storage for data and weights |
| **Model Serving** | Docker + Uvicorn | Lightweight isolated containers per deployed model |
| **Monitoring & Drift** | Evidently AI | Production-proven data drift and model degradation evaluation |
| **Frontend** | React 18 + TypeScript + Tailwind CSS | Fast, clean, reactive management dashboard |
| **Charts** | Recharts | Responsive, clean metrics visualization |
| **CI/CD** | GitHub Actions | Automated linting, type-checking, and test execution |

---

## 🗺️ Project Roadmap & 40 GitHub Issues

MLite is built with open governance. All core development tasks are organized into **10 Milestones (M0 → M9)** with **40 prioritized issues**:

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

👉 **View the complete issue list and specifications in [ROADMAP.md](ROADMAP.md)**.

To push all milestones, labels, and issues to your GitHub repository automatically:
```bash
export GITHUB_TOKEN="ghp_yourPersonalAccessTokenHere"
python3 scripts/sync_github_issues.py --repo Youssef-Laaroussi/MLOpsLite --create
```

---

## 🤝 Contributing

We welcome community contributions! Whether it's adding a new model serving target, enhancing the drift detection pipeline, or improving documentation:

1. Check our [Roadmap](ROADMAP.md) for open issues.
2. Read the [Contributing Guidelines](CONTRIBUTING.md).
3. Review our [Code of Conduct](CODE_OF_CONDUCT.md).
4. Submit a Pull Request!

---

## 📄 License

MLite is open source software licensed under the **[Apache License 2.0](LICENSE)**.
