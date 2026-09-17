"""Dataset and DatasetVersion SQLAlchemy models."""

import enum
from sqlalchemy import (
    Enum as SAEnum,
    ForeignKey,
    Integer,
    BigInteger,
    String,
    Text,
    JSON,
)
from sqlalchemy.orm import Mapped, mapped_column, relationship

from packages.core.db.base import Base, UUIDMixin, TimestampMixin


class DatasetFormat(str, enum.Enum):
    """Supported tabular data file formats."""

    CSV = "CSV"
    PARQUET = "PARQUET"
    JSON = "JSON"
    DELTA = "DELTA"
    OTHER = "OTHER"


class Dataset(Base, UUIDMixin, TimestampMixin):
    """Logical dataset container tracking lineage and versions."""

    __tablename__ = "datasets"

    project_id: Mapped[str | None] = mapped_column(
        String(36), ForeignKey("projects.id", ondelete="SET NULL"), nullable=True, index=True
    )
    name: Mapped[str] = mapped_column(
        String(200), nullable=False, index=True, doc="Unique dataset name within project"
    )
    format: Mapped[DatasetFormat] = mapped_column(
        SAEnum(DatasetFormat, name="dataset_format", create_constraint=True),
        default=DatasetFormat.CSV,
        server_default="CSV",
        nullable=False,
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    versions: Mapped[list["DatasetVersion"]] = relationship(
        "DatasetVersion", back_populates="dataset", cascade="all, delete-orphan", order_by="desc(DatasetVersion.version_num)"
    )


class DatasetVersion(Base, UUIDMixin, TimestampMixin):
    """Immutable, content-hashed version of a registered dataset."""

    __tablename__ = "dataset_versions"

    dataset_id: Mapped[str] = mapped_column(
        String(36), ForeignKey("datasets.id", ondelete="CASCADE"), nullable=False, index=True
    )
    version_num: Mapped[int] = mapped_column(
        Integer, nullable=False, doc="Sequential version number (1, 2, ...)"
    )
    hash_sha256: Mapped[str] = mapped_column(
        String(64), nullable=False, index=True, doc="SHA-256 cryptographic hash of raw file"
    )
    row_count: Mapped[int] = mapped_column(
        BigInteger, default=0, nullable=False, doc="Total number of rows"
    )
    column_count: Mapped[int] = mapped_column(
        Integer, default=0, nullable=False, doc="Total number of columns"
    )
    size_bytes: Mapped[int] = mapped_column(
        BigInteger, default=0, nullable=False, doc="File size in bytes"
    )
    schema_json: Mapped[dict | None] = mapped_column(
        JSON, nullable=True, doc="Column names, inferred types, null counts"
    )
    s3_key: Mapped[str | None] = mapped_column(
        String(500), nullable=True, doc="S3/MinIO storage path (e.g. s3://mlite-datasets/...)"
    )
    description: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Relationships
    dataset: Mapped["Dataset"] = relationship(
        "Dataset", back_populates="versions"
    )
