"""Milestone 3: Dashboard & Data (Issues #14 -> #16)"""

M3_ISSUES = [
    {
        "number": 14,
        "title": "Build unified React dashboard with Vite, TypeScript, and Tailwind CSS",
        "milestone": "M3 — Dashboard",
        "milestone_code": "M3_dashboard",
        "priority": "P1",
        "labels": ["frontend", "P1"],
        "filename": "14_build_react_dashboard.md",
        "problem": (
            "Currently, users must rely exclusively on the terminal or browse disjointed raw tools (MLflow UI, MinIO Console). "
            "There is no unified, cohesive web portal providing an at-a-glance overview of projects, active deployments, "
            "model registry stages, drift alerts, and system health."
        ),
        "objective": (
            "Develop a sleek, modern, self-hosted web dashboard in `apps/web` using React 18, Vite, TypeScript, "
            "and Tailwind CSS, delivering a unified single-pane-of-glass interface for MLite."
        ),
        "proposed_solution": (
            "Scaffold `apps/web` with Vite, TypeScript, and Tailwind CSS. Implement views matching the specification (Section 12): "
            "Dashboard Home (System summary, production model health, quick actions), Projects, Datasets, Experiments, Models, "
            "Deployments, Monitoring, and Alerts. Connect to the FastAPI backend using TanStack Query (React Query) and Axios."
        ),
        "technical_requirements": [
            "React 18 + TypeScript + Vite + Tailwind CSS.",
            "Component library: Lucide React icons, Headless UI / Radix primitives, Recharts for data and drift visualization.",
            "Client API layer: TanStack Query for caching, polling, and optimistic updates.",
            "Pages: `/` (Overview summary), `/projects` (CRUD & list), `/models` (Registry & stage promotion modal), `/deployments` (Active endpoints, health badges, rollback trigger), `/monitoring` (Drift charts & quality scores), `/alerts` (Alert history & webhook settings).",
            "Responsive layout with dark mode toggle and system health status bar."
        ],
        "acceptance_criteria": [
            "Web UI builds cleanly without TypeScript or lint errors (`npm run build`).",
            "Dashboard overview displays real-time counts: active projects, registered models, online deployments, and active alerts.",
            "Model registry view enables 1-click stage promotion and links directly to active endpoints.",
            "Deployment view displays live health status and provides quick-action buttons ([Monitor], [Deploy], [Rollback])."
        ],
        "tests": [
            "Frontend component unit tests using Vitest and React Testing Library.",
            "Cypress / Playwright E2E smoke test verifying initial navigation and dashboard metrics rendering."
        ],
        "documentation": [
            "Write `docs/dashboard/overview.md` outlining the frontend architecture, state management, and UI component conventions.",
            "Document environment variables (`VITE_API_BASE_URL`) for custom deployments."
        ],
        "dependencies": "Issue #6 (FastAPI Core), Issue #7 (Project API), Issue #10 (Model Registry), Issue #11 (Deployment)."
    },
    {
        "number": 15,
        "title": "Add dataset management, schema inspection, and metadata tracking",
        "milestone": "M3 — Dashboard",
        "milestone_code": "M3_dashboard",
        "priority": "P1",
        "labels": ["data", "P1"],
        "filename": "15_add_dataset_management.md",
        "problem": (
            "Machine learning experiments are only as reproducible as the datasets they use. "
            "Without formal dataset management, data files reside untracked in arbitrary local directories, "
            "making it impossible to audit which data distribution generated a specific production model."
        ),
        "objective": (
            "Implement dataset registration, versioning, SHA-256 integrity hashing, schema extraction (using Polars), "
            "and MinIO cloud-storage synchronization in `packages/data` and `apps/api/routers/datasets.py`."
        ),
        "proposed_solution": (
            "Create `Dataset` and `DatasetVersion` database entities. Build CLI commands `mlite data register`, "
            "`mlite data list`, and `mlite data inspect`. Use Polars to parse CSV, Parquet, and JSON files, extracting "
            "row counts, column data types, null counts, and file hashes. Upload files to MinIO bucket `mlite-datasets`."
        ),
        "technical_requirements": [
            "Database entities: `Dataset` (id, project_id, name, format, description) and `DatasetVersion` (id, dataset_id, version_num, hash_sha256, row_count, column_count, schema_json, s3_key, created_at).",
            "Fast tabular parser using Polars (`polars.read_csv`, `polars.read_parquet`) with schema inference.",
            "REST API endpoints: `POST /api/v1/datasets`, `POST /api/v1/datasets/{id}/versions`, `GET /api/v1/datasets`, `GET /api/v1/datasets/{id}/versions`.",
            "CLI commands: `mlite data add <file_path> --project <name>`, `mlite data list`, `mlite data info <dataset_version_id>`."
        ],
        "acceptance_criteria": [
            "Registering a CSV or Parquet file computes an accurate SHA-256 hash and extracts column data types automatically.",
            "Dataset version files are safely uploaded to MinIO under `s3://mlite-datasets/<project>/<hash>/`.",
            "`mlite data list` displays all versioned datasets with row counts and file sizes.",
            "Duplicate uploads of identical content resolve to the same content hash without redundant storage."
        ],
        "tests": [
            "Unit tests in `tests/unit/data/test_dataset_service.py` verifying schema parsing on CSV and Parquet files.",
            "Integration tests verifying MinIO upload and hash validation."
        ],
        "documentation": [
            "Write `docs/data/datasets.md` explaining dataset lifecycle, supported formats, and schema tracking.",
            "Add CLI examples for registering new data versions before model training."
        ],
        "dependencies": "Issue #3 (PostgreSQL), Issue #5 (MinIO Storage), Issue #7 (Project API)."
    },
    {
        "number": 16,
        "title": "Integrate DVC for reproducible data and pipeline version control",
        "milestone": "M3 — Dashboard",
        "milestone_code": "M3_dashboard",
        "priority": "P1",
        "labels": ["data", "P1"],
        "filename": "16_integrate_dvc.md",
        "problem": (
            "Git is poorly suited for tracking large dataset files (gigabytes of CSVs or tensors). "
            "To achieve true end-to-end reproducibility, MLite needs a data versioning engine compatible with Git "
            "that points to self-hosted MinIO storage without adding manual user friction."
        ),
        "objective": (
            "Integrate Data Version Control (DVC) inside `packages/data/dvc_manager.py` and provide CLI integration "
            "(`mlite data dvc-init`, `mlite data sync`) configuring MinIO as the default remote S3 storage."
        ),
        "proposed_solution": (
            "Automate DVC configuration within MLite projects. When initializing a project, configure DVC to use "
            "MinIO endpoint (`http://localhost:9000/mlite-datasets`) with access keys. Implement helper functions "
            "to run `dvc add`, `dvc push`, `dvc pull`, and link `.dvc` tracking files to Git commits and MLite dataset records."
        ),
        "technical_requirements": [
            "DVC Python API / CLI wrapper (`dvc>=3.50`).",
            "Automatic remote configuration: `dvc remote add -d minio s3://mlite-datasets/dvc-cache` with custom endpoint URL.",
            "CLI commands: `mlite data push`, `mlite data pull`, `mlite data checkout`.",
            "Linkage between Git commit SHA, DVC `.dvc` file hashes, and MLflow experiment runs."
        ],
        "acceptance_criteria": [
            "Initializing DVC in an MLite project automatically hooks up MinIO remote with zero manual AWS config.",
            "Executing `mlite data push` uploads dataset chunks to MinIO and generates a `.dvc` pointer file committed to Git.",
            "Checking out an older git commit and running `mlite data pull` restores the exact historical dataset version.",
            "Graceful fallback or clear warning if DVC is not installed on the user's host."
        ],
        "tests": [
            "Integration test `tests/integration/test_dvc_integration.py` initializing a temporary Git+DVC repo, adding a CSV, pushing to MinIO, and verifying retrieval.",
            "Unit tests for DVC remote configuration generator."
        ],
        "documentation": [
            "Write `docs/data/dvc_integration.md` explaining how DVC works under the hood in MLite.",
            "Include best practices for collaborating on datasets in small teams without cloud egress fees."
        ],
        "dependencies": "Issue #5 (MinIO), Issue #8 (CLI), Issue #15 (Dataset management)."
    }
]
