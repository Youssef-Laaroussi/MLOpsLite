"""Project management CRUD endpoints.

Issue #7 — Full project lifecycle: create, list, get, update, archive.
"""

from typing import Any

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.core.schemas.project import (
    ProjectCreate,
    ProjectUpdate,
    ProjectResponse,
    ProjectListResponse,
)
from packages.core.services.project_service import ProjectService

router = APIRouter(prefix="/api/v1/projects", tags=["Projects"])


def _get_service(session: AsyncSession = Depends(get_db)) -> ProjectService:
    return ProjectService(session)


@router.post("/", status_code=status.HTTP_201_CREATED, response_model=ProjectResponse)
async def create_project(
    data: ProjectCreate,
    service: ProjectService = Depends(_get_service),
) -> Any:
    """Create a new ML project with a unique slug."""
    project = await service.create(data)
    return ProjectResponse.model_validate(project)


@router.get("/", response_model=ProjectListResponse)
async def list_projects(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Items per page"),
    status_filter: str | None = Query(None, alias="status", description="Filter by status"),
    service: ProjectService = Depends(_get_service),
) -> Any:
    """List all ML projects with pagination."""
    projects, total = await service.list_projects(
        page=page, page_size=page_size, status=status_filter
    )
    return ProjectListResponse(
        projects=[ProjectResponse.model_validate(p) for p in projects],
        total=total,
        page=page,
        page_size=page_size,
    )


@router.get("/{slug_or_id}", response_model=ProjectResponse)
async def get_project(
    slug_or_id: str,
    service: ProjectService = Depends(_get_service),
) -> Any:
    """Retrieve a project by slug or UUID."""
    project = await service.get_by_slug_or_id(slug_or_id)
    if project is None:
        raise NotFoundError("Project", slug_or_id)
    return ProjectResponse.model_validate(project)


@router.patch("/{slug_or_id}", response_model=ProjectResponse)
async def update_project(
    slug_or_id: str,
    data: ProjectUpdate,
    service: ProjectService = Depends(_get_service),
) -> Any:
    """Partially update a project's metadata."""
    project = await service.update(slug_or_id, data)
    if project is None:
        raise NotFoundError("Project", slug_or_id)
    return ProjectResponse.model_validate(project)


@router.delete("/{slug_or_id}", response_model=ProjectResponse)
async def delete_project(
    slug_or_id: str,
    service: ProjectService = Depends(_get_service),
) -> Any:
    """Archive (soft-delete) a project."""
    project = await service.archive(slug_or_id)
    if project is None:
        raise NotFoundError("Project", slug_or_id)
    return ProjectResponse.model_validate(project)
