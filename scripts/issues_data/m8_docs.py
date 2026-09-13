"""Milestone 8: Documentation & Examples (Issues #33 -> #38)"""

M8_ISSUES = [
    {
        "number": 33,
        "title": "Write comprehensive installation and zero-to-hero onboarding guide",
        "milestone": "M8 — Documentation & Examples",
        "milestone_code": "M8_docs_examples",
        "priority": "P0",
        "labels": ["docs", "P0"],
        "filename": "33_write_installation_documentation.md",
        "problem": (
            "An open-source platform's adoption depends on its first 15-minute experience. "
            "If installation instructions are ambiguous, missing hardware requirements, or assume implicit cloud setup, "
            "potential users will abandon the tool."
        ),
        "objective": (
            "Author a comprehensive, beginner-friendly installation and quickstart guide in `docs/getting-started/` "
            "covering Docker Compose setup, host system prerequisites, initial verification, and troubleshooting."
        ),
        "proposed_solution": (
            "Create structured documentation using MkDocs Material: "
            "`docs/getting-started/installation.md`, `prerequisites.md`, `quickstart.md`, and `troubleshooting.md`. "
            "Provide step-by-step instructions for Ubuntu/Debian, macOS, Windows (WSL2), and low-cost VPS instances (e.g. Hetzner, DigitalOcean)."
        ),
        "technical_requirements": [
            "Hardware & software prerequisites: minimum 4GB RAM, 2 CPU cores, Docker 24+, Compose v2, Python 3.12+.",
            "Copy-pasteable setup commands verified on clean environments.",
            "Verification checklist: how to confirm PostgreSQL, MinIO, MLflow, and API are running.",
            "Comprehensive troubleshooting matrix: common port conflicts (5432, 8000, 5000), permission errors, Docker socket access.",
            "MkDocs site configuration with search, code highlighting, and version selector."
        ],
        "acceptance_criteria": [
            "A user with a clean Linux or macOS machine can get MLite running in under 5 minutes following the guide.",
            "Every command in the documentation is verified and reproducible without undocumented steps.",
            "`mkdocs build` generates zero broken links or markdown syntax warnings.",
            "Includes dedicated section for headless VPS setup without desktop browsers."
        ],
        "tests": [
            "Run automated doc link checker (`markdown-link-check` or `mkdocs build --strict`).",
            "Perform clean-room test by executing instructions in a fresh Docker container or VM."
        ],
        "documentation": [
            "`docs/getting-started/installation.md`.",
            "`docs/getting-started/quickstart.md`.",
            "`docs/getting-started/troubleshooting.md`."
        ],
        "dependencies": "Issue #2 (Docker Compose), Issue #8 (CLI)."
    },
    {
        "number": 34,
        "title": "Write complete CLI command reference and shell autocompletion guide",
        "milestone": "M8 — Documentation & Examples",
        "milestone_code": "M8_docs_examples",
        "priority": "P1",
        "labels": ["docs", "P1"],
        "filename": "34_write_cli_documentation.md",
        "problem": (
            "Users need an exhaustive reference document describing every CLI subcommand, flag, argument, "
            "environment variable override, and exit code to use MLite effectively in automated shell scripts and daily workflows."
        ),
        "objective": (
            "Create an exhaustive CLI reference manual in `docs/cli/` documenting all 11 planned command groups "
            "(`init`, `config`, `status`, `data`, `experiment`, `model`, `deploy`, `monitor`, `alert`, `rollback`, `logs`)."
        ),
        "proposed_solution": (
            "Generate markdown reference pages for all Typer commands with usage syntax, argument descriptions, "
            "flag tables, practical examples, and expected stdout outputs. Include instructions for enabling bash/zsh/fish autocompletion."
        ),
        "technical_requirements": [
            "Command documentation pages: `mlite init`, `mlite data`, `mlite experiment`, `mlite model`, `mlite deploy`, `mlite monitor`, `mlite alert`, `mlite rollback`.",
            "Every command page includes: Synopsis, Options, Output format, Examples, Exit codes.",
            "Shell completion instructions for Bash (`eval \"$(_MLITE_COMPLETE=bash_source mlite)\"`), Zsh, and Fish.",
            "Automated sync: script or test checking that CLI help text matches documentation."
        ],
        "acceptance_criteria": [
            "All CLI commands and subcommands have full documentation with real usage examples.",
            "Autocompletion installation instructions work on standard Linux and macOS shells.",
            "Exit codes are clearly defined (0 = success, 1 = error, 2 = validation error, 130 = user aborted).",
            "Documentation is indexed in MkDocs navigation."
        ],
        "tests": [
            "Verify all CLI documentation code snippets by running automated markdown code block tests.",
            "Validate documentation against `mlite --help` output."
        ],
        "documentation": [
            "`docs/cli/overview.md`.",
            "`docs/cli/commands.md`.",
            "`docs/cli/autocompletion.md`."
        ],
        "dependencies": "Issue #8 (CLI Implementation)."
    },
    {
        "number": 35,
        "title": "Write REST API reference with OpenAPI interactive documentation",
        "milestone": "M8 — Documentation & Examples",
        "milestone_code": "M8_docs_examples",
        "priority": "P1",
        "labels": ["docs", "P1"],
        "filename": "35_write_api_documentation.md",
        "problem": (
            "Developers integrating MLite with external CI/CD systems, custom frontend apps, or internal tools "
            "need a formal, detailed REST API reference explaining request/response envelopes, authentication, and HTTP status codes."
        ),
        "objective": (
            "Publish complete REST API documentation in `docs/api/`, integrate Swagger/Redoc interactive schemas, "
            "and provide curl, Python, and TypeScript client examples for all endpoints."
        ),
        "proposed_solution": (
            "Document all API resource groups: Projects, Datasets, Experiments, Models, Deployments, Monitoring, Alerts, "
            "and Audit Logs. Export the OpenAPI JSON schema and embed interactive documentation in MkDocs. "
            "Document authentication headers, error formats, and rate limiting."
        ),
        "technical_requirements": [
            "Resource documentation: `/api/v1/projects`, `/api/v1/datasets`, `/api/v1/models`, `/api/v1/deployments`, `/api/v1/monitoring`, `/api/v1/alerts`.",
            "Interactive Swagger UI at `/docs` and Redoc at `/redoc`.",
            "JSON payload schemas documented for all request bodies and query parameters.",
            "Standard error responses documented with HTTP status codes: 400, 401, 403, 404, 409, 422, 500."
        ],
        "acceptance_criteria": [
            "All endpoints are documented with sample requests (curl, Python) and actual response JSON.",
            "OpenAPI schema validates without errors or missing docstrings in FastAPI route functions.",
            "Authentication flow (Bearer token and X-API-Key) is clearly explained with examples."
        ],
        "tests": [
            "Test OpenAPI schema generation and validate against OpenAPI 3.1 specification via schema validator.",
            "Verify that route changes trigger doc updates via CI test."
        ],
        "documentation": [
            "`docs/api/overview.md`.",
            "`docs/api/endpoints/` (individual resource markdown files).",
            "`docs/api/errors.md`."
        ],
        "dependencies": "Issue #6 (FastAPI Core), Issue #7 (Project API)."
    },
    {
        "number": 36,
        "title": "Create end-to-end Iris classification starter example",
        "milestone": "M8 — Documentation & Examples",
        "milestone_code": "M8_docs_examples",
        "priority": "P1",
        "labels": ["example", "P1"],
        "filename": "36_create_iris_example.md",
        "problem": (
            "Users need an instant, lightweight tutorial that runs in under 2 minutes without downloading large datasets "
            "or training heavy deep learning models, allowing them to verify their local MLite installation immediately."
        ),
        "objective": (
            "Build a complete, standalone Iris classification example in `examples/iris/` walking through the complete lifecycle: "
            "`mlite init`, data registration, training with Scikit-learn, MLflow logging, model promotion, and Docker deployment."
        ),
        "proposed_solution": (
            "Create a clean example repository directory with `mlite.yaml`, `src/train.py`, `data/iris.csv`, and a step-by-step `README.md`. "
            "The training script trains a LogisticRegression / DecisionTreeClassifier, logs accuracy/precision to MLflow, "
            "registers `iris-classifier:v1`, and provides a test curl script for the deployed endpoint."
        ),
        "technical_requirements": [
            "Directory `examples/iris/`: contains `README.md`, `mlite.yaml`, `requirements.txt`, `src/train.py`, `test_predict.sh`.",
            "Execution time: complete training and registration finishes in < 5 seconds on any machine.",
            "Demonstrates: dataset registration, MLflow metric logging, model registry promotion, and inference query via curl.",
            "Zero GPU or external network download requirements."
        ],
        "acceptance_criteria": [
            "A developer can clone the example, run `mlite experiment run src/train.py`, and see metrics in MLflow immediately.",
            "Deploying the model via `mlite deploy iris-classifier --version 1` exposes a working REST endpoint.",
            "`test_predict.sh` sends sample flowers and receives expected species predictions with 200 OK.",
            "Example README is clear, concise, and tested end-to-end."
        ],
        "tests": [
            "Include `examples/iris/` in automated integration tests to ensure future code changes don't break the tutorial.",
            "Assert valid inference response from deployed container."
        ],
        "documentation": [
            "`examples/iris/README.md`.",
            "`docs/getting-started/quickstart.md` linking directly to this example."
        ],
        "dependencies": "Issue #8 (CLI), Issue #9 (Tracking), Issue #10 (Registry), Issue #11 (Deployment)."
    },
    {
        "number": 37,
        "title": "Create production fraud detection example with drift and rollback",
        "milestone": "M8 — Documentation & Examples",
        "milestone_code": "M8_docs_examples",
        "priority": "P1",
        "labels": ["example", "P1"],
        "filename": "37_create_fraud_detection_example.md",
        "problem": (
            "To understand the true value of MLite's advanced capabilities (Evidently drift detection, alerts, auto-rollback), "
            "users need a realistic production scenario where data shifts and models degrade in real time."
        ),
        "objective": (
            "Build a production-grade Fraud Detection example in `examples/fraud-detection/` demonstrating synthetic data drift, "
            "accuracy degradation, alert dispatch, and controlled rollback from v2 back to stable v1."
        ),
        "proposed_solution": (
            "Create a comprehensive scenario: "
            "1. Train stable model v1 on baseline credit card transactions; "
            "2. Deploy v1 to production; "
            "3. Simulate normal incoming transactions (drift remains LOW); "
            "4. Train and deploy candidate model v2; "
            "5. Inject shifted transaction data (international transactions surge, drift spikes to HIGH, accuracy drops); "
            "6. MLite alert triggers; "
            "7. Execute `mlite rollback fraud-detector --to 1` to restore stability."
        ),
        "technical_requirements": [
            "Directory `examples/fraud-detection/` with training scripts, dataset generators, and simulation runner `simulate_traffic.py`.",
            "Realistic tabular dataset (imbalanced classification: transactions, amounts, countries, fraud labels).",
            "Automated drift simulation injecting distribution shifts into numerical and categorical features.",
            "Demonstrates complete loop: Drift Detection → Alerting → Webhook Dispatch → Rollback Execution."
        ],
        "acceptance_criteria": [
            "Running the simulation clearly triggers a HIGH data drift alert with affected feature list in the CLI and UI.",
            "Degradation triggers rollback recommendation in the terminal.",
            "Executing `mlite rollback` restores production accuracy without service downtime.",
            "All steps are documented with terminal screenshots and command outputs in the tutorial README."
        ],
        "tests": [
            "Automated test running the fraud detection scenario in CI and asserting drift detection and rollback success.",
            "Verify statistical calculations on synthetic transaction distribution."
        ],
        "documentation": [
            "`examples/fraud-detection/README.md` with complete walkthrough and architecture explanation.",
            "`docs/tutorials/fraud_detection.md`."
        ],
        "dependencies": "Issue #18 (Evidently), Issue #19 (Drift), Issue #21 (Alerts), Issue #23 (Rollback)."
    },
    {
        "number": 38,
        "title": "Create demand forecasting example with time-series evaluation",
        "milestone": "M8 — Documentation & Examples",
        "milestone_code": "M8_docs_examples",
        "priority": "P2",
        "labels": ["example", "P2"],
        "filename": "38_create_demand_forecasting_example.md",
        "problem": (
            "ML teams often work with regression and time-series forecasting models (sales demand, inventory prediction, energy consumption), "
            "which have different evaluation metrics (MAE, RMSE, MAPE) and continuous drift characteristics than classification models."
        ),
        "objective": (
            "Build a Demand Forecasting example in `examples/demand-forecasting/` demonstrating time-series data versioning, "
            "regression experiment tracking, scheduled model re-training, and continuous error monitoring."
        ),
        "proposed_solution": (
            "Implement a retail sales demand forecasting project using LightGBM or Scikit-learn RandomForestRegressor. "
            "Track RMSE/MAE metrics in MLflow, deploy the forecasting endpoint, log predicted demand versus delayed actual sales, "
            "and compute rolling error metrics."
        ),
        "technical_requirements": [
            "Directory `examples/demand-forecasting/` with `src/train.py`, `src/simulate_sales.py`, and `mlite.yaml`.",
            "Time-series feature engineering: lag features, rolling statistics, calendar seasonality.",
            "Regression evaluation metrics: MAE, MSE, RMSE, R-squared, MAPE.",
            "Delayed ground-truth feedback ingestion demonstrating `POST /api/v1/deployments/{id}/feedback`."
        ],
        "acceptance_criteria": [
            "Forecasting model logs regression metrics to MLflow and registers model versions.",
            "Inference endpoint serves batch predictions for store-item demand forecasts.",
            "Delayed ground-truth sales records update rolling RMSE metrics in the MLite monitoring dashboard.",
            "Includes clear guide on setting regression metric degradation thresholds."
        ],
        "tests": [
            "Unit test for regression metric calculation and time-series lag feature validation.",
            "Integration test verifying ground-truth feedback matching for time-series predictions."
        ],
        "documentation": [
            "`examples/demand-forecasting/README.md`.",
            "`docs/tutorials/demand_forecasting.md`."
        ],
        "dependencies": "Issue #9 (Tracking), Issue #11 (Deployment), Issue #20 (Model Monitoring)."
    }
]
