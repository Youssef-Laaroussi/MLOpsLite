"""Stable, readable object keys shared by uploads, reports and migrations."""

import hashlib
import re
import unicodedata
from datetime import UTC, datetime
from pathlib import PurePosixPath

from sqlalchemy import select

from packages.core.models.project import Project, ProjectMembership, ProjectRole


def slug(value: str, limit: int = 40) -> str:
    value = unicodedata.normalize("NFKD", value).encode("ascii", "ignore").decode().lower()
    return re.sub(r"[^a-z0-9]+", "-", value).strip("-")[:limit].rstrip("-") or "resource"


def segment(name: str, identifier: str) -> str:
    # Keep the entire UUID: readable names must never make two resources collide.
    return f"{slug(name)}-{identifier}"


def owner_root(owner_id: str | None) -> str:
    return f"users/{owner_id}" if owner_id else "legacy/unassigned"


def data_filename(filename: str) -> str:
    extension = PurePosixPath(filename.replace("\\", "/")).suffix.lower()
    extension = {".pq": ".parquet"}.get(extension, extension)
    if extension not in {".csv", ".tsv", ".parquet", ".json", ".jsonl"}:
        extension = ".bin"
    return "data" + extension


def dataset_version_key(prefix: str, version: int, filename: str) -> str:
    return f"{prefix}/versions/v{version:06d}/{data_filename(filename)}"


def evaluation_key(prefix: str, kind: str, identifier: str, created_at: datetime | None = None) -> str:
    date = created_at or datetime.now(UTC)
    if date.tzinfo is None:
        date = date.replace(tzinfo=UTC)
    stamp = date.astimezone(UTC).strftime("%Y%m%dT%H%M%SZ")
    return f"{prefix}/{kind}/{stamp}-{identifier}"


async def resource_prefix(session, resource, kind: str) -> str:
    """Freeze the storage path once; display-name changes never rename objects."""
    if resource.storage_prefix:
        return resource.storage_prefix
    # Concurrent first uploads must reuse whichever namespace commits first.
    stored = await session.scalar(select(type(resource).storage_prefix).where(
        type(resource).id == resource.id,
    ).with_for_update())
    if isinstance(stored, str) and stored:
        resource.storage_prefix = stored
        return stored
    root = owner_root(resource.owner_id)
    parent = f"{root}/projects/unassigned"
    if resource.project_id:
        project = await session.get(Project, resource.project_id)
        if project is not None:
            if not project.storage_prefix:
                stored = await session.scalar(select(Project.storage_prefix).where(
                    Project.id == project.id,
                ).with_for_update())
                if isinstance(stored, str) and stored:
                    project.storage_prefix = stored
            if not project.storage_prefix:
                project_owner = await session.scalar(select(ProjectMembership.user_id).where(
                    ProjectMembership.project_id == project.id,
                    ProjectMembership.project_role == ProjectRole.OWNER,
                ))
                project.storage_prefix = f"{owner_root(project_owner)}/projects/{segment(project.slug, project.id)}"
            # Do not import a different owner's prefix while recovering legacy data.
            if project.storage_prefix.startswith(root + "/"):
                parent = project.storage_prefix
    resource.storage_prefix = f"{parent}/{kind}/{segment(resource.name, resource.id)}"
    await session.flush()
    return resource.storage_prefix


def archived_key(key: str, category: str) -> str:
    """Keep unreferenced history without inventing an owner or a version number."""
    parts = PurePosixPath(key).parts
    name = parts[0] if parts and parts[0] != "users" else (parts[3] if len(parts) > 3 else "dataset")
    identifier = hashlib.sha256(key.encode()).hexdigest()[:16]
    if category == "datasets":
        return f"legacy/unassigned/datasets/{slug(name)}/objects/{identifier}/{data_filename(key)}"
    parent = "/".join(parts[:-1])
    group = hashlib.sha256(parent.encode()).hexdigest()[:16]
    run = slug(parts[-2]) if len(parts) > 1 else "evaluation"
    return f"legacy/unassigned/reports/{slug(name)}/{run}-{group}/{PurePosixPath(key).name}"
