"""Milestone 7: Quality & CI/CD (Issues #28 -> #32)"""

M7_ISSUES = [
    {
        "number": 28,
        "title": "Establish unit test suite with Pytest and 80%+ code coverage",
        "milestone": "M7 — Quality & CI/CD",
        "milestone_code": "M7_quality_cicd",
        "priority": "P0",
        "labels": ["testing", "P0"],
        "filename": "28_add_unit_tests.md",
        "problem": (
            "Without a comprehensive unit test suite, refactoring core algorithms (drift calculation, storage clients, "
            "Pydantic schemas, CLI commands) risks introducing regressions that break user projects."
        ),
        "objective": (
            "Build an exhaustive unit test suite in `tests/unit/` using Pytest and pytest-asyncio, achieving over 80% "
            "line coverage across `packages/` and `apps/` with fast, isolated mock fixtures."
        ),
        "proposed_solution": (
            "Configure Pytest with plugins (`pytest-cov`, `pytest-asyncio`, `pytest-mock`). "
            "Implement unit tests for core utilities, schema validation, CLI command arguments, data profiler, "
            "and alert dispatchers using mock S3/PostgreSQL fixtures so tests execute in under 10 seconds without external servers."
        ),
        "technical_requirements": [
            "Pytest configuration in `pyproject.toml` with `asyncio_mode = 'auto'`.",
            "Test coverage configuration enforcing `>=80%` minimum coverage threshold.",
            "Fixtures in `tests/conftest.py`: mock storage client, in-memory SQLite/Postgres DB session, mock MLflow client, mock Docker daemon.",
            "Fast execution target: full unit test suite runs in under 10 seconds locally."
        ],
        "acceptance_criteria": [
            "Running `pytest tests/unit` executes without failures or deprecation warnings.",
            "Total test line coverage reaches >= 80% across all shared packages.",
            "Tests do not require running external Docker containers or network calls.",
            "Coverage report is generated in both terminal and XML/HTML format (`htmlcov/`)."
        ],
        "tests": [
            "Execute `pytest tests/unit --cov=packages --cov=apps --cov-report=term-missing`.",
            "Verify all edge cases and error branches in core packages."
        ],
        "documentation": [
            "Write `docs/contributing/testing.md` explaining fixture usage, mocking guidelines, and coverage requirements.",
            "Add instructions for running tests with Pytest."
        ],
        "dependencies": "Issue #1 (Repository Structure), Issue #6 (FastAPI Core)."
    },
    {
        "number": 29,
        "title": "Add integration test suite for PostgreSQL, MLflow, and MinIO",
        "milestone": "M7 — Quality & CI/CD",
        "milestone_code": "M7_quality_cicd",
        "priority": "P1",
        "labels": ["testing", "P1"],
        "filename": "29_add_integration_tests.md",
        "problem": (
            "Unit tests mock external dependencies, which means connection pool exhaustion, SQL schema discrepancies, "
            "MLflow tracking API mismatches, or S3 permission issues will only surface in production."
        ),
        "objective": (
            "Build an automated integration test suite in `tests/integration/` that executes real end-to-end interactions "
            "against real PostgreSQL, MLflow, and MinIO instances spun up via Testcontainers or Docker Compose."
        ),
        "proposed_solution": (
            "Implement integration fixtures that connect to live local test services. "
            "Validate: 1) SQLAlchemy async queries & migrations on PostgreSQL; 2) Tracking run logging and artifact uploads to MLflow & MinIO; "
            "3) Presigned URL generation and binary retrieval from MinIO; 4) Model registry stage transitions."
        ),
        "technical_requirements": [
            "Test environment configuration pointing to test databases (`mlite_test_db`) and test buckets.",
            "Automated setup/teardown hooks creating and cleaning test database tables per test session.",
            "Integration test modules: `test_db_integration.py`, `test_mlflow_integration.py`, `test_minio_integration.py`, `test_api_integration.py`.",
            "Docker-based runner: can execute inside CI using test service containers."
        ],
        "acceptance_criteria": [
            "`pytest tests/integration` passes 100% against running Docker Compose services.",
            "Verifies real binary file upload, retrieval, and SHA-256 verification against MinIO.",
            "Verifies real MLflow experiment tracking and SQL query performance.",
            "Clean teardown: leaves no lingering test records or orphan buckets."
        ],
        "tests": [
            "Execute `pytest tests/integration` against active `docker compose` instance.",
            "Validate database rollback between test cases using transaction isolation."
        ],
        "documentation": [
            "Document integration test runner instructions in `docs/contributing/integration_tests.md`.",
            "Include Docker compose test profile instructions."
        ],
        "dependencies": "Issue #2 (Docker Compose), Issue #3 (PostgreSQL), Issue #4 (MLflow), Issue #5 (MinIO)."
    },
    {
        "number": 30,
        "title": "Add End-to-End (E2E) complete ML lifecycle automated tests",
        "milestone": "M7 — Quality & CI/CD",
        "milestone_code": "M7_quality_cicd",
        "priority": "P1",
        "labels": ["testing", "P1"],
        "filename": "30_add_end_to_end_tests.md",
        "problem": (
            "While individual units and components may pass tests, the complete end-to-end developer journey "
            "(Project Init → Data Version → Experiment → Model Register → Deploy → Predict → Drift → Rollback) "
            "must be verified continuously to ensure the platform delivers on its unified promise."
        ),
        "objective": (
            "Implement a fully automated End-to-End (E2E) workflow test in `tests/e2e/test_full_lifecycle.py` that executes "
            "the complete 11-step MLite user journey via the CLI and REST API."
        ),
        "proposed_solution": (
            "Author an automated E2E test scenario: "
            "1. `mlite init test-project` initializes workspace; "
            "2. `mlite data add` registers training dataset; "
            "3. `mlite experiment run` trains a Scikit-Learn model; "
            "4. `mlite model promote` promotes to production; "
            "5. `mlite deploy` spins up the REST endpoint; "
            "6. Send inference requests to `/predict`; "
            "7. Send shifted data to trigger high drift alert; "
            "8. Deploy candidate v2 with poor performance; "
            "9. Execute `mlite rollback` restoring v1; "
            "10. Verify production endpoint returns v1 predictions."
        ),
        "technical_requirements": [
            "Autonomous E2E test script using Python `subprocess` / Typer `CliRunner` and `httpx`.",
            "Clean workspace creation in a temporary directory (`tmp_path`).",
            "Timeout protection for container deployment and teardown (max 120 seconds per run).",
            "Verification assertions at every lifecycle stage."
        ],
        "acceptance_criteria": [
            "Complete lifecycle test executes and succeeds from start to finish.",
            "Deployed container starts, serves predictions, responds to health probes, and terminates cleanly.",
            "Drift is detected and logged during the test run.",
            "Rollback successfully redirects traffic to the previous version with 200 OK responses."
        ],
        "tests": [
            "Run `pytest tests/e2e/test_full_lifecycle.py` in an environment with Docker daemon access.",
            "Assert zero leftover orphan Docker containers after test completion."
        ],
        "documentation": [
            "Create `docs/contributing/e2e_testing.md` detailing the full lifecycle test scenario and prerequisites.",
            "Add diagrams of the E2E verification loop."
        ],
        "dependencies": "Issue #8 (CLI), Issue #9 (Tracking), Issue #10 (Registry), Issue #11 (Deployment), Issue #19 (Drift), Issue #23 (Rollback)."
    },
    {
        "number": 31,
        "title": "Configure GitHub Actions CI pipeline for linting, typing, and testing",
        "milestone": "M7 — Quality & CI/CD",
        "milestone_code": "M7_quality_cicd",
        "priority": "P0",
        "labels": ["ci/cd", "P0"],
        "filename": "31_configure_github_actions_ci.md",
        "problem": (
            "Without an automated Continuous Integration (CI) pipeline, broken pull requests, lint violations, "
            "type errors, and test regressions can be merged into `main`, degrading repository stability."
        ),
        "objective": (
            "Create GitHub Actions CI workflows in `.github/workflows/` (`lint.yml`, `tests.yml`, `security.yml`) "
            "to automatically validate all Pull Requests and branch pushes."
        ),
        "proposed_solution": (
            "Implement multi-stage CI workflows: "
            "1. `lint.yml`: runs Ruff (formatting and linting) and MyPy type checks across Python 3.12; "
            "2. `tests.yml`: runs unit tests and integration tests against service containers (PostgreSQL, MinIO); "
            "3. `security.yml`: scans dependencies using `pip-audit` or Bandit for known CVEs."
        ),
        "technical_requirements": [
            "GitHub Actions workflow files: `.github/workflows/lint.yml`, `.github/workflows/tests.yml`, `.github/workflows/security.yml`.",
            "Concurrency control: cancel in-progress runs on new commits to the same PR branch.",
            "Service containers in `tests.yml`: Postgres 16 and MinIO running natively in GitHub runner.",
            "Coverage reporting: upload coverage artifacts to Codecov or GitHub Actions summary.",
            "Fast run times: workflow completes within 5 minutes."
        ],
        "acceptance_criteria": [
            "Workflows trigger on PRs targeting `main` and pushes to `main`.",
            "PR cannot be merged if Ruff linting, MyPy type checks, or Pytest tests fail.",
            "Unit tests execute across Python 3.12 runner.",
            "Test coverage summary is appended to the PR check output."
        ],
        "tests": [
            "Validate workflow YAML syntax using `actionlint`.",
            "Test triggering workflows on a test branch and inspecting run logs."
        ],
        "documentation": [
            "Document CI workflow pipeline in `docs/contributing/ci_cd.md`.",
            "Explain PR check requirements and troubleshooting failed CI builds."
        ],
        "dependencies": "Issue #1 (Monorepo), Issue #28 (Unit Tests), Issue #29 (Integration Tests)."
    },
    {
        "number": 32,
        "title": "Add automated Docker image build and publishing pipeline",
        "milestone": "M7 — Quality & CI/CD",
        "milestone_code": "M7_quality_cicd",
        "priority": "P1",
        "labels": ["ci/cd", "P1"],
        "filename": "32_add_docker_image_publishing.md",
        "problem": (
            "Users should not have to build Docker images from source when running `docker compose up -d`. "
            "Pre-built, optimized, multi-arch Docker images must be published to GitHub Container Registry (GHCR) "
            "or Docker Hub for fast downloads."
        ),
        "objective": (
            "Implement an automated GitHub Actions release workflow (`.github/workflows/docker-publish.yml`) "
            "that builds and publishes multi-architecture (`linux/amd64`, `linux/arm64`) Docker images for `mlite-api`, "
            "`mlite-ui`, and `mlite-serving`."
        ),
        "proposed_solution": (
            "Configure Docker Buildx and QEMU in GitHub Actions. Tag images with Git commit SHA, branch name, "
            "and SemVer tags (`v0.1.0`, `latest`). Push images to GitHub Container Registry (`ghcr.io/youssef-laaroussi/mlops-lite/...`)."
        ),
        "technical_requirements": [
            "Workflow `.github/workflows/docker-publish.yml` triggered on Git tags (`v*`) and pushes to `main`.",
            "Docker Buildx for multi-platform builds (`linux/amd64`, `linux/arm64` supporting Apple Silicon and cloud VPSs).",
            "Layer caching using GitHub Actions cache (`type=gha`) for fast incremental builds.",
            "Minimal final image footprint using multi-stage builds and non-root user execution (`USER mlite`)."
        ],
        "acceptance_criteria": [
            "Tagging a release triggers automated builds of all 3 images without manual intervention.",
            "Multi-arch manifests for `linux/amd64` and `linux/arm64` are published to GHCR.",
            "Images pass container vulnerability scans (`trivy` or Docker Scout) with zero CRITICAL CVEs.",
            "`docker compose` can pull pre-built images directly."
        ],
        "tests": [
            "Run local multi-arch build validation via `docker buildx build --platform linux/amd64,linux/arm64 -t mlite-test .`.",
            "Verify image startup and healthcheck in an isolated environment."
        ],
        "documentation": [
            "Write `docs/deployment/docker_images.md` documenting published image tags, security policies, and GHCR pulling instructions.",
            "Update `docker-compose.yml` with pre-built image references."
        ],
        "dependencies": "Issue #2 (Docker Compose), Issue #31 (CI Pipeline)."
    }
]
