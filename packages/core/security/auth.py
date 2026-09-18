"""Password hashing and JWT token management (Issue #25).

Provides:
- Bcrypt password hashing via passlib
- JWT access/refresh token generation and validation
- Token payload parsing with expiry enforcement
"""

import logging
from datetime import datetime, timezone, timedelta
from typing import Any, Optional

from passlib.context import CryptContext

logger = logging.getLogger(__name__)

# ── Password Hashing ────────────────────────────────────────────

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(plain_password: str) -> str:
    """Hash a plaintext password using bcrypt."""
    return pwd_context.hash(plain_password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a plaintext password against its bcrypt hash."""
    return pwd_context.verify(plain_password, hashed_password)


# ── JWT Token Management ────────────────────────────────────────

# Default settings (overridden via Settings in production)
DEFAULT_SECRET_KEY = "mlite-dev-secret-key-change-in-production"
DEFAULT_ALGORITHM = "HS256"
DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES = 60
DEFAULT_REFRESH_TOKEN_EXPIRE_DAYS = 7


def create_access_token(
    data: dict[str, Any],
    secret_key: str = DEFAULT_SECRET_KEY,
    algorithm: str = DEFAULT_ALGORITHM,
    expires_delta: Optional[timedelta] = None,
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
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(minutes=DEFAULT_ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "access",
    })
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def create_refresh_token(
    data: dict[str, Any],
    secret_key: str = DEFAULT_SECRET_KEY,
    algorithm: str = DEFAULT_ALGORITHM,
    expires_delta: Optional[timedelta] = None,
) -> str:
    """Create a JWT refresh token (longer-lived)."""
    from jose import jwt

    to_encode = data.copy()
    expire = datetime.now(timezone.utc) + (
        expires_delta or timedelta(days=DEFAULT_REFRESH_TOKEN_EXPIRE_DAYS)
    )
    to_encode.update({
        "exp": expire,
        "iat": datetime.now(timezone.utc),
        "type": "refresh",
    })
    return jwt.encode(to_encode, secret_key, algorithm=algorithm)


def decode_token(
    token: str,
    secret_key: str = DEFAULT_SECRET_KEY,
    algorithm: str = DEFAULT_ALGORITHM,
) -> Optional[dict[str, Any]]:
    """Decode and validate a JWT token.

    Returns:
        Decoded payload dict, or None if the token is invalid/expired.
    """
    from jose import jwt, JWTError

    try:
        payload = jwt.decode(token, secret_key, algorithms=[algorithm])
        return payload
    except JWTError as exc:
        logger.debug("JWT decode failed: %s", exc)
        return None
