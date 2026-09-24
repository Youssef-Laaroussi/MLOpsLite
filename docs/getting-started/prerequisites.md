# 📋 System Prerequisites & Hardware Requirements

> **Component:** `docs/getting-started/prerequisites.md`  
> **Milestone:** M8 — Documentation & Examples (Issue #33)

---

## Hardware Specifications

MLite is engineered as a lightweight, self-hosted alternative to heavy enterprise MLOps platforms (such as Kubeflow or AWS SageMaker). It runs comfortably on local developer laptops and budget cloud virtual private servers (VPS).

| Resource | Minimum (Local Dev) | Recommended (Team / Prod) |
| :--- | :--- | :--- |
| **CPU** | 2 Virtual Cores (x86_64 or ARM64) | 4+ Cores |
| **RAM** | 4 GB | 8 GB – 16 GB |
| **Disk Storage** | 20 GB free space (SSD recommended) | 50+ GB SSD |
| **Architecture** | `linux/amd64` or `linux/arm64` (Apple Silicon M1/M2/M3) | `linux/amd64` / Graviton |

---

## Required Software Dependencies

Before installing MLite, ensure the following core tools are installed on your host system:

### 1. Docker Engine & Docker Compose
MLite uses Docker Compose to orchestrate its core microservices (PostgreSQL, MinIO, MLflow, API, and Web UI).
- **Docker Engine:** `v24.0+`
- **Docker Compose:** `v2.20+` (Compose plugin syntax: `docker compose`)

Verify your installation:
```bash
docker --version
# Expected: Docker version 24.0.0 or higher

docker compose version
# Expected: Docker Compose version v2.20.0 or higher
```

### 2. Python (CLI & Training Environment)
The `mlite` CLI and client SDK require Python 3.12+.
- **Python:** `>= 3.12`
- **Pip:** `>= 23.0`

Verify your Python version:
```bash
python3 --version
# Expected: Python 3.12.x or higher
```

### 3. Git & curl
Required for repository cloning and downloading starter datasets:
```bash
git --version
curl --version
```

---

## Network Ports Allocation

Ensure the following local network ports are free and not occupied by preexisting services (such as local PostgreSQL instances):

| Service | Port | Protocol | Purpose |
| :--- | :---: | :---: | :--- |
| **MLite API** | `8000` | HTTP | Core REST API and OpenAPI Swagger docs (`/docs`) |
| **React UI** | `3000` | HTTP | Single-pane web dashboard |
| **MLflow UI** | `5000` | HTTP | Experiment tracking and model metrics portal |
| **MinIO API** | `9000` | HTTP | S3-compatible object storage API |
| **MinIO Console**| `9001` | HTTP | MinIO web management console |
| **PostgreSQL** | `5432` | TCP | Metadata database for MLite and MLflow |
| **Model Serving**| `8100–8200` | HTTP | Dynamic containerized inference ports |
