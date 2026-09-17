"""FastAPI dependency injection providers."""

from collections.abc import AsyncGenerator

from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.config import Settings, get_settings


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    """Yield an async database session with auto-commit / rollback.

    Import is deferred to avoid requiring asyncpg at module-load time
    (allows unit tests to run without a real PostgreSQL driver).
    """
    from packages.core.db.session import async_session_factory

    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise


def get_storage():
    """Return a configured MinIO / S3 storage client."""
    from packages.core.storage.client import StorageClient

    settings = get_settings()
    return StorageClient(
        endpoint_url=settings.minio_endpoint,
        access_key=settings.minio_root_user,
        secret_key=settings.minio_root_password,
        default_bucket=settings.minio_datasets_bucket,
    )


def get_app_settings() -> Settings:
    """Explicit dependency for injecting settings into route handlers."""
    return get_settings()
