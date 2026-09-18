# 🧪 Unit Testing & Quality Standards

> **Component:** `tests/unit/`, `tests/conftest.py`, `pyproject.toml`  
> **Milestone:** M7 — Quality & CI/CD (Issue #28)  
> **Target Coverage:** `>= 80%` Line Coverage

---

## Overview

MLite maintains rigorous testing standards across all packages (`packages/`) and applications (`apps/`). The unit testing suite is engineered with three core principles:
1. **Zero External Dependencies:** Unit tests execute against mock fixtures and in-memory databases without running Docker containers, external PostgreSQL, MinIO, or MLflow servers.
2. **Speed & Determinism:** The full unit test suite executes in **under 10 seconds** locally.
3. **80%+ Coverage Threshold:** Continuous integration enforces a minimum of 80% line coverage across all shared packages.

---

## Running Unit Tests

### Standard Test Execution
Run all unit tests with concise tracebacks:
```bash
pytest tests/unit
```

### With Coverage Reporting
Run with terminal missing-lines report and HTML generation:
```bash
pytest tests/unit --cov=packages --cov=apps --cov-report=term-missing --cov-report=html:htmlcov
```

View the generated HTML report in your browser:
```bash
open htmlcov/index.html   # macOS
xdg-open htmlcov/index.html # Linux
```

### Targeting Specific Components
```bash
# Test authentication & RBAC only
pytest tests/unit/security/

# Test model rollback engine
pytest tests/unit/rollback/

# Test drift detection and data quality
pytest tests/unit/monitoring/
```

---

## Global Fixtures (`tests/conftest.py`)

All shared fixtures are registered in `tests/conftest.py`:

| Fixture Name | Type | Description |
| :--- | :--- | :--- |
| `mock_session` | `AsyncMock` | Mock SQLAlchemy async database session (`execute`, `flush`, `commit`) |
| `mock_storage_client` | `MagicMock` | Mock MinIO/S3 `StorageClient` (`upload_file`, `download_file`, `generate_presigned_url`) |
| `mock_mlflow_client` | `MagicMock` | Mock MLflow tracking client with runs, parameters, and metrics |
| `mock_docker_manager` | `MagicMock` | Mock `DockerManager` for container lifecycle emulation |
| `app` | `FastAPI` | Clean FastAPI application instance |
| `async_client` | `AsyncClient` | Asynchronous HTTP client bound via `ASGITransport` |
| `sample_user` | `User` | Active user with `DEVELOPER` role |
| `sample_admin` | `User` | Active user with `ADMIN` role |
| `sample_maintainer` | `User` | Active user with `MAINTAINER` role |
| `sample_viewer` | `User` | Active user with `VIEWER` role |
| `sample_project` | `Project` | Sample project entity |
| `sample_model_version` | `ModelVersion` | Model version in `PRODUCTION` stage |
| `sample_deployment` | `Deployment` | Active container deployment entity |

---

## Mocking Best Practices

### 1. Database Mocking
Never perform direct network I/O in unit tests. Use `mock_session` to mock query results:
```python
from unittest.mock import MagicMock

def test_service_query(mock_session):
    mock_result = MagicMock()
    mock_result.scalars.return_value.all.return_value = [my_entity]
    mock_session.execute.return_value = mock_result
```

### 2. Time & Date Determinism
When testing token expiration or timestamps, use fixed deltas:
```python
from datetime import timedelta
from packages.core.security.auth import create_access_token, decode_token

# Test expired token
token = create_access_token({"sub": "user-1"}, expires_delta=timedelta(seconds=-10))
assert decode_token(token) is None
```

### 3. FastAPI Dependency Overrides
Override dependencies safely using `app.dependency_overrides`:
```python
from packages.core.security.dependencies import get_current_user

app.dependency_overrides[get_current_user] = lambda: sample_admin
try:
    response = client.get("/api/v1/users")
    assert response.status_code == 200
finally:
    app.dependency_overrides.pop(get_current_user, None)
```

---

## Coverage Configuration (`pyproject.toml`)

Enforced via `[tool.coverage.report]`:
```toml
[tool.coverage.report]
fail_under = 80
show_missing = true
exclude_lines = [
    "pragma: no cover",
    "def __repr__",
    "if __name__ == .__main__.:",
    "raise NotImplementedError",
    "if TYPE_CHECKING:",
]
```
If coverage falls below 80% during CI execution, the build will automatically fail.
