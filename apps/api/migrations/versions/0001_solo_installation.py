"""Add installation state and project ownership to an existing MLite schema.

Revision ID: 0001_solo_installation
Revises: None (baseline for installations previously using create_all)
"""

import sqlalchemy as sa
from alembic import op

revision = "0001_solo_installation"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    existing = set(sa.inspect(op.get_bind()).get_table_names())
    if not {"users", "projects"}.issubset(existing):
        raise RuntimeError("Start the API once to initialize a fresh core schema before applying this legacy baseline.")
    if "instance_state" not in existing:
        op.create_table(
            "instance_state",
            sa.Column("id", sa.Integer(), primary_key=True),
            sa.Column("setup_token_hash", sa.String(64), nullable=True),
            sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
            sa.CheckConstraint("id = 1", name="single_instance_state"),
        )
    if "project_memberships" not in existing:
        op.create_table(
            "project_memberships",
            sa.Column("project_id", sa.String(36), sa.ForeignKey("projects.id", ondelete="CASCADE"), primary_key=True),
            sa.Column("user_id", sa.String(36), sa.ForeignKey("users.id", ondelete="RESTRICT"), primary_key=True),
            sa.Column("project_role", sa.Enum("OWNER", "MEMBER", name="project_role", create_constraint=True), nullable=False),
            sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
            sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        )
        op.create_index("ix_project_memberships_user_id", "project_memberships", ["user_id"])
        op.create_index(
            "one_owner_per_project", "project_memberships", ["project_id"], unique=True,
            postgresql_where=sa.text("project_role = 'OWNER'"),
            sqlite_where=sa.text("project_role = 'OWNER'"),
        )


def downgrade() -> None:
    raise RuntimeError("Restore a reviewed database backup to downgrade; setup and ownership must not be dropped implicitly.")
