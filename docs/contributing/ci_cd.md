# ⚙️ Continuous Integration (CI/CD) Pipeline

> **Component:** `.github/workflows/` (`lint.yml`, `tests.yml`, `security.yml`, `docker-publish.yml`)  
> **Milestone:** M7 — Quality & CI/CD (Issue #31)  
> **Platform:** GitHub Actions

---

## Overview

MLite enforces automated code quality, typing verification, comprehensive testing, security scanning, and multi-arch Docker image packaging on every Pull Request and branch commit.

```
Pull Request / Push
        │
        ├──► 1. lint.yml       (Ruff lint & format + MyPy strict types)
        │
        ├──► 2. tests.yml      (Pytest unit >=80% + Postgres & MinIO integration)
        │
        ├──► 3. security.yml   (Bandit SAST + pip-audit CVE scan)
        │
        └──► 4. docker-publish.yml (Release tags: multi-arch GHCR build & push)
```

---

## Workflow Matrix

### 1. `lint.yml` (Code Style & Typing)
- **Ruff Linting:** Enforces PEP 8, import sorting (`I`), bug prevention (`B`), and modern Python 3.12 syntax upgrades (`UP`).
- **Ruff Formatting:** Replaces Black/Flake8 with lightning-fast deterministic formatting (100 character line length).
- **MyPy:** Strict static type analysis across all `packages/` and `apps/`.
- **Run Duration:** ~30 seconds.

### 2. `tests.yml` (Unit & Integration Tests)
- **Runner Environment:** Python 3.12 on Ubuntu Latest.
- **Service Containers:**
  - `PostgreSQL 16` (`postgres:16-alpine` on port 5432)
  - `MinIO` (`minio/minio` on port 9000)
- **Test Enforcement:**
  - `pytest tests/unit` with `>= 80%` code coverage threshold enforced.
  - `pytest tests/integration` validating real SQL migrations and S3 transactions.
- **Artifacts:** Code coverage XML report uploaded to workflow run artifacts.
- **Run Duration:** ~90 seconds.

### 3. `security.yml` (Vulnerability & SAST Audit)
- **Bandit:** Static Application Security Testing (SAST) scanning for SQL injections, unsafe deserialization, and hardcoded credentials.
- **pip-audit:** Scans installed Python package dependencies against the Python Packaging Advisory Database (PyPA).
- **Schedule:** Triggers on PRs and runs weekly on Mondays at 04:00 UTC.

---

## PR Merge Criteria

A Pull Request **cannot be merged** if any of the following checks fail:
- ❌ Any Ruff formatting or linting violation.
- ❌ Any MyPy type checking error.
- ❌ Any failing unit or integration test.
- ❌ Code coverage below the 80% threshold.

---

## Troubleshooting Failed CI Builds

### Linting / Formatting Failures
Run the automated formatter locally before committing:
```bash
# Auto-fix linting issues
ruff check --fix .

# Auto-format files
ruff format .
```

### MyPy Typing Errors
Run MyPy locally to inspect type issues:
```bash
mypy packages apps
```

### Test Failures
Run Pytest locally:
```bash
pytest tests/unit --cov=packages --cov=apps --cov-report=term-missing
```
