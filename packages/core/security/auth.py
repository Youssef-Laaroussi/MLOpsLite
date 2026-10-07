"""Password hashing and JWT token management (Issue #25).

Provides:
- Bcrypt password hashing via passlib
- JWT access/refresh token generation and validation
- Token payload parsing with expiry enforcement
"""

import logging
import os
from datetime import UTC, datetime, timedelta
from typing import Any

import bcrypt

logger = logging.getLogger(__name__)

# ── Password Hashing ────────────────────────────────────────────


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    pw_bytes = plain_password.encode("utf-8")[:72]
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(pw_bytes, salt).decode("utf-8")


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    try:
        pw_bytes = plain_password.encode("utf-8")[:72]
        return bcrypt.checkpw(pw_bytes, hashed_password.encode("utf-8"))
    except Exception:
        return False


# ── JWT Token Management ────────────────────────────────────────

# Default settings (dynamically loads SECRET_KEY from environment with dev fallback)
DEFAULT_SECRET_KEY = os.getenv(
    "SECRET_KEY",
    os.getenv(
        "JWT_SECRET_KEY",
        os.getenv("MLITE_JWT_SECRET_KEY", "mlite-dev-secret-key-change-in-production"),
    ),
)
DEFAULT_ALGORITHM = os.getenv("JWT_ALGORITHM", "HS256")
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
DEFAULT_REFRESH_TOKEN_EXPIRE_DAYS = int(os.getenv("REFRESH_TOKEN_EXPIRE_DAYS", "7"))


def create_access_token(
    data: dict[str, Any],
    secret_key: str = DEFAULT_SECRET_KEY,
    algorithm: str = DEFAULT_ALGORITHM,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT access token.

    Args:
        data: Payload claims (must include 'sub' with user identifier).
        secret_key: HMAC secret key for signing.
        algorithm: JWT algorithm (default HS256).
        expires_delta: Custom expiration. Defaults to 60 minutes.

    Returns:
        Encoded JWT string.
    """
    from jose import jwt

    to_encode = data.copy()
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(minutes=DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.now(UTC),
            "type": "access",
        }
    )
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def create_refresh_token(
    data: dict[str, Any],
    secret_key: str = DEFAULT_SECRET_KEY,
    algorithm: str = DEFAULT_ALGORITHM,
    expires_delta: timedelta | None = None,
) -> str:
    """Create a JWT refresh token (longer-lived)."""
    from jose import jwt

    to_encode = data.copy()
    expire = datetime.now(UTC) + (
        expires_delta or timedelta(days=DEFAULT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update(
        {
            "exp": expire,
            "iat": datetime.now(UTC),
            "type": "refresh",
        }
    )
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def decode_token(
    token: str,
    secret_key: str = DEFAULT_SECRET_KEY,
    algorithm: str = DEFAULT_ALGORITHM,
) -> dict[str, Any] | None:
    """Decode and validate a JWT token.

    Returns:
        Decoded payload dict, or None if the token is invalid/expired.
    """
    from jose import JWTError, jwt

    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        return payload
    except JWTError as exc:
        logger.debug("JWT decode failed: %s", exc)
        return None
