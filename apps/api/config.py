"""Application settings loaded from environment variables via pydantic-settings."""

from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    """Central configuration for the MLite API.

    All values fall back to sensible defaults suitable for local
    docker-compose development.
    """

    model_config = SettingsConfigDict(
        env_prefix="MLITE_",
        env_file=".env",
        env_file_encoding="utf-8",
        extra="ignore",
    )

    # ── Application ──────────────────────────────────────────
    app_name: str = "MLite API"
    app_version: str = "0.1.0"
    debug: bool = False
    log_level: str = "INFO"

    # ── Server ───────────────────────────────────────────────
    host: str = "0.0.0.0"
    port: int = 8000
    allowed_origins: list[str] = ["*"]

    # ── Database ─────────────────────────────────────────────
    database_url: str = (
        "postgresql+asyncpg://mlite_user:mlite_secure_password@localhost:5432/mlite_db"
    )
    db_pool_size: int = 20
    db_max_overflow: int = 10

    # ── MinIO / S3 ───────────────────────────────────────────
    minio_endpoint: str = "http://localhost:9000"
    minio_root_user: str = "mlite_minio_admin"
    minio_root_password: str = "mlite_minio_password"
    minio_datasets_bucket: str = "mlite-datasets"

    # ── MLflow ───────────────────────────────────────────────
    mlflow_tracking_uri: str = "http://localhost:5000"


@lru_cache
def get_settings() -> Settings:
    """Singleton factory – cached for the lifetime of the process."""
    return Settings()
