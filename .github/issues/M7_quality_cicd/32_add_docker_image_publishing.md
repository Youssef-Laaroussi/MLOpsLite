# #32 — Add automated Docker image build and publishing pipeline

> **Milestone:** M7 — Quality & CI/CD  
> **Priority:** `P1`  
> **Labels:** `ci/cd` `P1`  

---

## Problem
Users should not have to build Docker images from source when running `docker compose up -d`. Pre-built, optimized, multi-arch Docker images must be published to GitHub Container Registry (GHCR) or Docker Hub for fast downloads.

## Objective
Implement an automated GitHub Actions release workflow (`.github/workflows/docker-publish.yml`) that builds and publishes multi-architecture (`linux/amd64`, `linux/arm64`) Docker images for `mlite-api`, `mlite-ui`, and `mlite-serving`.

## Proposed solution
Configure Docker Buildx and QEMU in GitHub Actions. Tag images with Git commit SHA, branch name, and SemVer tags (`v0.1.0`, `latest`). Push images to GitHub Container Registry (`ghcr.io/youssef-laaroussi/mlops-lite/...`).

## Technical requirements
- Workflow `.github/workflows/docker-publish.yml` triggered on Git tags (`v*`) and pushes to `main`.
- Docker Buildx for multi-platform builds (`linux/amd64`, `linux/arm64` supporting Apple Silicon and cloud VPSs).
- Layer caching using GitHub Actions cache (`type=gha`) for fast incremental builds.
- Minimal final image footprint using multi-stage builds and non-root user execution (`USER mlite`).

## Acceptance criteria
- Tagging a release triggers automated builds of all 3 images without manual intervention.
- Multi-arch manifests for `linux/amd64` and `linux/arm64` are published to GHCR.
- Images pass container vulnerability scans (`trivy` or Docker Scout) with zero CRITICAL CVEs.
- `docker compose` can pull pre-built images directly.

## Tests
- Run local multi-arch build validation via `docker buildx build --platform linux/amd64,linux/arm64 -t mlite-test .`.
- Verify image startup and healthcheck in an isolated environment.

## Documentation
- Write `docs/deployment/docker_images.md` documenting published image tags, security policies, and GHCR pulling instructions.
- Update `docker-compose.yml` with pre-built image references.

## Dependencies
Issue #2 (Docker Compose), Issue #31 (CI Pipeline).
