# #1 — Initialize repository structure and monorepo workspace

> **Milestone:** M0 — Project Setup  
> **Priority:** `P0`  
> **Labels:** `setup` `P0`  

---

## Problem
The MLite project currently lacks a formalized, modular repository structure. Without a clean monorepo architecture separating the backend API, worker, CLI, web UI, and shared core libraries, code sharing will lead to circular dependencies, packaging conflicts, and poor developer experience for external open-source contributors.

## Objective
Establish a production-grade Python 3.12+ workspace layout following the Cahier des Charges (Section 21). Configure modern packaging using `pyproject.toml`, establish developer toolchains (Ruff, MyPy, Pre-commit), and provide a standard `Makefile` for developer lifecycle commands.

## Proposed solution
Create a clean monorepo layout divided into `apps/` (api, worker, cli, web) and `packages/` (core, data, tracking, registry, deployment, monitoring, alerting, rollback). Define an editable packaging layout with `pyproject.toml` so that subpackages can be imported seamlessly. Provide developer tasks in a `Makefile` (`make install`, `make lint`, `make test`, `make format`).

## Technical requirements
- Root `pyproject.toml` targeting Python >= 3.12 with setuptools or hatchling backend.
- Directory layout: `apps/api/`, `apps/worker/`, `apps/cli/`, `apps/web/`, `packages/core/`, `packages/data/`, `packages/tracking/`, `packages/registry/`, `packages/deployment/`, `packages/monitoring/`, `packages/alerting/`, `packages/rollback/`.
- Ruff configuration in `pyproject.toml` with line length 100, select rules `E, W, F, I, B, C4, UP`.
- MyPy configuration in `pyproject.toml` with `strict = true` and typed package markers (`py.typed`).
- `Makefile` with targets: `help`, `install`, `lint`, `format`, `test`, `clean`.
- `.editorconfig` for uniform indentation across Python, JSON, YAML, and TypeScript.

## Acceptance criteria
- `pip install -e .` succeeds in a clean Python 3.12 virtual environment (`yzmenv`).
- `make lint` and `make format` run cleanly across all apps and packages.
- All packages in `packages/` are importable from Python without `PYTHONPATH` hacks.
- The directory structure strictly aligns with Section 21 of the technical specifications.

## Tests
- Add `tests/unit/test_project_structure.py` verifying required directory existence and package importability.
- Run `ruff check .` and `mypy packages apps` via `make lint`.

## Documentation
- Update `README.md` with the verified monorepo directory tree.
- Add developer environment setup instructions in `CONTRIBUTING.md` explaining editable installs and `make` commands.

## Dependencies
None (Root setup issue).
