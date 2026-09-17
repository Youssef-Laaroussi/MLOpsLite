"""Asynchronous database engine and session management."""

import os
from collections.abc import AsyncGenerator
from sqlalchemy.ext.asyncio import (
    AsyncEngine,
    AsyncSession,
    async_sessionmaker,
    create_async_engine,
)


def get_db_url() -> str:
    """Retrieve async database connection URL from environment or default."""
    url = os.getenv(
        "DATABASE_URL",
        "postgresql+asyncpg://mlite_user:mlite_secure_password@localhost:5432/mlite_db",
    )
    # Ensure URL uses asyncpg driver if postgresql:// is provided
    if url.startswith("postgresql://"):
        url = url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return url


def create_engine_instance(url: str | None = None) -> AsyncEngine:
    """Create and configure the SQLAlchemy AsyncEngine with connection pooling."""
    db_url = url or get_db_url()

    # Apply pooling options for real database connections
    if "sqlite" in db_url:
        return create_async_engine(db_url, echo=False)

    return create_async_engine(
        db_url,
        echo=False,
        pool_size=int(os.getenv("DB_POOL_SIZE", "20")),
        max_overflow=int(os.getenv("DB_MAX_OVERFLOW", "10")),
        pool_pre_ping=True,
        pool_recycle=3600,
    )


# Global async engine and session factory
engine: AsyncEngine = create_engine_instance()

async_session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
    autocommit=False,
    autoflush=False,
)


async def get_async_session() -> AsyncGenerator[AsyncSession, None]:
    """FastAPI dependency that yields an asynchronous database session.

    Commits automatically on completion and rolls back on exception.
    """
    async with async_session_factory() as session:
        try:
            yield session
            await session.commit()
        except Exception:
            await session.rollback()
            raise
