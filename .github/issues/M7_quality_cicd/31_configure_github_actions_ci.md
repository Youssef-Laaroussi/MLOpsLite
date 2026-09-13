# #31 — Configure GitHub Actions CI pipeline for linting, typing, and testing

> **Milestone:** M7 — Quality & CI/CD  
> **Priority:** `P0`  
> **Labels:** `ci/cd` `P0`  

---

## Problem
Without an automated Continuous Integration (CI) pipeline, broken pull requests, lint violations, type errors, and test regressions can be merged into `main`, degrading repository stability.

## Objective
Create GitHub Actions CI workflows in `.github/workflows/` (`lint.yml`, `tests.yml`, `security.yml`) to automatically validate all Pull Requests and branch pushes.

## Proposed solution
Implement multi-stage CI workflows: 1. `lint.yml`: runs Ruff (formatting and linting) and MyPy type checks across Python 3.12; 2. `tests.yml`: runs unit tests and integration tests against service containers (PostgreSQL, MinIO); 3. `security.yml`: scans dependencies using `pip-audit` or Bandit for known CVEs.

## Technical requirements
- GitHub Actions workflow files: `.github/workflows/lint.yml`, `.github/workflows/tests.yml`, `.github/workflows/security.yml`.
- Concurrency control: cancel in-progress runs on new commits to the same PR branch.
- Service containers in `tests.yml`: Postgres 16 and MinIO running natively in GitHub runner.
- Coverage reporting: upload coverage artifacts to Codecov or GitHub Actions summary.
- Fast run times: workflow completes within 5 minutes.

## Acceptance criteria
- Workflows trigger on PRs targeting `main` and pushes to `main`.
- PR cannot be merged if Ruff linting, MyPy type checks, or Pytest tests fail.
- Unit tests execute across Python 3.12 runner.
- Test coverage summary is appended to the PR check output.

## Tests
- Validate workflow YAML syntax using `actionlint`.
- Test triggering workflows on a test branch and inspecting run logs.

## Documentation
- Document CI workflow pipeline in `docs/contributing/ci_cd.md`.
- Explain PR check requirements and troubleshooting failed CI builds.

## Dependencies
Issue #1 (Monorepo), Issue #28 (Unit Tests), Issue #29 (Integration Tests).
