<div align="center">

<img src="assets/logo.png" alt="MLite Logo" width="150" />

# MLite

### *Lightweight Self-Hosted MLOps Platform*

<p align="center">
  <strong>MLOps without the cloud lock-in. Without the Kubernetes complexity.</strong><br>
  <em>Data • Versioning • Tracking • Registry • Deployment • Monitoring • Alerting • Rollback</em>
</p>

<!-- Badges Section -->
<p align="center">
  <a href="LICENSE">
    <img src="https://img.shields.io/badge/License-Apache%202.0-2EA44F?style=for-the-badge&logo=apache&logoColor=white" alt="License: Apache 2.0" />
  </a>
  <a href="https://python.org">
    <img src="https://img.shields.io/badge/Python-3.12%2B-3776AB?style=for-the-badge&logo=python&logoColor=white" alt="Python 3.12+" />
  </a>
  <a href="docker-compose.yml">
    <img src="https://img.shields.io/badge/Docker-Compose%20v2-2496ED?style=for-the-badge&logo=docker&logoColor=white" alt="Docker Compose" />
  </a>
  <a href="CONTRIBUTING.md">
    <img src="https://img.shields.io/badge/PRs-welcome-brightgreen?style=for-the-badge" alt="PRs Welcome" />
  </a>
</p>

<p align="center">
  <img src="https://img.shields.io/badge/FastAPI-009688?style=flat-square&logo=fastapi&logoColor=white" alt="FastAPI" />
  <img src="https://img.shields.io/badge/MLflow-0194E2?style=flat-square&logo=mlflow&logoColor=white" alt="MLflow" />
  <img src="https://img.shields.io/badge/PostgreSQL_16-4169E1?style=flat-square&logo=postgresql&logoColor=white" alt="PostgreSQL" />
  <img src="https://img.shields.io/badge/MinIO_S3-C72C48?style=flat-square&logo=minio&logoColor=white" alt="MinIO" />
  <img src="https://img.shields.io/badge/Evidently_AI-FF6F00?style=flat-square&logo=chartdotpie&logoColor=white" alt="Evidently AI" />
  <img src="https://img.shields.io/badge/React_18-61DAFB?style=flat-square&logo=react&logoColor=black" alt="React" />
  <img src="https://img.shields.io/badge/Tailwind_CSS-06B6D4?style=flat-square&logo=tailwindcss&logoColor=white" alt="Tailwind CSS" />
</p>

<p align="center">
  <a href="#-why-mlite">💡 Why MLite?</a> •
  <a href="#-core-lifecycle-pipeline">🔄 Lifecycle</a> •
  <a href="#-quick-start">🚀 Quick Start</a> •
  <a href="#-architecture">🏗️ Architecture</a> •
  <a href="#-tech-stack">🛠️ Tech Stack</a> •
  <a href="CONTRIBUTING.md">🤝 Contributing</a>
</p>

</div>

---

## 🎯 Vision

**MLite** is an open-source, lightweight, and self-hosted MLOps platform engineered specifically for **AI startups, data labs, researchers, and small data science teams**.

Enterprise MLOps platforms often demand complex Kubernetes clusters, expensive cloud subscriptions (AWS/GCP/Azure), and dedicated infrastructure teams. **MLite eliminates that barrier**:

```
Data ──► Versioning ──► Experiment ──► Registry ──► Deployment ──► Monitoring ──► Alerting ──► Rollback
```

> [!TIP]
> **The MLite Promise**: Run your entire machine learning lifecycle on your own VPS or local workstation with a single Docker Compose command and a unified CLI.

---

## 💡 Why MLite?

| Feature | 🔴 Traditional Heavyweight MLOps | 🟢 The MLite Approach |
| :--- | :--- | :--- |
| **Infrastructure** | Kubernetes, Helm, Cloud VPCs, IAM Roles | **Docker Compose v2** (`docker compose up -d`) |
| **Cloud Dependency** | Vendor lock-in (AWS S3, SageMaker, Vertex AI) | **100% Self-Hosted** (Local disk, MinIO, PostgreSQL) |
| **Tooling Sprawl** | 8+ disjointed tools with separate web consoles | **Single CLI** (`mlite`) & **Unified Dashboard** |
| **Deployment** | Complex K8s Ingress, Istio, custom pods | **One-command container serving** (`mlite deploy`) |
| **Model Observability**| Custom Prometheus + Grafana exporters | **Built-in Data Drift & Quality** (Evidently AI) |
| **Production Rollback** | Manual pod restarts, complex GitOps loops | **Instant 1-Command Rollback** (`mlite rollback`) |
| **Cost** | Hundreds to thousands of dollars/month | **Zero recurring license fees** (Open Source Apache 2.0) |

---

## 🔄 Core Lifecycle Pipeline

```
 ┌────────────────────────────────────────────────────────────────────────┐
 │                              MLite CLI                                 │
 └───────┬──────────────┬─────────────┬─────────────┬─────────────┬───────┘
         │              │             │             │             │
   mlite data     mlite experiment  mlite model   mlite deploy  mlite monitor
         │              │             │             │             │
         ▼              ▼             ▼             ▼             ▼
   ┌──────────┐   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐
   │  DVC +   │   │  MLflow  │  │  Model   │  │ FastAPI  │  │ Evidently│
   │  MinIO   │──►│ Tracking │─►│ Registry │─►│Container │─►│  Drift   │
   │ Datasets │   │ Metrics  │  │  Stages  │  │ Serving  │  │  Alerts  │
   └──────────┘   └──────────┘  └──────────┘  └──────────┘  └────┬─────┘
                                                                 │
                                                    mlite rollback
                                                                 │
                                                                 ▼
                                                            Auto/Manual
                                                             Recovery
```

| Lifecycle Stage | Underlying Technology | Key Capabilities |
| :--- | :---: | :--- |
| 📊 **1. Data Versioning** | `DVC` + `MinIO` | SHA-256 data hashing, schema profiling, remote S3 sync |
| 🧪 **2. Experiment Tracking** | `MLflow` | Hyperparameters, metrics, Git commit SHA, training artifacts |
| 🏷️ **3. Model Registry** | `PostgreSQL` | Formal stages: `Development` → `Candidate` → `Staging` → `Production` |
| 🚀 **4. Container Serving** | `Docker` + `FastAPI` | Instant REST serving container (`POST /predict`, health probes) |
| 👁️ **5. Quality & Drift** | `Evidently AI` | Automated data drift tests, concept drift, feature distribution |
| 🔔 **6. Multi-channel Alerts**| `Webhooks` | Slack, Discord, Email, and HTTP webhooks on anomalies |
| 🔄 **7. Controlled Rollback** | `MLite Engine` | Zero-downtime cutover back to the last verified stable model |

---

## 🚀 Quick Start

### 1. Launch Platform Infrastructure
On your server or local machine:

```bash
# Clone the repository and switch to dev
git clone https://github.com/Youssef-Laaroussi/MLOpsLite.git
cd MLOpsLite
git checkout dev

# Start self-hosted services
docker compose up -d
```

### 2. Activate Python Virtual Environment
```bash
# Activate existing dev environment
source yzmenv/bin/activate

# Install development dependencies in editable mode
pip install -e ".[dev]"
```

### 3. Initialize a New ML Project
```bash
# Bootstrap an end-to-end ML project scaffold
mlite init fraud-detection
cd fraud-detection
```

This generates your project workspace:
```text
fraud-detection/
├── mlite.yaml        # Configuration (tracking, storage, alerts, rollback)
├── data/             # Datasets tracked with DVC
├── src/              # Machine learning training scripts
├── models/           # Exported models and artifacts
├── tests/            # Test suites
└── README.md
```

### 4. Train, Promote & Deploy
```bash
# 1. Run training with automatic MLflow metrics logging
mlite experiment run --script src/train.py

# 2. Promote candidate model to production
mlite model promote fraud-detector --version 1 --stage production

# 3. Deploy dedicated inference container
mlite deploy fraud-detector --version 1
```

Test your live inference endpoint:
```bash
curl -X POST http://localhost:8000/predict \
  -H "Content-Type: application/json" \
  -d '{"inputs": [[0.45, 120.5, 1.0, 0.0]]}'
```

---

## 🏗️ Architecture

```
                                 USER / DATA SCIENTIST
                                           │
                          ┌────────────────┴────────────────┐
                          │                                 │
                      MLite CLI                         React UI
                     (Typer + Rich)                  (Vite + Tailwind)
                          │                                 │
                          └────────────────┬────────────────┘
                                           │ REST API / JWT
                                           ▼
                                     FastAPI Core
                                           │
              ┌────────────────────────────┼────────────────────────────┐
              ▼                            ▼                            ▼
         Data Engine               Experiment Engine               Model Engine
        (DVC + Polars)                  (MLflow)                    (Registry)
              │                            │                            │
              └────────────────────────────┼────────────────────────────┘
                                           │
                                           ▼
                              MinIO S3-Compatible Storage
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

## 🛠️ Tech Stack

```text
Language:             Python 3.12+
API Framework:        FastAPI & Pydantic v2
CLI Tooling:          Typer & Rich
Database:             PostgreSQL 16 with SQLAlchemy 2.0 (asyncpg)
Object Storage:       MinIO (S3-compatible, self-hosted)
Experiment Tracking:  MLflow 2.15+
Data Processing:      Polars & DVC
ML Observability:     Evidently AI
Frontend:             React 18, TypeScript, Tailwind CSS, Recharts
Containerization:     Docker & Docker Compose v2
Testing & Quality:    Pytest, Ruff, MyPy
```

---

## 🤝 Contributing

We welcome community contributions! Please read our guidelines before opening pull requests:

1. **[Contributing Guide](CONTRIBUTING.md)**: Branch conventions, environment setup, PR checklist.
2. **[Code of Conduct](CODE_OF_CONDUCT.md)**: Community standards.

---

## 📄 License

This project is licensed under the **[Apache License 2.0](LICENSE)**.
