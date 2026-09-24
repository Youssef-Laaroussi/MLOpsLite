# ⌨️ MLite CLI Complete Command Reference

> **Command Prefix:** `mlite`  
> **Milestone:** M8 — Documentation & Examples (Issue #34)  
> **Exit Codes:** `0` = Success, `1` = Operational Error, `2` = Validation Error, `130` = Aborted by User

---

## Command Hierarchy

```
mlite
├── init <project-name>
├── status
├── login [-u username] [-p password]
├── logout
├── whoami
├── config [view | set | get]
├── data [add | list | info | validate | dvc-init | push | pull | checkout]
├── experiment [run | list]
├── model [list | register | promote | compare]
├── deploy <model> --version <v> [--port <p>]
├── deployment [list | stop | status]
├── monitor [drift | performance]
├── alert [list | ack | resolve]
├── rollback <model> [--to <version>] [--reason <text>]
├── rollback-policy [list | create | enable | disable | delete | evaluate]
├── api-key [create | list | revoke]
├── user [list | create]
└── audit [list]
```

---

## 1. Project Management

### `mlite init`
Initialize a new ML project with standard directory structure and `.mlite/` workspace configuration.
```bash
mlite init <project-name> [--path <dir>] [--description <text>]
```
**Example:**
```bash
mlite init credit-risk --description "Credit risk default scoring model"
```

### `mlite status`
Query health and operational status of all platform services (FastAPI, PostgreSQL, MinIO, MLflow).
```bash
mlite status [--api-url http://localhost:8000]
```

---

## 2. Authentication & Governance

### `mlite login`
Authenticate using username/email and password, saving JWT session token to `~/.mlite/credentials` (0600 permissions).
```bash
mlite login [-u username] [-p password]
```

### `mlite logout`
Log out and securely clear local stored session credentials.
```bash
mlite logout
```

### `mlite whoami`
Display the currently authenticated user identity, role (`ADMIN`, `MAINTAINER`, `DEVELOPER`, `VIEWER`), and granted permissions.
```bash
mlite whoami
```

### `mlite api-key`
Manage long-lived headless API keys for CI/CD and automation scripts:
```bash
# Generate a new API key (key only displayed once)
mlite api-key create "GitHub-Actions-CI"

# List caller's active API keys
mlite api-key list

# Immediately invalidate an API key
mlite api-key revoke <key-id>
```

### `mlite user` (Admin only)
Manage platform user accounts:
```bash
# List all registered accounts
mlite user list

# Create a new user with specific role
mlite user create engineer@mlite.local alex --role MAINTAINER --name "Alex Doe"
```

---

## 3. Data & Datasets

### `mlite data add`
Upload a tabular dataset (`.csv`, `.parquet`) to MinIO and register dataset metadata:
```bash
mlite data add <file-path> --name <dataset-name> [--description <text>]
```

### `mlite data list`
List registered datasets and latest version hashes:
```bash
mlite data list
```

### `mlite data validate`
Run automated data quality checks (missing values, types, null rates):
```bash
mlite data validate <file-path>
```

---

## 4. Experiments & MLflow Tracking

### `mlite experiment run`
Execute a training script with automatic tracking environment variables set:
```bash
mlite experiment run <script.py> [--name <experiment-name>]
```

### `mlite experiment list`
List tracked experiments and recent training runs:
```bash
mlite experiment list [--limit 20]
```

---

## 5. Model Registry & Deployment

### `mlite model list`
List registered models and their current stage (`STAGING`, `PRODUCTION`, `ARCHIVED`):
```bash
mlite model list
```

### `mlite model promote`
Promote a model version to a target stage:
```bash
mlite model promote <model-name> --version <int> --stage PRODUCTION
```

### `mlite deploy`
Deploy a registered model into an isolated inference container:
```bash
mlite deploy <model-name> --version <int> [--port 8100]
```

### `mlite deployment list`
List running inference containers, ports, and container IDs:
```bash
mlite deployment list
```

### `mlite deployment stop`
Halt and decommission an inference container:
```bash
mlite deployment stop <deployment-id>
```

---

## 6. Monitoring, Drift & Alerting

### `mlite monitor drift`
Evaluate Kolmogorov-Smirnov / Wasserstein drift between baseline and current dataset:
```bash
mlite monitor drift --model <model-name> --reference <ref-dataset-id> --current <cur-dataset-id>
```

### `mlite alert list`
List open, acknowledged, and resolved alerts:
```bash
mlite alert list [--status OPEN] [--severity HIGH]
```

### `mlite alert ack` & `mlite alert resolve`
Acknowledge or resolve an active alert incident:
```bash
mlite alert ack <alert-id>
mlite alert resolve <alert-id>
```

---

## 7. Reliability, Rollback & Audit Logs

### `mlite rollback`
Execute an instant controlled rollback to a previous model version with zero downtime:
```bash
mlite rollback <model-name> [--to <version>] [--reason "High error rate"]
```

### `mlite rollback-policy`
Manage automated policy triggers for degradation-based rollback:
```bash
# List policies
mlite rollback-policy list

# Create a policy triggering on error rate > 5%
mlite rollback-policy create --model fraud-detector --metric error_rate --threshold 0.05 --operator GREATER_THAN
```

### `mlite audit list`
Query immutable operational and compliance audit logs:
```bash
# View latest 50 entries
mlite audit list

# Filter by resource type and action
mlite audit list --resource model --action MODEL_PROMOTE --limit 20
```
