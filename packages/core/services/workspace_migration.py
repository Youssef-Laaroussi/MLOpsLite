"""Idempotent ownership upgrade for both create_all and Alembic installations."""

from sqlalchemy import inspect
from sqlalchemy.engine import Connection

OWNED_TABLES = ("datasets", "registered_models", "deployments", "alerts", "alert_rules", "notification_channels")


def upgrade_workspace_schema(connection: Connection) -> None:
    tables = set(inspect(connection).get_table_names())
    for table in OWNED_TABLES:
        if table not in tables:
            continue
        columns = {item["name"] for item in inspect(connection).get_columns(table)}
        if "owner_id" not in columns:
            connection.exec_driver_sql(
                f'ALTER TABLE "{table}" ADD COLUMN owner_id VARCHAR(36) REFERENCES users(id) ON DELETE RESTRICT'
            )
        connection.exec_driver_sql(f'CREATE INDEX IF NOT EXISTS "ix_{table}_owner_id" ON "{table}" (owner_id)')
    connection.exec_driver_sql("""CREATE TABLE IF NOT EXISTS workspace_experiments (
        experiment_id VARCHAR(64) PRIMARY KEY,
        owner_id VARCHAR(36) NOT NULL REFERENCES users(id) ON DELETE RESTRICT,
        project_id VARCHAR(36) REFERENCES projects(id) ON DELETE SET NULL,
        name VARCHAR(256) NOT NULL,
        created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL,
        updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP NOT NULL
    )""")
    connection.exec_driver_sql("CREATE INDEX IF NOT EXISTS ix_workspace_experiments_owner_id ON workspace_experiments (owner_id)")
    if "project_memberships" not in tables:
        return
    # An established project owner is reliable evidence; account counts and
    # administrator roles are never used to guess ownership of legacy objects.
    for table in ("datasets", "registered_models", "deployments", "alerts"):
        if table in tables:
            connection.exec_driver_sql(f"""UPDATE "{table}" SET owner_id = (
                SELECT user_id FROM project_memberships
                WHERE project_id = "{table}".project_id AND project_role = 'OWNER'
            ) WHERE owner_id IS NULL AND project_id IS NOT NULL""")
    if {"registered_models", "deployments"}.issubset(tables):
        connection.exec_driver_sql("""UPDATE deployments SET owner_id = (
            SELECT owner_id FROM registered_models WHERE name = deployments.model_name
        ) WHERE owner_id IS NULL""")
    for table in ("alerts", "alert_rules"):
        if table in tables and "registered_models" in tables:
            connection.exec_driver_sql(f"""UPDATE "{table}" SET owner_id = (
                SELECT owner_id FROM registered_models WHERE name = "{table}".model_name
            ) WHERE owner_id IS NULL AND model_name IS NOT NULL""")
