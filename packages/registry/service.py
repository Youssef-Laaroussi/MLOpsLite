"""Model Registry service — business logic for model registration, versioning, and promotion."""

from sqlalchemy import select, func
from sqlalchemy.ext.asyncio import AsyncSession

from packages.core.models.model_registry import (
    RegisteredModel,
    ModelVersion,
    ModelStage,
)


class ModelRegistryService:
    """Encapsulates model registry lifecycle operations."""

    def __init__(self, session: AsyncSession) -> None:
        self.session = session

    # ── Model registration ──────────────────────────────────

    async def register_model(
        self,
        name: str,
        run_id: str | None = None,
        project_id: str | None = None,
        description: str | None = None,
        metrics: dict | None = None,
        artifact_path: str | None = None,
    ) -> ModelVersion:
        """Register a new model or add a version to an existing model.

        Automatically increments the version number.
        """
        # Get or create the registered model
        result = await self.session.execute(
            select(RegisteredModel).where(RegisteredModel.name == name)
        )
        model = result.scalar_one_or_none()

        if model is None:
            model = RegisteredModel(
                name=name,
                project_id=project_id,
                description=description,
            )
            self.session.add(model)
            await self.session.flush()

        # Determine next version number
        version_result = await self.session.execute(
            select(func.max(ModelVersion.version)).where(
                ModelVersion.model_id == model.id
            )
        )
        max_version = version_result.scalar() or 0
        next_version = max_version + 1

        # Create model version
        version = ModelVersion(
            model_id=model.id,
            version=next_version,
            stage=ModelStage.DEVELOPMENT,
            mlflow_run_id=run_id,
            mlflow_model_uri=f"runs:/{run_id}/model" if run_id else None,
            artifact_path=artifact_path,
            metrics=metrics or {},
            description=description,
        )
        self.session.add(version)
        await self.session.flush()
        await self.session.refresh(version)
        return version

    # ── Listing ─────────────────────────────────────────────

    async def list_models(
        self,
        project_id: str | None = None,
    ) -> list[RegisteredModel]:
        """List all registered models, optionally filtered by project."""
        query = select(RegisteredModel).order_by(RegisteredModel.created_at.desc())
        if project_id:
            query = query.where(RegisteredModel.project_id == project_id)
        result = await self.session.execute(query)
        return list(result.scalars().all())

    async def get_model_by_name(self, name: str) -> RegisteredModel | None:
        """Get a registered model by name."""
        result = await self.session.execute(
            select(RegisteredModel).where(RegisteredModel.name == name)
        )
        return result.scalar_one_or_none()

    async def get_versions(
        self, model_name: str
    ) -> list[ModelVersion]:
        """Get all versions of a registered model."""
        model = await self.get_model_by_name(model_name)
        if model is None:
            return []

        result = await self.session.execute(
            select(ModelVersion)
            .where(ModelVersion.model_id == model.id)
            .order_by(ModelVersion.version.desc())
        )
        return list(result.scalars().all())

    async def get_version(
        self, model_name: str, version_number: int
    ) -> ModelVersion | None:
        """Get a specific version of a model."""
        model = await self.get_model_by_name(model_name)
        if model is None:
            return None

        result = await self.session.execute(
            select(ModelVersion).where(
                ModelVersion.model_id == model.id,
                ModelVersion.version == version_number,
            )
        )
        return result.scalar_one_or_none()

    # ── Promotion ───────────────────────────────────────────

    async def promote(
        self,
        model_name: str,
        version_number: int,
        target_stage: ModelStage,
    ) -> ModelVersion | None:
        """Promote a model version to a new stage.

        If promoting to PRODUCTION, automatically demotes the current
        production version to ARCHIVED.
        """
        model = await self.get_model_by_name(model_name)
        if model is None:
            return None

        version = await self.get_version(model_name, version_number)
        if version is None:
            return None

        # Automatic demotion: only one PRODUCTION version allowed
        if target_stage == ModelStage.PRODUCTION:
            current_prod = await self.session.execute(
                select(ModelVersion).where(
                    ModelVersion.model_id == model.id,
                    ModelVersion.stage == ModelStage.PRODUCTION,
                )
            )
            for prod_version in current_prod.scalars().all():
                prod_version.stage = ModelStage.ARCHIVED

        version.stage = target_stage
        await self.session.flush()
        await self.session.refresh(version)
        return version

    # ── Comparison ──────────────────────────────────────────

    async def compare_versions(
        self,
        model_name: str,
        v1: int,
        v2: int,
    ) -> dict:
        """Compare metrics between two model versions."""
        version1 = await self.get_version(model_name, v1)
        version2 = await self.get_version(model_name, v2)

        return {
            "model_name": model_name,
            "v1": v1,
            "v2": v2,
            "v1_stage": version1.stage.value if version1 else None,
            "v2_stage": version2.stage.value if version2 else None,
            "v1_metrics": version1.metrics if version1 else {},
            "v2_metrics": version2.metrics if version2 else {},
        }
