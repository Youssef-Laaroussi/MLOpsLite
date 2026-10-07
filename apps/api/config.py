import os
from functools import lru_cache

from pydantic import model_validator
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
    debug: bool = os.getenv("DEBUG", "false").lower() in ("true", "1", "yes")
    log_level: str = os.getenv("LOG_LEVEL", "INFO")
    environment: str = os.getenv("ENVIRONMENT", "development")

    # ── Server ───────────────────────────────────────────────
    host: str = os.getenv("API_HOST", "0.0.0.0")  # nosec
    port: int = int(os.getenv("API_PORT", "8000"))
    allowed_origins: list[str] = (
        [origin.strip() for origin in os.getenv("ALLOWED_ORIGINS", "").split(",") if origin.strip()]
        if os.getenv("ALLOWED_ORIGINS")
        else [
            "http://localhost:3000",
            "http://127.0.0.1:3000",
            "http://localhost:5173",
            "http://127.0.0.1:5173",
            "http://localhost:8000",
            "http://127.0.0.1:8000",
        ]
    )

    # ── Database ─────────────────────────────────────────────
    database_url: str = os.getenv(
        "DATABASE_URL",
        "sqlite+aiosqlite:///./mlite.db",
    )
    db_pool_size: int = 20
    db_max_overflow: int = 10

    # ── MinIO / S3 ───────────────────────────────────────────
    minio_endpoint: str = os.getenv("MINIO_ENDPOINT", "http://localhost:9000")
    minio_root_user: str = os.getenv("MINIO_ROOT_USER", "mlite_minio_admin")
    minio_root_password: str = os.getenv("MINIO_ROOT_PASSWORD", "mlite_minio_password")
    minio_datasets_bucket: str = os.getenv("MINIO_DATASETS_BUCKET", "mlite-datasets")

    # ── MLflow ───────────────────────────────────────────────
    mlflow_tracking_uri: str = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")

    # ── Security & Authentication (Issues #25, #26) ───────────
    jwt_secret_key: str = os.getenv(
        "SECRET_KEY",
        os.getenv(
            "JWT_SECRET_KEY",
            os.getenv("MLITE_JWT_SECRET_KEY", "mlite-dev-secret-key-change-in-production"),
        ),
    )
    jwt_algorithm: str = os.getenv("JWT_ALGORITHM", "HS256")
    jwt_access_token_expire_minutes: int = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
    jwt_refresh_token_expire_days: int = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))
    admin_user: str = os.getenv("ADMIN_USER", os.getenv("MLITE_ADMIN_USER", "admin"))
    admin_email: str = os.getenv("ADMIN_EMAIL", os.getenv("MLITE_ADMIN_EMAIL", "admin@mlite.local"))
    admin_password: str = os.getenv(
        "ADMIN_PASSWORD", os.getenv("MLITE_ADMIN_PASSWORD", "admin123456")
    )

    @model_validator(mode="after")
    def validate_production_security(self) -> "Settings":
        """Fail-safe check: prevent insecure defaults in production."""
        if self.environment.lower() in ("production", "prod"):
            if self.jwt_secret_key == "mlite-dev-secret-key-change-in-production":
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION: In production, SECRET_KEY must be "
                    "explicitly set to a secure secret (e.g. openssl rand -hex 32)."
                )
            if self.admin_password == "admin123456":
                raise ValueError(
                    "CRITICAL SECURITY CONFIGURATION: In production, ADMIN_PASSWORD must be "
                    "configured and not use the default developer password."
                )
        return self


@lru_cache
def get_settings() -> Settings:
    """Singleton factory – cached for the lifetime of the process."""
    return Settings()
