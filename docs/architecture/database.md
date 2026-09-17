# Database Architecture & Migrations

MLite uses **PostgreSQL 16** as its primary relational data store for metadata, datasets, models, deployment states, and audit logs.

---

## 1. Connection URL Format

All database connections use SQLAlchemy 2.0 with the non-blocking **`asyncpg`** driver:

```text
postgresql+asyncpg://<username>:<password>@<host>:<port>/<database>
```

### Default Local Settings
- **Host**: `localhost` (or `mlite-db` within Docker network)
- **Port**: `5432`
- **User**: `mlite_user`
- **Databases**:
  - `mlite_db` : Application metadata, projects, datasets, models, deployments, alerts.
  - `mlflow_db`: Dedicated MLflow tracking server metadata.

---

## 2. Connection Pooling Guidelines

The database engine is configured in `packages/core/db/session.py` with production-safe connection pooling:

| Parameter | Value | Description |
| :--- | :--- | :--- |
| `pool_size` | `20` | Persistent connection pool size |
| `max_overflow` | `10` | Additional burst connections allowed under peak load |
| `pool_pre_ping` | `True` | Automatically validates connection liveness before reuse |
| `pool_recycle` | `3600` | Recycles idle connections every hour to avoid stale socket errors |

---

## 3. Creating New Models

All entity models must inherit from `Base` and standard mixins in `packages/core/db/base.py`:

```python
from sqlalchemy import String
from sqlalchemy.orm import Mapped, mapped_column
from packages.core.db.base import Base, UUIDMixin, TimestampMixin

class Project(Base, UUIDMixin, TimestampMixin):
    __tablename__ = "projects"

    name: Mapped[str] = mapped_column(String(100), nullable=False)
    slug: Mapped[str] = mapped_column(String(100), unique=True, index=True, nullable=False)
    description: Mapped[str | None] = mapped_column(String(500), nullable=True)
```

Each model automatically inherits:
- `id`: Unique UUIDv4 string (36 characters, indexed primary key).
- `created_at`: Timezone-aware UTC timestamp.
- `updated_at`: Timezone-aware UTC timestamp, automatically updated on commit.

---

## 4. Alembic Migration Commands

Alembic is configured with asynchronous migration support in `apps/api/migrations/`.

### Generate a New Migration
```bash
# Autogenerate migration based on new or updated SQLAlchemy models
alembic revision --autogenerate -m "add_projects_table"
```

### Apply Migrations
```bash
# Upgrade to the latest migration
alembic upgrade head
```

### Roll Back Migrations
```bash
# Roll back the most recent migration
alembic downgrade -1
```
