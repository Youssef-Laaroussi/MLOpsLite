"""Milestone 4: Monitoring & Alerting (Issues #17 -> #22)"""

M4_ISSUES = [
    {
        "number": 17,
        "title": "Implement automated data quality checks and validation reports",
        "milestone": "M4 — Monitoring",
        "milestone_code": "M4_monitoring",
        "priority": "P1",
        "labels": ["monitoring", "P1"],
        "filename": "17_implement_data_quality_checks.md",
        "problem": (
            "Garbage in, garbage out: training or serving on corrupt data (missing columns, severe null rates, "
            "unanticipated duplicate rows, extreme outliers) ruins model accuracy. There is currently no pre-flight "
            "data quality check in MLite to catch bad data before training or batch inference runs."
        ),
        "objective": (
            "Build an automated data quality validation engine in `packages/monitoring/quality.py` that evaluates datasets "
            "against schema rules, checks for missingness, duplicates, distributions, and produces an overall Data Quality Score (0-100)."
        ),
        "proposed_solution": (
            "Implement a high-speed data profiler using Polars. Evaluate datasets against configurable constraints: "
            "missing value thresholds, duplicate percentages, column type conformity, and value ranges. "
            "Expose CLI command `mlite data validate <dataset_file>` and REST endpoint `POST /api/v1/datasets/{id}/validate`."
        ),
        "technical_requirements": [
            "Data Quality Rules: column existence, type conformance, null percentage threshold (e.g. < 5%), duplicate row threshold (< 1%), value bounds (min/max).",
            "Quality score algorithm: weighted composite metric (0-100) combining completeness, uniqueness, validity, and consistency.",
            "Report output: JSON payload and pretty terminal output displaying: Rows, Columns, Missing %, Duplicates %, Quality Score, and Status (PASS/WARN/FAIL).",
            "Database table `data_quality_reports`: stores historical scores and failed constraint lists."
        ],
        "acceptance_criteria": [
            "Running `mlite data validate data/train.csv` generates a formatted terminal summary and passes or fails based on thresholds.",
            "Datasets with critical errors (e.g. missing target column or >20% nulls) return status `FAIL` and exit code 1.",
            "Quality report JSON is archived in MinIO and retrievable via the MLite API.",
            "Fast evaluation: profiling a 100,000 row dataset executes in under 2 seconds."
        ],
        "tests": [
            "Unit tests in `tests/unit/monitoring/test_data_quality.py` testing clean, missing-rich, and duplicate-rich datasets.",
            "Test threshold violation logic and composite score calculation."
        ],
        "documentation": [
            "Write `docs/monitoring/data_quality.md` explaining quality score computation and rule configuration in `mlite.yaml`.",
            "Add sample validation reports for common data formats."
        ],
        "dependencies": "Issue #15 (Dataset Management)."
    },
    {
        "number": 18,
        "title": "Integrate Evidently AI for automated ML evaluation and reports",
        "milestone": "M4 — Monitoring",
        "milestone_code": "M4_monitoring",
        "priority": "P1",
        "labels": ["monitoring", "P1"],
        "filename": "18_integrate_evidently.md",
        "problem": (
            "Evaluating model distributions and comparing reference datasets against current production datasets requires "
            "complex statistical tests (Kolmogorov-Smirnov, Wasserstein distance, Chi-square). Re-implementing these from "
            "scratch is prone to statistical errors and maintenance overhead."
        ),
        "objective": (
            "Integrate Evidently AI inside `packages/monitoring/evidently_engine.py` to generate automated HTML and JSON reports "
            "for data drift, target drift, and model performance metrics."
        ),
        "proposed_solution": (
            "Wrap Evidently Report and TestSuite APIs inside a unified MLite evaluation service. Provide pre-configured "
            "presets: DataDriftPreset, DataQualityPreset, and Classification/RegressionPreset. Store generated interactive "
            "HTML reports and summary JSON metrics in MinIO bucket `mlite-evaluations`."
        ),
        "technical_requirements": [
            "Evidently AI library integration (`evidently>=0.4.0`).",
            "Report runner: accepts `reference_data` (training/baseline) and `current_data` (inference/production) as Pandas/Polars DataFrames.",
            "Export outputs: interactive standalone HTML report (`report.html`) and structured metrics summary (`metrics.json`).",
            "Storage: save reports under `s3://mlite-evaluations/<project>/<model_version>/<run_id>/`.",
            "API endpoint `GET /api/v1/monitoring/reports/{id}/html` serving the interactive Evidently report."
        ],
        "acceptance_criteria": [
            "Executing an evaluation run generates both `report.html` and `metrics.json` without runtime warnings.",
            "Evidently metrics summary extracts drift share, drifted features list, and statistical p-values accurately.",
            "The interactive HTML report is viewable directly in the browser via the MLite API or React Dashboard.",
            "Execution is optimized for memory, safely processing tabular datasets up to 200MB."
        ],
        "tests": [
            "Integration test `tests/integration/test_evidently_engine.py` running drift analysis between two synthetic datasets.",
            "Verify HTML report generation and JSON summary schema."
        ],
        "documentation": [
            "Write `docs/monitoring/evidently_integration.md` detailing supported Evidently presets and report interpretation.",
            "Document how to customize statistical tests and drift confidence thresholds."
        ],
        "dependencies": "Issue #5 (MinIO), Issue #6 (FastAPI), Issue #15 (Dataset Management)."
    },
    {
        "number": 19,
        "title": "Implement feature data drift detection and threshold analysis",
        "milestone": "M4 — Monitoring",
        "milestone_code": "M4_monitoring",
        "priority": "P1",
        "labels": ["monitoring", "P1"],
        "filename": "19_implement_data_drift_detection.md",
        "problem": (
            "After a model is deployed to production, input distributions drift over time due to seasonal shifts, "
            "user behavior changes, or upstream data pipeline errors. Without automated drift detection, models degrade silently "
            "without the data science team realizing it."
        ),
        "objective": (
            "Implement automated data drift detection in `packages/monitoring/drift_detector.py` comparing historical baseline "
            "data with live inference payloads, calculating feature-level drift scores, and determining overall drift severity."
        ),
        "proposed_solution": (
            "Build a scheduled or on-demand drift detection job. The worker queries logged production inference requests "
            "over a configurable sliding window (e.g. last 24 hours or last 10,000 predictions), compares them with the reference "
            "training dataset using Evidently / Scipy statistical tests, and computes drift status per feature (LOW, MEDIUM, HIGH)."
        ),
        "technical_requirements": [
            "Drift statistical algorithms: Kolmogorov-Smirnov test for numerical features, Chi-square test for categorical features, Jensen-Shannon divergence.",
            "Configurable drift threshold in `mlite.yaml`: `drift_threshold: 0.20` (p-value or drifted feature ratio).",
            "Drift output classification: `LOW` (drifted features < 10%), `MEDIUM` (10% - 25%), `HIGH` (> 25%).",
            "CLI command: `mlite monitor drift <deployment_id_or_model>`.",
            "REST endpoint: `POST /api/v1/monitoring/drift/check` and `GET /api/v1/monitoring/drift/{model_name}`."
        ],
        "acceptance_criteria": [
            "Executing `mlite monitor drift fraud-detector` outputs feature-level drift breakdown table in the terminal.",
            "If drifted feature ratio exceeds the configured threshold, the system flags overall drift as `HIGH` and generates a warning event.",
            "Historical drift trends are persisted in PostgreSQL table `drift_evaluations` for time-series charting.",
            "Drift detection accurately flags artificially shifted test distributions with statistical significance."
        ],
        "tests": [
            "Unit tests in `tests/unit/monitoring/test_drift_detector.py` comparing shifted Gaussian distributions against baseline.",
            "Test sliding window inference buffer sampling."
        ],
        "documentation": [
            "Write `docs/monitoring/drift_detection.md` explaining statistical tests, p-values, and recommended remediation actions.",
            "Provide guide on configuring drift alert thresholds in `mlite.yaml`."
        ],
        "dependencies": "Issue #12 (Prediction REST Endpoint), Issue #18 (Evidently Integration)."
    },
    {
        "number": 20,
        "title": "Implement model performance and concept drift monitoring",
        "milestone": "M4 — Monitoring",
        "milestone_code": "M4_monitoring",
        "priority": "P1",
        "labels": ["monitoring", "P1"],
        "filename": "20_implement_model_monitoring.md",
        "problem": (
            "Even when input features remain stable, the relationship between features and target labels can change "
            "(concept drift). Furthermore, when ground-truth labels arrive post-inference (delayed feedback), teams need "
            "an automated mechanism to compute production accuracy, precision, recall, or RMSE over time."
        ),
        "objective": (
            "Build the Model Monitoring engine in `packages/monitoring/model_monitor.py` to match delayed ground-truth labels "
            "with historical predictions, compute live production performance metrics, and detect concept degradation."
        ),
        "proposed_solution": (
            "Create an ingestion endpoint for delayed ground-truth feedback (`POST /api/v1/deployments/{id}/feedback`). "
            "Link ground-truth labels to stored prediction IDs. Compute real-world performance metrics across sliding time windows "
            "and compare against the model's initial baseline evaluation from the model registry."
        ),
        "technical_requirements": [
            "Delayed feedback API endpoint accepting `{prediction_id: str, ground_truth: Any, timestamp: Optional[datetime]}`.",
            "Metric calculation routines: Classification (Accuracy, Precision, Recall, F1, ROC-AUC, Confusion Matrix); Regression (MAE, MSE, RMSE, R2).",
            "Degradation detector: triggers when current metric drops by more than $X\\%$ compared to baseline registration metrics.",
            "Database table `model_performance_history`: records periodic metric snapshots for active deployments."
        ],
        "acceptance_criteria": [
            "Submitting ground-truth labels updates matched prediction records in the database.",
            "The performance calculation worker generates metric snapshots and correctly flags significant accuracy drops.",
            "`mlite monitor performance <model_name>` displays current production accuracy vs training baseline.",
            "Supports delayed ground-truth ingested minutes, days, or weeks after original inference."
        ],
        "tests": [
            "Integration test `tests/integration/test_model_monitoring.py` sending 500 predictions, ingesting delayed labels, and verifying computed accuracy and F1.",
            "Unit test for degradation detection triggers."
        ],
        "documentation": [
            "Write `docs/monitoring/performance_monitoring.md` documenting the ground-truth ingestion API and concept drift alerts.",
            "Include architecture diagram explaining delayed feedback loops."
        ],
        "dependencies": "Issue #10 (Model Registry), Issue #12 (Prediction REST Endpoint)."
    },
    {
        "number": 21,
        "title": "Implement multi-channel alert engine and threshold evaluation",
        "milestone": "M4 — Monitoring",
        "milestone_code": "M4_monitoring",
        "priority": "P1",
        "labels": ["alerting", "P1"],
        "filename": "21_implement_alert_system.md",
        "problem": (
            "When anomalies, severe data drift, or model accuracy degradation occur, operators must be alerted immediately. "
            "Without an alert engine, issues remain buried in logs until business metrics or downstream consumers break."
        ),
        "objective": (
            "Build the Alert Engine in `packages/alerting` and `apps/api/routers/alerts.py` to evaluate incoming monitoring "
            "events against configurable alert rules, manage alert states (OPEN, ACKNOWLEDGED, RESOLVED), and record alert history."
        ),
        "proposed_solution": (
            "Create an alert dispatcher subscribing to monitoring event triggers (High Drift, High Error Rate, Latency Spike, "
            "Performance Drop, Container Failure). Evaluate severity (`INFO`, `WARNING`, `HIGH`, `CRITICAL`), deduplicate duplicate "
            "notifications within a cool-off window, and persist alerts to the database."
        ),
        "technical_requirements": [
            "Database model `Alert`: `id`, `project_id`, `model_name`, `deployment_id`, `event_type`, `severity`, `title`, `message`, `details_json`, `status`, `created_at`, `resolved_at`.",
            "Severity thresholds: INFO, WARNING, HIGH, CRITICAL.",
            "De-duplication and cooldown logic (e.g. suppress duplicate alerts for the same model within 1 hour).",
            "Endpoints: `GET /api/v1/alerts`, `POST /api/v1/alerts/{id}/acknowledge`, `POST /api/v1/alerts/{id}/resolve`.",
            "CLI command: `mlite alert list`, `mlite alert ack <id>`."
        ],
        "acceptance_criteria": [
            "A high data drift event automatically creates an alert with severity `HIGH` and detailed drift scores.",
            "Alerts are listed in the Web UI and CLI with color-coded severity badges.",
            "Cool-down window prevents alert fatigue by suppressing redundant notifications.",
            "Operators can acknowledge and resolve alerts via API and CLI."
        ],
        "tests": [
            "Unit tests in `tests/unit/alerting/test_alert_engine.py` testing alert trigger conditions, deduplication, and state transitions.",
            "Integration test verifying alert persistence and query filtering."
        ],
        "documentation": [
            "Write `docs/alerting/overview.md` describing alert rules, severities, and lifecycle states.",
            "Provide sample configuration for defining custom alert rules in `mlite.yaml`."
        ],
        "dependencies": "Issue #13 (Health checks), Issue #19 (Drift detection), Issue #20 (Model monitoring)."
    },
    {
        "number": 22,
        "title": "Add webhook, Slack, Discord, and Email notification dispatchers",
        "milestone": "M4 — Monitoring",
        "milestone_code": "M4_monitoring",
        "priority": "P1",
        "labels": ["alerting", "P1"],
        "filename": "22_add_webhook_notifications.md",
        "problem": (
            "Alerts saved only to a database require active polling. Teams need external notifications delivered to their "
            "collaboration tools (Slack, Discord), custom microservices (HTTP Webhooks), or Email without relying on proprietary third-party SaaS."
        ),
        "objective": (
            "Implement pluggable notification dispatchers in `packages/alerting/dispatchers/` supporting HTTP Webhooks, "
            "Slack Incoming Webhooks, Discord Webhooks, and SMTP Email."
        ),
        "proposed_solution": (
            "Design an extensible `NotificationDispatcher` interface. Implement `WebhookDispatcher` (signed HTTP POST with HMAC-SHA256 signature), "
            "`SlackDispatcher` (Block Kit formatted cards), `DiscordDispatcher` (Rich embed cards), and `EmailDispatcher` (HTML email templates). "
            "Dispatch notifications asynchronously via background task worker with automatic retry."
        ),
        "technical_requirements": [
            "Base dispatcher interface: `async def dispatch(self, alert: Alert) -> bool`.",
            "Slack webhook payload with color borders corresponding to alert severity and action buttons.",
            "Discord webhook payload with rich embeds and formatted fields.",
            "Generic Webhook with JSON payload and optional `X-MLite-Signature` header for payload verification.",
            "SMTP email sender supporting TLS / STARTTLS with fallback handling.",
            "Retry policy: exponential backoff up to 3 attempts on network failure."
        ],
        "acceptance_criteria": [
            "Triggering an alert successfully posts formatted message to configured Slack and Discord test channels.",
            "Generic webhook receives signed JSON payload with model metadata, drift scores, and timestamp.",
            "Failed delivery attempts are logged and retried up to 3 times without crashing the main application.",
            "Notification channels can be enabled/disabled dynamically via `mlite.yaml`."
        ],
        "tests": [
            "Unit tests in `tests/unit/alerting/test_dispatchers.py` using mock HTTP responses and assertion of generated payloads.",
            "Integration test testing retry mechanism on transient HTTP 500 responses."
        ],
        "documentation": [
            "Write `docs/alerting/notifications.md` covering Slack, Discord, Email, and Webhook setup with screenshots.",
            "Provide sample JSON payloads for external webhook consumer implementations."
        ],
        "dependencies": "Issue #21 (Alert System)."
    }
]
