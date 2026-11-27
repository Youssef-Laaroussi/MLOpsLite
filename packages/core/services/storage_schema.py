"""Idempotent storage-layout schema upgrade for existing installations."""

from sqlalchemy import inspect


def upgrade_storage_schema(connection) -> None:
    inspector = inspect(connection)
    tables = set(inspector.get_table_names())
    for table in ("projects", "datasets", "registered_models"):
        if table not in tables:
            continue
        if "storage_prefix" not in {column["name"] for column in inspector.get_columns(table)}:
            connection.exec_driver_sql(f'ALTER TABLE "{table}" ADD COLUMN storage_prefix VARCHAR(384)')
        connection.exec_driver_sql(f'CREATE UNIQUE INDEX IF NOT EXISTS "ix_{table}_storage_prefix" ON "{table}" (storage_prefix)')
    if "dataset_versions" in tables:
        columns = {column["name"] for column in inspector.get_columns("dataset_versions")}
        if "original_filename" not in columns:
            connection.exec_driver_sql('ALTER TABLE dataset_versions ADD COLUMN original_filename VARCHAR(255)')
