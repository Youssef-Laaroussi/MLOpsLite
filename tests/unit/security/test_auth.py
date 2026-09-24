"""Unit tests for authentication and JWT mechanics (Issue #25).

Tests:
- Password hashing and verification via bcrypt
- JWT access and refresh token creation and payload structure
- Expiration validation and expired token rejection
- Invalid signature and corrupted token handling
- Long-lived API key generation, prefixing, and hashing
- Local credentials store persistence and header construction
"""

import hashlib
import time
from datetime import timedelta
from unittest.mock import patch

import pytest

from packages.core.models.user import ApiKey
from packages.core.security.auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    decode_token,
    DEFAULT_SECRET_KEY,
)
from apps.cli.credentials import (
    save_credentials,
    load_credentials,
    clear_credentials,
    get_auth_headers,
)


class TestPasswordHashing:
    """Verify password hashing with bcrypt/passlib."""

    def test_hash_and_verify_success(self):
        plain = "super-secret-password-123"
        hashed = hash_password(plain)
        assert hashed != plain
        assert hashed.startswith("$2b$") or hashed.startswith("$2a$")
        assert verify_password(plain, hashed) is True

    def test_verify_failure_wrong_password(self):
        plain = "correct-password"
        hashed = hash_password(plain)
        assert verify_password("wrong-password", hashed) is False

    def test_passwords_produce_unique_salts(self):
        plain = "identical-password"
        hash1 = hash_password(plain)
        hash2 = hash_password(plain)
        assert hash1 != hash2
        assert verify_password(plain, hash1) is True
        assert verify_password(plain, hash2) is True


class TestJWTTokenMechanics:
    """Verify JWT access and refresh token encoding and validation."""

    def test_create_and_decode_access_token(self):
        payload = {"sub": "user-uuid-123", "email": "dev@mlite.local", "role": "DEVELOPER"}
        token = create_access_token(payload)
        assert isinstance(token, str)
        assert len(token.split(".")) == 3

        decoded = decode_token(token)
        assert decoded is not None
        assert decoded["sub"] == "user-uuid-123"
        assert decoded["email"] == "dev@mlite.local"
        assert decoded["role"] == "DEVELOPER"
        assert decoded["type"] == "access"
        assert "exp" in decoded
        assert "iat" in decoded

    def test_create_and_decode_refresh_token(self):
        payload = {"sub": "user-uuid-456", "email": "admin@mlite.local", "role": "ADMIN"}
        token = create_refresh_token(payload)
        decoded = decode_token(token)
        assert decoded is not None
        assert decoded["sub"] == "user-uuid-456"
        assert decoded["type"] == "refresh"

    def test_expired_token_returns_none(self):
        payload = {"sub": "user-uuid-789"}
        # Create token that expired 10 seconds ago
        token = create_access_token(payload, expires_delta=timedelta(seconds=-10))
        decoded = decode_token(token)
        assert decoded is None

    def test_invalid_secret_key_returns_none(self):
        payload = {"sub": "user-uuid-abc"}
        token = create_access_token(payload, secret_key="secret-A")
        # Try decoding with secret-B
        decoded = decode_token(token, secret_key="secret-B")
        assert decoded is None

    def test_corrupted_token_returns_none(self):
        payload = {"sub": "user-uuid-xyz"}
        token = create_access_token(payload)
        corrupted = token[:-5] + "XXXXX"
        decoded = decode_token(corrupted)
        assert decoded is None

    def test_empty_or_malformed_string_returns_none(self):
        assert decode_token("not-a-jwt") is None
        assert decode_token("") is None


class TestApiKeyGeneration:
    """Verify API key formatting, prefixing, and hashing."""

    def test_generate_key_structure(self):
        full_key, prefix, key_hash = ApiKey.generate_key()
        assert full_key.startswith("mlite_")
        assert len(full_key) > 20
        assert prefix == full_key[:12]
        expected_hash = hashlib.sha256(full_key.encode()).hexdigest()
        assert key_hash == expected_hash

    def test_generated_keys_are_cryptographically_unique(self):
        key1, _, hash1 = ApiKey.generate_key()
        key2, _, hash2 = ApiKey.generate_key()
        assert key1 != key2
        assert hash1 != hash2


class TestCredentialsStore:
    """Verify local CLI credential store operations."""

    def test_save_load_clear_credentials(self, tmp_path):
        creds_file = tmp_path / "credentials"
        creds_dir = tmp_path

        with patch("apps.cli.credentials.CREDENTIALS_DIR", creds_dir), \
             patch("apps.cli.credentials.CREDENTIALS_FILE", creds_file):

            assert load_credentials() is None

            data = {"access_token": "mock-jwt-token", "username": "alice"}
            save_credentials(data)

            loaded = load_credentials()
            assert loaded == data

            cleared = clear_credentials()
            assert cleared is True
            assert load_credentials() is None

    def test_get_auth_headers_precedence(self, tmp_path):
        creds_file = tmp_path / "credentials"
        creds_dir = tmp_path

        with patch("apps.cli.credentials.CREDENTIALS_DIR", creds_dir), \
             patch("apps.cli.credentials.CREDENTIALS_FILE", creds_file), \
             patch.dict("os.environ", {}, clear=True):

            # 1. No credentials
            assert get_auth_headers() == {}

            # 2. Local token saved
            save_credentials({"access_token": "my-access-jwt"})
            assert get_auth_headers() == {"Authorization": "Bearer my-access-jwt"}

            # 3. Environment variable MLITE_API_KEY takes precedence
            with patch.dict("os.environ", {"MLITE_API_KEY": "mlite_api_key_override"}):
                assert get_auth_headers() == {"X-API-Key": "mlite_api_key_override"}
