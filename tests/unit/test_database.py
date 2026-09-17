"""Unit tests for SQLAlchemy async database models, session management, and mixins."""

import pytest
from sqlalchemy import String, select
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.ext.asyncio import AsyncSession, create_async_engine, async_sessionmaker

from packages.core.db.base import Base, TimestampMixin, UUIDMixin
from packages.core.db.session import get_db_url, create_engine_instance


class SampleModel(Base, UUIDMixin, TimestampMixin):
    """Test model inheriting from Base and mixins."""

    __tablename__ = "test_sample_models"

    name: Mapped[str] = mapped_column(String(50), nullable=False)


@pytest.mark.asyncio
async def test_base_model_uuid_and_timestamp_mixins() -> None:
    """Verify that models correctly inherit UUID and timestamps."""
    # Use in-memory SQLite with aiosqlite for unit tests
    test_engine = create_async_engine("sqlite+aiosqlite:///:memory:", echo=False)

    async with test_engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    test_session_factory = async_sessionmaker(
        bind=test_engine,
        class_=AsyncSession,
        expire_on_commit=False,
    )

    async with test_session_factory() as session:
        # Create an instance
        model_instance = SampleModel(name="test-project")
        session.add(model_instance)
        await session.commit()

        # Query back
        stmt = select(SampleModel).where(SampleModel.name == "test-project")
        result = await session.execute(stmt)
        retrieved = result.scalar_one_or_none()

        assert retrieved is not None
        assert retrieved.name == "test-project"
        assert len(retrieved.id) == 36  # UUID length
        assert retrieved.created_at is not None
        assert retrieved.updated_at is not None

    await test_engine.dispose()


def test_get_db_url_formatting() -> None:
    """Verify database URL formats properly with asyncpg driver."""
    url = get_db_url()
    assert "asyncpg" in url or "sqlite" in url


def test_create_engine_instance() -> None:
    """Verify engine instance configuration."""
    engine_inst = create_engine_instance("sqlite+aiosqlite:///:memory:")
    assert engine_inst is not None
