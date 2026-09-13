# #28 — Establish unit test suite with Pytest and 80%+ code coverage

> **Milestone:** M7 — Quality & CI/CD  
> **Priority:** `P0`  
> **Labels:** `testing` `P0`  

---

## Problem
Without a comprehensive unit test suite, refactoring core algorithms (drift calculation, storage clients, Pydantic schemas, CLI commands) risks introducing regressions that break user projects.

## Objective
Build an exhaustive unit test suite in `tests/unit/` using Pytest and pytest-asyncio, achieving over 80% line coverage across `packages/` and `apps/` with fast, isolated mock fixtures.

## Proposed solution
Configure Pytest with plugins (`pytest-cov`, `pytest-asyncio`, `pytest-mock`). Implement unit tests for core utilities, schema validation, CLI command arguments, data profiler, and alert dispatchers using mock S3/PostgreSQL fixtures so tests execute in under 10 seconds without external servers.

## Technical requirements
- Pytest configuration in `pyproject.toml` with `asyncio_mode = 'auto'`.
- Test coverage configuration enforcing `>=80%` minimum coverage threshold.
- Fixtures in `tests/conftest.py`: mock storage client, in-memory SQLite/Postgres DB session, mock MLflow client, mock Docker daemon.
- Fast execution target: full unit test suite runs in under 10 seconds locally.

## Acceptance criteria
- Running `pytest tests/unit` executes without failures or deprecation warnings.
- Total test line coverage reaches >= 80% across all shared packages.
- Tests do not require running external Docker containers or network calls.
- Coverage report is generated in both terminal and XML/HTML format (`htmlcov/`).

## Tests
- Execute `pytest tests/unit --cov=packages --cov=apps --cov-report=term-missing`.
- Verify all edge cases and error branches in core packages.

## Documentation
- Write `docs/contributing/testing.md` explaining fixture usage, mocking guidelines, and coverage requirements.
- Add instructions for running tests with Pytest.

## Dependencies
Issue #1 (Repository Structure), Issue #6 (FastAPI Core).
