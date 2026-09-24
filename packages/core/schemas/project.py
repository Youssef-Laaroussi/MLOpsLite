"""Pydantic v2 schemas for Project API requests and responses."""

import re
from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, field_validator, model_validator

SLUG_PATTERN = re.compile(r"^[a-z0-9\-_]{3,50}$")


# ── Request schemas ─────────────────────────────────────────


class ProjectCreate(BaseModel):
    """Payload for creating a new project."""

    name: str = Field(..., min_length=1, max_length=100, description="Human-readable project name")
    slug: str | None = Field(None, min_length=3, max_length=50, description="URL-safe unique identifier")
    description: str | None = Field(None, max_length=2000)
    git_url: str | None = Field(None, max_length=500)
    default_branch: str = Field("main", max_length=100)
    config_yaml: str | None = None

    @model_validator(mode="before")
    @classmethod
    def generate_slug_if_missing(cls, data: Any) -> Any:
        if isinstance(data, dict):
            if not data.get("slug") and data.get("name"):
                cleaned = re.sub(r"[^a-z0-9\-_]", "-", str(data["name"]).strip().lower())
                cleaned = re.sub(r"-+", "-", cleaned).strip("-_")
                if len(cleaned) < 3:
                    cleaned = f"{cleaned}-prj"
                data["slug"] = cleaned[:50]
        return data

    @field_validator("slug")
    @classmethod
    def validate_slug(cls, v: str | None) -> str | None:
        if v is not None and not SLUG_PATTERN.match(v):
            raise ValueError(
                "Slug must be 3–50 chars and contain only lowercase letters, digits, hyphens, or underscores."
            )
        return v


class ProjectUpdate(BaseModel):
    """Payload for partially updating a project."""

    name: str | None = Field(None, min_length=1, max_length=100)
    description: str | None = None
    git_url: str | None = None
    default_branch: str | None = None
    config_yaml: str | None = None
    status: str | None = None  # "active" | "archived"


# ── Response schemas ────────────────────────────────────────


class ProjectResponse(BaseModel):
    """Single project response."""

    id: str
    name: str
    slug: str
    description: str | None = None
    git_url: str | None = None
    default_branch: str
    config_yaml: str | None = None
    status: str
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class ProjectListResponse(BaseModel):
    """Paginated project list response."""

    projects: list[ProjectResponse]
    total: int
    page: int
    page_size: int
