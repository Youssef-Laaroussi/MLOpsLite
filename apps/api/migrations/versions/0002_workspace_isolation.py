"""Persist private resource ownership without deleting legacy data."""

from alembic import op

from packages.core.services.workspace_migration import upgrade_workspace_schema

revision = "0002_workspace_isolation"
down_revision = "0001_solo_installation"
branch_labels = None
depends_on = None


def upgrade() -> None:
    upgrade_workspace_schema(op.get_bind())


def downgrade() -> None:
    raise RuntimeError("Restore a reviewed backup; resource ownership must not be discarded implicitly.")
