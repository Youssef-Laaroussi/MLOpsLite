# #8 — Implement MLite CLI developer experience with Typer and Rich

> **Milestone:** M1 — Core MLOps  
> **Priority:** `P0`  
> **Labels:** `cli` `P0`  

---

## Problem
Data scientists and engineers prefer running their workflow directly from the command line. Without a unified CLI, users would be forced to make manual HTTP requests or write custom boilerplate scripts to initialize projects, inspect status, or interact with MLite services.

## Objective
Build the `mlite` command-line tool in `apps/cli` using Typer and Rich, supporting `mlite init`, `mlite config`, and `mlite status`, with formatted console tables, shell autocompletion, and error resilience.

## Proposed solution
Structure the CLI using Typer's subcommands hierarchy. Implement an HTTP API client communicating with the MLite backend (defaulting to `http://localhost:8000`). Store local CLI configuration in `.mlite/config.json`. Generate standard project directory scaffolds on `mlite init`.

## Technical requirements
- Typer >= 0.12.0 with Rich formatting (panels, spinners, tables).
- Command `mlite init <project-name>`: prompts for optional Git repo and description, creates directory structure (`data/`, `src/`, `models/`, `tests/`), and writes default `mlite.yaml`.
- Command `mlite config [view|set|get]`: inspects and modifies active API URL and default settings.
- Command `mlite status`: pings MLite API, MLflow, MinIO, and PostgreSQL and prints an operational health table.
- Entry point registered in `pyproject.toml` (`[project.scripts] mlite = 'mlite_cli.main:app'`).

## Acceptance criteria
- `mlite --help` displays clean, categorized help text with subcommands.
- Executing `mlite init demo-project` builds the expected folder structure and valid `mlite.yaml`.
- `mlite status` clearly displays color-coded ONLINE / OFFLINE statuses for each MLite component.
- Graceful handling of connection errors when the backend API is unreachable.

## Tests
- CLI runner tests using Typer `CliRunner` in `tests/unit/cli/test_commands.py`.
- Test directory creation and `mlite.yaml` structure upon running `init`.

## Documentation
- Write `docs/cli/overview.md` with CLI installation guide (`pip install -e apps/cli`).
- Create `docs/cli/commands.md` documenting all available flags and environment variables.

## Dependencies
Issue #6 (FastAPI), Issue #7 (Project API).
