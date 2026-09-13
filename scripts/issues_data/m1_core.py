"""Milestone 1: Core MLOps (Issues #7 -> #10)"""

M1_ISSUES = [
    {
        "number": 7,
        "title": "Implement project management API and workspace lifecycle",
        "milestone": "M1 — Core MLOps",
        "milestone_code": "M1_core_mlops",
        "priority": "P0",
        "labels": ["feature", "P0"],
        "filename": "07_implement_project_management_api.md",
        "problem": (
            "MLite operates on discrete Machine Learning projects. Currently, there is no domain model, database table, "
            "or REST endpoint to create, list, retrieve, update, or archive projects, preventing downstream entities "
            "(datasets, experiments, models, deployments) from having a valid parent context."
        ),
        "objective": (
            "Implement complete project management capabilities in `apps/api/routers/projects.py` backed by SQLAlchemy models, "
            "Pydantic v2 schemas, filesystem workspace scaffolding, and YAML configuration validation."
        ),
        "proposed_solution": (
            "Create `Project` SQL entity with unique slug, name, description, git_url, and status. "
            "Expose CRUD endpoints under `/api/v1/projects` with pagination, filtering, and sorting. "
            "Include service logic that validates `mlite.yaml` specifications and manages project root metadata."
        ),
        "technical_requirements": [
            "SQLAlchemy model `Project` in `packages/core/models/project.py` with columns: `id`, `name`, `slug` (unique indexed), `description`, `git_url`, `default_branch`, `config_yaml`, `status` (active/archived), `created_at`, `updated_at`.",
            "Pydantic schemas: `ProjectCreate`, `ProjectUpdate`, `ProjectResponse`, `ProjectListResponse`.",
            "Endpoints: `POST /api/v1/projects`, `GET /api/v1/projects`, `GET /api/v1/projects/{slug_or_id}`, `PATCH /api/v1/projects/{slug_or_id}`, `DELETE /api/v1/projects/{slug_or_id}`.",
            "Validation: regex enforcement on project slug (`^[a-z0-9-_]{3,50}$`), duplicate slug conflict detection (HTTP 409)."
        ],
        "acceptance_criteria": [
            "Creating a project via `POST /api/v1/projects` returns 201 Created with auto-generated UUID and validated slug.",
            "Retrieving `/api/v1/projects` returns paginated list with total count and metadata.",
            "Attempting to create a project with an existing slug returns HTTP 409 Conflict with descriptive message.",
            "Deleting a project marks it as archived without hard-deleting associated historical metrics."
        ],
        "tests": [
            "Unit tests in `tests/unit/api/test_projects.py` testing creation, validation rules, updates, and idempotency.",
            "Integration test verifying PostgreSQL cascade constraints and pagination queries."
        ],
        "documentation": [
            "Document Project REST API specifications in `docs/api/projects.md` with request/response JSON samples.",
            "Provide Python client snippets for creating and fetching projects."
        ],
        "dependencies": "Issue #3 (PostgreSQL), Issue #6 (FastAPI application)."
    },
    {
        "number": 8,
        "title": "Implement MLite CLI developer experience with Typer and Rich",
        "milestone": "M1 — Core MLOps",
        "milestone_code": "M1_core_mlops",
        "priority": "P0",
        "labels": ["cli", "P0"],
        "filename": "08_implement_mlite_cli.md",
        "problem": (
            "Data scientists and engineers prefer running their workflow directly from the command line. "
            "Without a unified CLI, users would be forced to make manual HTTP requests or write custom boilerplate scripts "
            "to initialize projects, inspect status, or interact with MLite services."
        ),
        "objective": (
            "Build the `mlite` command-line tool in `apps/cli` using Typer and Rich, supporting `mlite init`, "
            "`mlite config`, and `mlite status`, with formatted console tables, shell autocompletion, and error resilience."
        ),
        "proposed_solution": (
            "Structure the CLI using Typer's subcommands hierarchy. Implement an HTTP API client communicating with "
            "the MLite backend (defaulting to `http://localhost:8000`). Store local CLI configuration in `.mlite/config.json`. "
            "Generate standard project directory scaffolds on `mlite init`."
        ),
        "technical_requirements": [
            "Typer >= 0.12.0 with Rich formatting (panels, spinners, tables).",
            "Command `mlite init <project-name>`: prompts for optional Git repo and description, creates directory structure (`data/`, `src/`, `models/`, `tests/`), and writes default `mlite.yaml`.",
            "Command `mlite config [view|set|get]`: inspects and modifies active API URL and default settings.",
            "Command `mlite status`: pings MLite API, MLflow, MinIO, and PostgreSQL and prints an operational health table.",
            "Entry point registered in `pyproject.toml` (`[project.scripts] mlite = 'mlite_cli.main:app'`)."
        ],
        "acceptance_criteria": [
            "`mlite --help` displays clean, categorized help text with subcommands.",
            "Executing `mlite init demo-project` builds the expected folder structure and valid `mlite.yaml`.",
            "`mlite status` clearly displays color-coded ONLINE / OFFLINE statuses for each MLite component.",
            "Graceful handling of connection errors when the backend API is unreachable."
        ],
        "tests": [
            "CLI runner tests using Typer `CliRunner` in `tests/unit/cli/test_commands.py`.",
            "Test directory creation and `mlite.yaml` structure upon running `init`."
        ],
        "documentation": [
            "Write `docs/cli/overview.md` with CLI installation guide (`pip install -e apps/cli`).",
            "Create `docs/cli/commands.md` documenting all available flags and environment variables."
        ],
        "dependencies": "Issue #6 (FastAPI), Issue #7 (Project API)."
    },
    {
        "number": 9,
        "title": "Implement experiment tracking engine and training run runner",
        "milestone": "M1 — Core MLOps",
        "milestone_code": "M1_core_mlops",
        "priority": "P0",
        "labels": ["mlflow", "P0"],
        "filename": "09_implement_experiment_tracking.md",
        "problem": (
            "Training runs are frequently unrepeatable because hyperparameters, code versions (git commit), "
            "dataset hashes, and metrics are not captured automatically. While MLflow exists, users still need manual "
            "integration code in every script to attach project context."
        ),
        "objective": (
            "Build `packages/tracking` and CLI command `mlite experiment run` to automatically instrument ML training runs, "
            "capturing git SHAs, dataset versions, parameters, metrics, artifacts, and training duration into MLflow and MLite API."
        ),
        "proposed_solution": (
            "Implement a high-level Python tracking wrapper `mlite.track` (context manager & decorator) and a CLI executor "
            "`mlite experiment run <script.py>`. The executor sets the `MLFLOW_TRACKING_URI`, registers the run under the active "
            "MLite project, inspects git state, and logs environment metadata."
        ),
        "technical_requirements": [
            "`packages/tracking/tracker.py`: Context manager `with mlite.start_run() as run:` wrapping `mlflow.start_run`.",
            "Automatic metadata collection: Git commit hash, git dirty status, Python version, OS platform, execution start/end time.",
            "Methods: `log_param(key, value)`, `log_metric(key, value, step=None)`, `log_metrics(dict)`, `log_artifact(local_path)`.",
            "CLI commands: `mlite experiment run <script>` and `mlite experiment list --project <name>`.",
            "API endpoints in `apps/api/routers/experiments.py` proxying and indexing MLflow experiment metadata."
        ],
        "acceptance_criteria": [
            "Running `mlite experiment run src/train.py` executes user training and attaches run to the project in MLflow.",
            "Logged parameters and metrics appear both in MLflow tracking server and MLite API.",
            "Artifacts (weights, plots, checkpoints) are uploaded to MinIO under `s3://mlflow-artifacts/<run_id>/`.",
            "`mlite experiment list` prints a formatted table of recent runs, metrics, and git commits."
        ],
        "tests": [
            "Integration test `tests/integration/test_experiment_tracking.py` executing a dummy Scikit-Learn script and asserting logged metrics.",
            "Unit tests for metadata extraction (Git SHA, dirty tree detection)."
        ],
        "documentation": [
            "Write `docs/experiments/tracking.md` demonstrating Python SDK and CLI tracking workflows.",
            "Provide sample Scikit-learn training script with MLite tracking."
        ],
        "dependencies": "Issue #4 (MLflow), Issue #7 (Project API), Issue #8 (CLI)."
    },
    {
        "number": 10,
        "title": "Implement centralized model registry with staging and promotion",
        "milestone": "M1 — Core MLOps",
        "milestone_code": "M1_core_mlops",
        "priority": "P0",
        "labels": ["registry", "P0"],
        "filename": "10_implement_model_registry.md",
        "problem": (
            "Data teams lack a formal governance process to designate which trained model artifact is candidate, staging, "
            "or production. Without an automated model registry, teams deploy models based on fragile file paths or ad-hoc naming conventions."
        ),
        "objective": (
            "Build the MLite Model Registry in `packages/registry` and `apps/api/routers/models.py`, managing model versions, "
            "stage transitions (`Development` → `Candidate` → `Staging` → `Production` → `Archived`), and metric comparisons."
        ),
        "proposed_solution": (
            "Integrate MLflow Model Registry with MLite database metadata. Store model lineage, evaluation scores, "
            "and active stage in PostgreSQL. Provide CLI commands `mlite model register`, `mlite model list`, "
            "`mlite model compare`, and `mlite model promote`."
        ),
        "technical_requirements": [
            "PostgreSQL entity `RegisteredModel` and `ModelVersion` linking MLflow model names to MLite projects.",
            "Stage enum: `DEVELOPMENT`, `CANDIDATE`, `STAGING`, `PRODUCTION`, `ARCHIVED`.",
            "Automatic demotion rule: Promoting a model version to `PRODUCTION` automatically demotes the previous production version to `ARCHIVED` (or `STAGING`).",
            "Endpoints: `POST /api/v1/models/register`, `GET /api/v1/models`, `GET /api/v1/models/{name}/versions`, `POST /api/v1/models/{name}/versions/{v}/promote`, `GET /api/v1/models/compare`.",
            "CLI commands: `mlite model list`, `mlite model promote <name> --version <v> --stage <stage>`."
        ],
        "acceptance_criteria": [
            "Models can be registered directly from an MLflow `run_id`.",
            "Stage promotion cleanly transitions version status and logs promotion audit record.",
            "`mlite model compare v1 v2` outputs a side-by-side terminal comparison of accuracy, precision, recall, and F1.",
            "Only one model version per project can hold the active `PRODUCTION` stage simultaneously."
        ],
        "tests": [
            "Unit tests in `tests/unit/test_model_registry.py` testing stage transitions and exclusivity constraints.",
            "Integration tests verifying synchronization between MLite DB and MLflow Model Registry."
        ],
        "documentation": [
            "Write `docs/models/registry.md` detailing lifecycle stages, promotion criteria, and rollback preparation.",
            "Add CLI examples for registering and promoting candidate models."
        ],
        "dependencies": "Issue #4 (MLflow), Issue #7 (Project API), Issue #9 (Experiment Tracking)."
    }
]
