"""Project service — business logic for project CRUD operations."""

from sqlalchemy import func, select
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.project import Project, ProjectStatus
from packages.core.schemas.project import ProjectCreate, ProjectUpdate


class ProjectService:
    """Encapsulates project lifecycle operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    async def create(self, data: ProjectCreate) -> Project:
        """Create a new project, raising ConflictError on duplicate slug."""
        existing = await self.session.execute(select(Project).where(Project.slug == data.slug))
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
            select(Project).where((Project.slug == slug_or_id) | (Project.id == slug_or_id))
        )
        project = result.scalar_one_or_none()
        if project:
            from packages.core.models.model_registry import RegisteredModel
            from packages.core.models.dataset import Dataset
            from packages.core.models.deployment import Deployment

            m_count = (
                await self.session.execute(
                    select(func.count(RegisteredModel.id)).where(RegisteredModel.project_id == project.id)
                )
            ).scalar() or 0
            d_count = (
                await self.session.execute(
                    select(func.count(Dataset.id)).where(Dataset.project_id == project.id)
                )
            ).scalar() or 0
            dep_count = (
                await self.session.execute(
                    select(func.count(Deployment.id)).where(Deployment.project_id == project.id)
                )
            ).scalar() or 0

            setattr(project, "models_count", m_count)
            setattr(project, "datasets_count", d_count)
            setattr(project, "deployments_count", dep_count)

        return project

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

        # Populate real resource counts for each project
        if projects:
            project_ids = [p.id for p in projects]

            from packages.core.models.model_registry import RegisteredModel
            from packages.core.models.dataset import Dataset
            from packages.core.models.deployment import Deployment

            models_stmt = (
                select(RegisteredModel.project_id, func.count(RegisteredModel.id))
                .where(RegisteredModel.project_id.in_(project_ids))
                .group_by(RegisteredModel.project_id)
            )
            models_res = await self.session.execute(models_stmt)
            model_counts = dict(models_res.all())

            datasets_stmt = (
                select(Dataset.project_id, func.count(Dataset.id))
                .where(Dataset.project_id.in_(project_ids))
                .group_by(Dataset.project_id)
            )
            datasets_res = await self.session.execute(datasets_stmt)
            dataset_counts = dict(datasets_res.all())

            deployments_stmt = (
                select(Deployment.project_id, func.count(Deployment.id))
                .where(Deployment.project_id.in_(project_ids))
                .group_by(Deployment.project_id)
            )
            deployments_res = await self.session.execute(deployments_stmt)
            deployment_counts = dict(deployments_res.all())

            for p in projects:
                setattr(p, "models_count", model_counts.get(p.id, 0))
                setattr(p, "datasets_count", dataset_counts.get(p.id, 0))
                setattr(p, "deployments_count", deployment_counts.get(p.id, 0))

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

    async def hard_delete(self, slug_or_id: str) -> bool:
        """Permanently delete a project from database."""
        result = await self.session.execute(
            select(Project).where((Project.slug == slug_or_id) | (Project.id == slug_or_id))
        )
        project = result.scalar_one_or_none()
        if project is None:
            return False

        await self.session.delete(project)
        await self.session.flush()
        return True
