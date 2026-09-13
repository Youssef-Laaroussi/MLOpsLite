"""Milestone 2: Deployment (Issues #11 -> #13)"""

M2_ISSUES = [
    {
        "number": 11,
        "title": "Implement Docker model packaging and deployment engine",
        "milestone": "M2 — Deployment",
        "milestone_code": "M2_deployment",
        "priority": "P1",
        "labels": ["deployment", "P1"],
        "filename": "11_implement_docker_model_deployment.md",
        "problem": (
            "Deploying trained models into isolated runtime environments typically requires writing custom Dockerfiles, "
            "configuring web servers, and managing port allocations manually. Small teams need single-command model deployment "
            "(`mlite deploy <model> --version <v>`) without complex Kubernetes manifests."
        ),
        "objective": (
            "Build `packages/deployment` to package registered models into lightweight Docker containers dynamically, "
            "orchestrate them via local Docker daemon/Compose, and register the running deployment in MLite's database."
        ),
        "proposed_solution": (
            "Implement a Docker model packaging template based on Python 3.12 slim, Uvicorn, and FastAPI. "
            "The deployment engine downloads the model artifact from MinIO, injects an inference server wrapper, builds "
            "or uses a pre-built standardized serving image, runs the container on an allocated local port, and updates "
            "the deployment record in PostgreSQL."
        ),
        "technical_requirements": [
            "Standardized inference container base image `mlite/serving:latest` containing runtime ML dependencies.",
            "Dynamic port allocation engine tracking used host ports (starting at range 8100-8200).",
            "Docker SDK for Python (`docker` library) to manage container lifecycles (`create`, `start`, `stop`, `remove`).",
            "Database entity `Deployment` in `packages/core/models/deployment.py`: `id`, `project_id`, `model_name`, `model_version`, `container_id`, `port`, `endpoint_url`, `status` (PENDING, RUNNING, STOPPED, FAILED), `created_at`.",
            "CLI command: `mlite deploy <model-name> --version <v> [--port <p>]`."
        ],
        "acceptance_criteria": [
            "Executing `mlite deploy fraud-detector --version 1` spins up a dedicated container serving inference.",
            "Deployed container status is visible via `docker ps` and via `mlite deployment list`.",
            "Stopping a deployment via `mlite deployment stop <id>` terminates and cleans up the Docker container.",
            "If deployment fails during startup, the container is safely halted and error logs are stored in the database."
        ],
        "tests": [
            "Integration test `tests/integration/test_model_deployment.py` packaging a test Scikit-learn model, launching container, and verifying container state.",
            "Unit test for dynamic port allocation and collision avoidance."
        ],
        "documentation": [
            "Write `docs/deployment/docker_serving.md` explaining container architecture, resource constraints, and networking.",
            "Provide CLI commands reference for `mlite deploy` and `mlite deployment list`."
        ],
        "dependencies": "Issue #10 (Model Registry), Issue #5 (MinIO Storage)."
    },
    {
        "number": 12,
        "title": "Create standardized prediction REST endpoint and request validation",
        "milestone": "M2 — Deployment",
        "milestone_code": "M2_deployment",
        "priority": "P1",
        "labels": ["deployment", "P1"],
        "filename": "12_create_prediction_endpoint.md",
        "problem": (
            "Model inference servers often suffer from inconsistent API contracts. Different models accept varying JSON shapes, "
            "making downstream consumer integration brittle and complicating inference monitoring and payload logging."
        ),
        "objective": (
            "Establish a uniform REST contract for all deployed MLite models, exposing `POST /predict`, `GET /metadata`, "
            "and `GET /health` with Pydantic request validation, batch prediction support, and inference latency logging."
        ),
        "proposed_solution": (
            "Implement a standardized FastAPI inference template inside `packages/deployment/server/`. "
            "Define standard payload envelopes (`{\"inputs\": [...]}` or `{\"dataframe_records\": [...]}`) matching standard "
            "MLflow/Seldon inference protocols. Automatically record inference requests and responses into a local buffer "
            "for subsequent drift monitoring."
        ),
        "technical_requirements": [
            "Endpoint `POST /predict`: accepts JSON with 2D array (`inputs`), records (`dataframe_records`), or dictionary of column lists (`dataframe_split`).",
            "Response contract: `{\"predictions\": list, \"model\": str, \"version\": str, \"latency_ms\": float}`.",
            "Endpoint `GET /metadata`: returns feature names, expected data types, model framework (e.g. Scikit-learn, XGBoost), and artifact version.",
            "Request/Response payload streaming logger writing asynchronous inference records to MinIO for data drift analysis."
        ],
        "acceptance_criteria": [
            "`POST /predict` validates incoming tensor shapes or tabular records and returns predictions with status 200.",
            "Invalid inputs (missing features, wrong types) return HTTP 422 with precise validation error messages.",
            "`GET /metadata` accurately reflects model inputs and schema.",
            "Average prediction latency is measured and included in the response headers and payload."
        ],
        "tests": [
            "Unit tests in `tests/unit/deployment/test_prediction_server.py` verifying tabular array, dictionary, and invalid input schemas.",
            "Benchmark test verifying endpoint latency overhead is under 5ms."
        ],
        "documentation": [
            "Write `docs/deployment/prediction_api.md` outlining the request/response JSON schema with curl and Python `requests` examples.",
            "Document batch inference payload optimization guidelines."
        ],
        "dependencies": "Issue #11 (Docker model deployment)."
    },
    {
        "number": 13,
        "title": "Add deployment health checks, probes, and resource metrics",
        "milestone": "M2 — Deployment",
        "milestone_code": "M2_deployment",
        "priority": "P1",
        "labels": ["deployment", "P1"],
        "filename": "13_add_deployment_health_checks.md",
        "problem": (
            "Once a model container is launched, its availability, memory consumption, and error rates are unknown "
            "unless actively monitored. A crashed model container or deadlocked worker thread leads to silent production downtime."
        ),
        "objective": (
            "Implement automated health probes (liveness, readiness), periodic status polling, and container resource metrics "
            "(CPU %, Memory MB, request count, error rate) in the MLite deployment supervisor."
        ),
        "proposed_solution": (
            "Implement `GET /health` inside the model serving container checking model loaded state. "
            "Add a background health polling routine in `apps/api` (or worker) that regularly probes active deployments, "
            "queries Docker stats for CPU/memory consumption, and flags degraded or dead instances."
        ),
        "technical_requirements": [
            "Serving container endpoint: `GET /health` returning `{status: 'healthy', model_loaded: true, uptime_seconds: int}`.",
            "Serving container endpoint: `GET /live` and `GET /ready` for Kubernetes compatibility.",
            "Supervisor poller: runs every 30 seconds, performs HTTP GET to deployment health endpoint, inspects Docker container state.",
            "Container metrics collection via Docker API: CPU percentage, Memory usage vs limit, network I/O bytes.",
            "Database table `deployment_metrics`: records historical health status, latency percentiles, and resource utilization."
        ],
        "acceptance_criteria": [
            "Deployment health endpoint returns 200 OK within 50ms when healthy, and 503 Service Unavailable if the model fails to load.",
            "If a container stops unexpectedly, MLite API marks its status as `FAILED` within 30 seconds and logs the exit code.",
            "`mlite deployment status <id>` displays live CPU, memory, and uptime metrics in the terminal."
        ],
        "tests": [
            "Integration test simulating a container crash and asserting status transition to `FAILED`.",
            "Unit test for the health supervisor background routine and metrics parser."
        ],
        "documentation": [
            "Create `docs/deployment/health_and_monitoring.md` documenting probe endpoints and supervisor configuration.",
            "Add troubleshooting tips for failed or out-of-memory container deployments."
        ],
        "dependencies": "Issue #11 (Docker model deployment), Issue #12 (Prediction endpoint)."
    }
]
