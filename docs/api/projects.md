# Project Management REST API

> **Prefix:** `/api/v1/projects`  
> **Tags:** `Projects`

---

## Endpoints

### Create Project

```http
POST /api/v1/projects/
Content-Type: application/json

{
  "name": "Fraud Detection",
  "slug": "fraud-detection",
  "description": "Credit card fraud classifier using XGBoost",
  "git_url": "https://github.com/org/fraud-detection",
  "default_branch": "main"
}
```

**Response (201 Created):**

```json
{
  "id": "a1b2c3d4-...",
  "name": "Fraud Detection",
  "slug": "fraud-detection",
  "description": "Credit card fraud classifier using XGBoost",
  "git_url": "https://github.com/org/fraud-detection",
  "default_branch": "main",
  "config_yaml": null,
  "status": "active",
  "created_at": "2025-01-15T10:30:00Z",
  "updated_at": "2025-01-15T10:30:00Z"
}
```

### List Projects

```http
GET /api/v1/projects/?page=1&page_size=20&status=active
```

**Response (200):**

```json
{
  "projects": [ ... ],
  "total": 42,
  "page": 1,
  "page_size": 20
}
```

### Get Project

```http
GET /api/v1/projects/{slug_or_id}
```

Accepts either the project `slug` or `UUID`.

### Update Project

```http
PATCH /api/v1/projects/{slug_or_id}
Content-Type: application/json

{
  "description": "Updated description"
}
```

### Archive Project

```http
DELETE /api/v1/projects/{slug_or_id}
```

Soft-deletes the project by setting `status` to `archived`.
The project and its historical data (experiments, metrics) are preserved.

---

## Slug Validation

Project slugs must match `^[a-z0-9-_]{3,50}$`:
- **Allowed:** `my-project`, `fraud_detection_v2`, `demo123`
- **Rejected:** `My Project`, `a`, `UPPERCASE`, `special!chars`

Attempting to create a project with a duplicate slug returns **409 Conflict**.

---

## Python Client Examples

```python
import httpx

client = httpx.Client(base_url="http://localhost:8000")

# Create
resp = client.post("/api/v1/projects/", json={
    "name": "Iris Classifier",
    "slug": "iris-classifier",
})
project = resp.json()

# List
projects = client.get("/api/v1/projects/").json()

# Get by slug
p = client.get("/api/v1/projects/iris-classifier").json()

# Update
client.patch("/api/v1/projects/iris-classifier", json={"description": "Updated"})

# Archive
client.delete("/api/v1/projects/iris-classifier")
```
