# 🌐 REST API Endpoints Reference

> **Base URL:** `http://localhost:8000/api/v1`  
> **Interactive Swagger:** `http://localhost:8000/docs`  
> **Milestone:** M8 — Documentation & Examples (Issue #35)

---

## 1. Authentication & Users (`/api/v1/auth`, `/api/v1/users`)

| Method | Path | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/auth/login` | None | Exchange credentials for access and refresh JWT pair |
| `POST` | `/auth/refresh` | None | Refresh access token using refresh token |
| `GET` | `/auth/me` | Bearer | Get authenticated user profile and permissions |
| `POST` | `/auth/api-keys` | Bearer | Generate a new long-lived API key |
| `GET` | `/auth/api-keys` | Bearer | List active API keys |
| `DELETE`| `/auth/api-keys/{id}` | Bearer | Revoke an API key immediately |
| `POST` | `/users` | Admin | Create a new user account |
| `GET` | `/users` | Admin | List all registered user accounts |
| `PATCH`| `/users/{id}` | Admin | Update user role or active status |

---

## 2. Projects (`/api/v1/projects`)

| Method | Path | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/projects/` | Optional | List projects |
| `POST` | `/projects/` | Developer | Create new project workspace |
| `GET` | `/projects/{slug}` | Optional | Get project details by slug |
| `PATCH`| `/projects/{slug}` | Developer | Update project metadata |
| `DELETE`| `/projects/{slug}`| Admin | Delete project |

---

## 3. Datasets (`/api/v1/datasets`)

| Method | Path | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/datasets/` | Optional | List datasets |
| `POST` | `/datasets/` | Developer | Register new dataset |
| `GET` | `/datasets/{id}` | Optional | Get dataset details |
| `POST` | `/datasets/{id}/versions` | Developer | Create new version with SHA-256 hash |
| `GET` | `/datasets/{id}/inspect` | Optional | Profile schema, columns, and row counts |

---

## 4. Experiments (`/api/v1/experiments`)

| Method | Path | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/experiments/` | Optional | List experiments and runs |
| `POST` | `/experiments/` | Developer | Create experiment |
| `GET` | `/experiments/{id}/runs` | Optional | List runs for experiment |

---

## 5. Model Registry (`/api/v1/models`)

| Method | Path | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/models/` | Optional | List registered models |
| `POST` | `/models/register` | Developer | Register model version from MLflow run |
| `GET` | `/models/{name}/versions` | Optional | List versions for model |
| `POST` | `/models/{name}/versions/{v}/promote` | Maintainer | Promote version to target stage |
| `POST` | `/models/{id}/promote` | Maintainer | Promote model by ID |
| `GET` | `/models/compare` | Optional | Compare metrics side by side |

---

## 6. Deployments (`/api/v1/deployments`)

| Method | Path | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/deployments/` | Optional | List active container deployments |
| `POST` | `/deployments/` | Maintainer | Deploy model into container |
| `GET` | `/deployments/{id}` | Optional | Get deployment status & port |
| `POST` | `/deployments/{id}/stop` | Maintainer | Stop and decommission container |
| `GET` | `/deployments/{id}/health` | Optional | Healthcheck probe against container |

---

## 7. Reliability & Rollback (`/api/v1/deployments/{id}/rollback`, `/api/v1/rollback-policies`)

| Method | Path | Auth | Description |
| :--- | :--- | :---: | :--- |
| `POST` | `/deployments/{id}/rollback` | Maintainer | Atomic zero-downtime rollback to target version |
| `POST` | `/models/{name}/rollback` | Maintainer | Roll back model by name |
| `GET` | `/rollbacks` | Maintainer | Query permanent rollback audit history |
| `GET` | `/rollbacks/{id}` | Maintainer | Get specific rollback record |
| `POST` | `/rollback-policies` | Maintainer | Create automated rollback policy |
| `GET` | `/rollback-policies` | Optional | List auto-rollback policies |
| `PATCH`| `/rollback-policies/{id}` | Maintainer | Enable/disable policy |
| `DELETE`| `/rollback-policies/{id}` | Maintainer | Delete rollback policy |

---

## 8. Monitoring & Alerts (`/api/v1/monitoring`, `/api/v1/alerts`)

| Method | Path | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/monitoring/` | Optional | List monitoring evaluation reports |
| `POST` | `/monitoring/drift` | Developer | Evaluate Kolmogorov-Smirnov feature drift |
| `POST` | `/monitoring/quality` | Developer | Run automated data quality profiling |
| `GET` | `/alerts/` | Optional | List alert incidents |
| `POST` | `/alerts/` | Maintainer | Create alert event |
| `POST` | `/alerts/{id}/ack` | Developer | Acknowledge active alert |
| `POST` | `/alerts/{id}/resolve` | Developer | Mark alert as resolved |

---

## 9. Audit Logs (`/api/v1/audit/logs`)

| Method | Path | Auth | Description |
| :--- | :--- | :---: | :--- |
| `GET` | `/audit/logs` | Maintainer | Query immutable compliance audit logs |
| `GET` | `/audit/logs/{id}` | Maintainer | Retrieve single audit log entry |
| `PUT` | `/audit/logs/{id}` | — | **HTTP 405 Method Not Allowed** (Append-only) |
| `DELETE`| `/audit/logs/{id}` | — | **HTTP 405 Method Not Allowed** (Append-only) |
