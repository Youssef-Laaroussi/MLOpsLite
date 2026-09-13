# #3 — Configure PostgreSQL database and async SQLAlchemy/Alembic layer

> **Milestone:** M0 — Project Setup  
> **Priority:** `P0`  
> **Labels:** `backend` `P0`  

---

## Problem
MLite requires persistent transactional storage for project metadata, dataset definitions, deployment states, monitoring records, and audit logs. Without an asynchronous ORM and database migration system, schema evolution cannot be safely managed.

## Objective
Configure PostgreSQL 16 as the primary relational store, establish an asynchronous database session factory using SQLAlchemy 2.0 with asyncpg, and configure Alembic for automated migrations.

## Proposed solution
Initialize an automated database setup supporting two databases (`mlite_db` and `mlflow_db`). Implement `packages/core/db/` with `Base`, `get_async_session` dependency, connection pooling, and an Alembic migration environment in `apps/api/migrations` supporting async migrations.

## Technical requirements
- PostgreSQL 16 Alpine container with an initialization script creating both `mlite_db` and `mlflow_db` databases.
- SQLAlchemy >= 2.0 with `asyncpg` driver for non-blocking I/O.
- Connection pool settings: `pool_size=20`, `max_overflow=10`, `pool_pre_ping=True`, `pool_recycle=3600`.
- Alembic configured with async template (`alembic/env.py` using `run_migrations_online` via `asyncio`).
- Base entity mixin with `id` (UUIDv7 or auto-increment), `created_at` (UTC timestamp), and `updated_at`.

## Acceptance criteria
- PostgreSQL container starts and automatically initializes both databases with proper user permissions.
- `alembic upgrade head` executes without errors on a fresh database instance.
- SQLAlchemy async session dependency cleanly injects into FastAPI route handlers and commits/rollbacks automatically.
- Connection loss is automatically recovered via `pool_pre_ping`.

## Tests
- Add integration test `tests/integration/test_database.py` connecting via asyncpg and verifying CRUD operations.
- Test Alembic migration rollback (`alembic downgrade -1`) and re-upgrade (`alembic upgrade head`).

## Documentation
- Write `docs/architecture/database.md` outlining the connection URL format, pooling guidelines, and Alembic CLI usage.
- Add instructions for adding new models and generating migrations.

## Dependencies
Issue #1, Issue #2.
