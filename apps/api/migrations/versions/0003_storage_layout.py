"""Persist stable storage namespaces without moving or deleting objects."""

from alembic import op

from packages.core.services.storage_schema import upgrade_storage_schema

revision = "0003_storage_layout"
down_revision = "0002_workspace_isolation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    upgrade_storage_schema(op.get_bind())


def downgrade() -> None:
    raise RuntimeError("Storage namespaces are permanent; restore a reviewed backup instead.")
