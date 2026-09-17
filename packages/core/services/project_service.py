"""Project service — business logic for project CRUD operations."""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.project import Project, ProjectStatus
from packages.core.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    """Encapsulates project lifecycle operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: ProjectCreate) -> Project:
        """Create a new project, raising ConflictError on duplicate slug."""
        existing = await self.session.execute(
            select(Project).where(Project.slug == data.slug)
        )
        if existing.scalar_one_or_none() is not None:
            from apps.api.errors import ConflictError

            raise ConflictError(f"Project with slug '{data.slug}' already exists")

        project = Project(
            name=data.name,
            slug=data.slug,
            description=data.description,
            git_url=data.git_url,
            default_branch=data.default_branch,
            config_yaml=data.config_yaml,
        )
        self.session.add(project)
        await self.session.flush()
        await self.session.refresh(project)
        return project

    async def get_by_slug_or_id(self, slug_or_id: str) -> Project | None:
        """Retrieve a project by slug or UUID."""
        result = await self.session.execute(
            select(Project).where(
                (Project.slug == slug_or_id) | (Project.id == slug_or_id)
            )
        )
        return result.scalar_one_or_none()

    async def list_projects(
        self,
        page: int = 1,
        page_size: int = 20,
        status: str | None = None,
    ) -> tuple[list[Project], int]:
        """Return paginated list of projects and total count."""
        query = select(Project)
        count_query = select(func.count()).select_from(Project)

        if status:
            query = query.where(Project.status == status)
            count_query = count_query.where(Project.status == status)

        query = query.order_by(Project.created_at.desc())
        query = query.offset((page - 1) * page_size).limit(page_size)

        result = await self.session.execute(query)
        projects = list(result.scalars().all())

        count_result = await self.session.execute(count_query)
        total = count_result.scalar() or 0

        return projects, total

    async def update(self, slug_or_id: str, data: ProjectUpdate) -> Project | None:
        """Partially update a project."""
        project = await self.get_by_slug_or_id(slug_or_id)
        if project is None:
            return None

        update_data = data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "status" and value is not None:
                setattr(project, field, ProjectStatus(value))
            else:
                setattr(project, field, value)

        await self.session.flush()
        await self.session.refresh(project)
        return project

    async def archive(self, slug_or_id: str) -> Project | None:
        """Soft-delete a project by setting status to archived."""
        project = await self.get_by_slug_or_id(slug_or_id)
        if project is None:
            return None

        project.status = ProjectStatus.ARCHIVED
        await self.session.flush()
        await self.session.refresh(project)
        return project
