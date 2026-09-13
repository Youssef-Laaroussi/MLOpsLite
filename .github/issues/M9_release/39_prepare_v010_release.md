# #39 — Prepare and publish MLite v0.1.0 MVP community release

> **Milestone:** M9 — Release  
> **Priority:** `P0`  
> **Labels:** `release` `P0`  

---

## Problem
Delivering the MVP requires coordinating all P0 deliverables (monorepo layout, Docker Compose, PostgreSQL, MLflow, MinIO, FastAPI API, Typer CLI, project management, experiment tracking, model registry, basic Docker deployment, unit tests, and documentation) into a tested, tagged, and published release artifact.

## Objective
Finalize, validate, and publish MLite v0.1.0 (MVP), including the Python CLI package on PyPI, Docker images on GHCR, a comprehensive changelog, and release announcement.

## Proposed solution
Execute the release checklist: 1. Code freeze and version bump to 0.1.0 in `pyproject.toml`; 2. Execute full regression test suite (unit, integration, E2E Iris); 3. Build and verify production Docker images; 4. Publish `mlite-cli` to PyPI; 5. Publish `ghcr.io/youssef-laaroussi/mlite` containers; 6. Generate `CHANGELOG.md` and GitHub Release notes with installation instructions.

## Technical requirements
- Semantic Versioning `v0.1.0` tag in Git.
- GitHub Release with signed Git tag, changelog notes, and architecture diagram assets.
- Pre-built multi-arch Docker images tagged with `0.1.0` and `latest`.
- Published Python package `mlite-cli` on PyPI or TestPyPI with clean metadata.
- Smoke testing of the official installation commands on a clean machine.

## Acceptance criteria
- Tag `v0.1.0` triggers the release pipeline and publishes all release assets cleanly.
- `pip install mlite-cli==0.1.0` installs successfully in a clean virtual environment.
- `docker compose up -d` pulls and launches v0.1.0 services without compilation errors.
- Release announcement blog post or GitHub Discussion published.

## Tests
- Execute end-to-end smoke test using published PyPI wheel and published Docker containers.
- Verify checksums and signatures of all release assets.

## Documentation
- `CHANGELOG.md` entry for v0.1.0 summarizing core features, breaking changes, and upgrade guide.
- Update README release badge and quickstart version.

## Dependencies
Milestones M0 (Setup), M1 (Core MLOps), M2 (Deployment), Issue #28 (Tests), Issue #33 (Docs).
