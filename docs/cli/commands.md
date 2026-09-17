# MLite CLI — Commands Reference

## `mlite init`

Initialize a new ML project with standard directory structure.

```
mlite init <project-name> [OPTIONS]

Arguments:
  PROJECT_NAME    Name of the ML project to create (required)

Options:
  -d, --description TEXT   Project description
  -g, --git-url TEXT       Git repository URL
  --dir TEXT               Parent directory (default: current)
  --help                   Show help
```

**Creates:**
```
<project-name>/
├── data/raw/
├── data/processed/
├── src/__init__.py
├── models/
├── tests/__init__.py
├── notebooks/
├── configs/
├── mlite.yaml
├── .mlite/config.json
└── .gitignore
```

---

## `mlite status`

Check the status of all platform services.

```
mlite status [OPTIONS]

Options:
  --api-url TEXT      MLite API URL (default: http://localhost:8000)
  --mlflow-url TEXT   MLflow tracking URL (default: http://localhost:5000)
  --minio-url TEXT    MinIO endpoint URL (default: http://localhost:9000)
```

---

## `mlite config`

### `mlite config view`
Display current CLI configuration as a table.

### `mlite config set <key> <value>`
Set a configuration value in `.mlite/config.json`.

### `mlite config get <key>`
Get a configuration value.

---

## `mlite experiment run`

Execute a training script with automatic MLflow tracking.

```
mlite experiment run <script> [OPTIONS]

Arguments:
  SCRIPT    Path to the Python training script (required)

Options:
  -p, --project TEXT   Project slug
  -n, --name TEXT      Experiment name
  --api-url TEXT       MLite API URL
```

---

## `mlite experiment list`

List recent experiments and training runs.

```
mlite experiment list [OPTIONS]

Options:
  -p, --project TEXT   Filter by project slug
  -l, --limit INT      Number of experiments (default: 20)
  --api-url TEXT       MLite API URL
```

---

## `mlite model list`

List registered models in the registry.

```
mlite model list [OPTIONS]

Options:
  -p, --project TEXT   Filter by project slug
  -s, --stage TEXT     Filter by stage (DEVELOPMENT|CANDIDATE|STAGING|PRODUCTION|ARCHIVED)
  --api-url TEXT       MLite API URL
```

---

## `mlite model register`

Register a model from an MLflow run.

```
mlite model register <name> [OPTIONS]

Arguments:
  NAME    Model name (required)

Options:
  -r, --run-id TEXT    MLflow run ID (required)
  -p, --project TEXT   Project slug
  --api-url TEXT       MLite API URL
```

---

## `mlite model promote`

Promote a model version to a new stage.

```
mlite model promote <name> [OPTIONS]

Arguments:
  NAME    Model name (required)

Options:
  -v, --version INT    Model version (required)
  -s, --stage TEXT     Target stage (required)
  --api-url TEXT       MLite API URL
```

---

## `mlite model compare`

Compare two model versions side by side.

```
mlite model compare <name> [OPTIONS]

Arguments:
  NAME    Model name (required)

Options:
  --v1 INT    First version (required)
  --v2 INT    Second version (required)
  --api-url TEXT       MLite API URL
```
