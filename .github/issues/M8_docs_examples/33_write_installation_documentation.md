# #33 — Write comprehensive installation and zero-to-hero onboarding guide

> **Milestone:** M8 — Documentation & Examples  
> **Priority:** `P0`  
> **Labels:** `docs` `P0`  

---

## Problem
An open-source platform's adoption depends on its first 15-minute experience. If installation instructions are ambiguous, missing hardware requirements, or assume implicit cloud setup, potential users will abandon the tool.

## Objective
Author a comprehensive, beginner-friendly installation and quickstart guide in `docs/getting-started/` covering Docker Compose setup, host system prerequisites, initial verification, and troubleshooting.

## Proposed solution
Create structured documentation using MkDocs Material: `docs/getting-started/installation.md`, `prerequisites.md`, `quickstart.md`, and `troubleshooting.md`. Provide step-by-step instructions for Ubuntu/Debian, macOS, Windows (WSL2), and low-cost VPS instances (e.g. Hetzner, DigitalOcean).

## Technical requirements
- Hardware & software prerequisites: minimum 4GB RAM, 2 CPU cores, Docker 24+, Compose v2, Python 3.12+.
- Copy-pasteable setup commands verified on clean environments.
- Verification checklist: how to confirm PostgreSQL, MinIO, MLflow, and API are running.
- Comprehensive troubleshooting matrix: common port conflicts (5432, 8000, 5000), permission errors, Docker socket access.
- MkDocs site configuration with search, code highlighting, and version selector.

## Acceptance criteria
- A user with a clean Linux or macOS machine can get MLite running in under 5 minutes following the guide.
- Every command in the documentation is verified and reproducible without undocumented steps.
- `mkdocs build` generates zero broken links or markdown syntax warnings.
- Includes dedicated section for headless VPS setup without desktop browsers.

## Tests
- Run automated doc link checker (`markdown-link-check` or `mkdocs build --strict`).
- Perform clean-room test by executing instructions in a fresh Docker container or VM.

## Documentation
- `docs/getting-started/installation.md`.
- `docs/getting-started/quickstart.md`.
- `docs/getting-started/troubleshooting.md`.

## Dependencies
Issue #2 (Docker Compose), Issue #8 (CLI).
