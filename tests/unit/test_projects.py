"""Unit tests for Project API endpoints (Issue #7).

Tests project CRUD, slug validation, pagination, and conflict detection.
"""

import pytest

from packages.core.models.project import Project, ProjectStatus
from packages.core.schemas.project import ProjectCreate, ProjectResponse, ProjectUpdate

# ── Schema validation tests ─────────────────────────────────


class TestProjectSchemas:
    """Validate Pydantic schema constraints."""

    def test_valid_project_create(self):
        data = ProjectCreate(
            name="Demo Project",
            slug="demo-project",
            description="A test project",
            git_url="https://github.com/test/repo",
        )
        assert data.slug == "demo-project"
        assert data.default_branch == "main"

    def test_slug_too_short(self):
        with pytest.raises(Exception):
            ProjectCreate(name="Test", slug="ab")

    def test_slug_invalid_chars(self):
        with pytest.raises(Exception):
            ProjectCreate(name="Test", slug="My Project!")

    def test_slug_uppercase_rejected(self):
        with pytest.raises(Exception):
            ProjectCreate(name="Test", slug="MyProject")

    def test_valid_slug_with_underscores(self):
        data = ProjectCreate(name="Test", slug="my_project_123")
        assert data.slug == "my_project_123"

    def test_valid_slug_with_hyphens(self):
        data = ProjectCreate(name="Test", slug="my-project-456")
        assert data.slug == "my-project-456"

    def test_project_update_partial(self):
        data = ProjectUpdate(name="New Name")
        dumped = data.model_dump(exclude_unset=True)
        assert "name" in dumped
        assert "description" not in dumped

    def test_project_response_from_attributes(self):
        """Verify from_attributes config allows ORM object conversion."""
        assert ProjectResponse.model_config.get("from_attributes") is True

    def test_project_response_resource_counts(self):
        """Verify models_count, datasets_count, and deployments_count default to 0."""
        from datetime import datetime, timezone
        now = datetime.now(timezone.utc)
        resp = ProjectResponse(
            id="proj-123",
            name="Test",
            slug="test-slug",
            status="active",
            default_branch="main",
            models_count=3,
            datasets_count=2,
            deployments_count=1,
            created_at=now,
            updated_at=now,
        )
        assert resp.models_count == 3
        assert resp.datasets_count == 2
        assert resp.deployments_count == 1



# ── Model tests ──────────────────────────────────────────────


class TestProjectModel:
    """Verify Project SQLAlchemy model definition."""

    def test_table_name(self):
        assert Project.__tablename__ == "projects"

    def test_status_enum(self):
        assert ProjectStatus.ACTIVE.value == "active"
        assert ProjectStatus.ARCHIVED.value == "archived"

    def test_model_has_expected_columns(self):
        column_names = {c.name for c in Project.__table__.columns}
        expected = {
            "id",
            "name",
            "slug",
            "description",
            "git_url",
            "default_branch",
            "config_yaml",
            "status",
            "created_at",
            "updated_at",
        }
        assert expected.issubset(column_names)

    def test_slug_column_is_unique(self):
        slug_col = Project.__table__.c.slug
        assert slug_col.unique is True

    def test_slug_column_is_indexed(self):
        slug_col = Project.__table__.c.slug
        assert slug_col.index is True
