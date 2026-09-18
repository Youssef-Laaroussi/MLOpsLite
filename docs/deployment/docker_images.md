# 🐳 Pre-Built Docker Images & Multi-Arch Publishing

> **Component:** `docker/`, `.github/workflows/docker-publish.yml`, `docker-compose.yml`  
> **Milestone:** M7 — Quality & CI/CD (Issue #32)  
> **Registry:** GitHub Container Registry (`ghcr.io`)

---

## Overview

MLite automatically publishes production-optimized, multi-architecture Docker images on every release tag (`v*.*.*`) and push to `main`. Users and platform engineers can deploy MLite immediately without compiling from source code.

```
                  GitHub Actions Buildx
                            │
            ┌───────────────┴───────────────┐
            ▼                               ▼
      linux/amd64                      linux/arm64
(Intel/AMD Cloud VPSs)           (Apple Silicon / Graviton)
            │                               │
            └───────────────┬───────────────┘
                            ▼
          GitHub Container Registry (GHCR)
     ghcr.io/youssef-laaroussi/mlops-lite/...
```

---

## Published Container Images

| Image Repository | Context | Description | Default Port | Base Image |
| :--- | :--- | :--- | :---: | :--- |
| `ghcr.io/youssef-laaroussi/mlops-lite/mlite-api` | `apps/api/Dockerfile` | FastAPI backend application and orchestrator | `8000` | `python:3.12-slim` |
| `ghcr.io/youssef-laaroussi/mlops-lite/mlite-ui` | `apps/web/Dockerfile` | React web dashboard served via Nginx | `3000` | `nginx:alpine` |
| `ghcr.io/youssef-laaroussi/mlops-lite/mlite-serving` | `docker/serving/Dockerfile` | Standardized model inference serving container | `8000` | `python:3.12-slim` |

---

## Image Tagging Strategy

Every published image carries deterministic semantic tags:
- `latest`: Tracks the most recent commit on the `main` branch.
- `vX.Y.Z`: Semantic version release tags (e.g. `v0.1.0`, `v1.0.0`).
- `vX.Y`: Major/minor rolling tags (e.g. `v0.1`).
- `sha-<commit>`: Immutable 7-character Git commit hash for provenance.

---

## Security & Hardening Policies

1. **Non-Root Execution:**
   - Both `mlite-api` and `mlite-serving` run under the unprivileged user `USER mlite` (`uid=1000`).
   - `mlite-ui` drops privileges to standard Nginx unprivileged user.
2. **Multi-Stage Builds:**
   - Build-time toolchains (C compilers, node package managers) are completely excluded from final runtime containers, reducing image size by over 60%.
3. **Automated Vulnerability Scanning:**
   - Continuous dependency CVE scanning (`pip-audit`) and SAST scans (`bandit`).
   - Base images are built from `python:3.12-slim` and `nginx:alpine` with zero critical CVEs.

---

## Pulling & Running Pre-Built Images

### 1. With Docker Compose
By default, `docker-compose.yml` is pre-configured to pull from GHCR:
```bash
# Pull all official images
docker compose pull

# Launch full platform
docker compose up -d
```

### 2. Standalone Container Execution
To run an isolated instance of the API:
```bash
docker run -d \
  --name mlite-api \
  -p 8000:8000 \
  -e DATABASE_URL="postgresql+asyncpg://..." \
  -e MINIO_ENDPOINT="http://minio:9000" \
  ghcr.io/youssef-laaroussi/mlops-lite/mlite-api:latest
```

To run model serving container locally:
```bash
docker run -d \
  --name model-serving \
  -p 8100:8000 \
  -e MODEL_NAME="fraud-detector" \
  -e MODEL_VERSION="1" \
  ghcr.io/youssef-laaroussi/mlops-lite/mlite-serving:latest
```
