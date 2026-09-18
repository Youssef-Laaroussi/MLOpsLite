"""Pydantic v2 schemas for authentication, users, API keys, and audit logs."""

from datetime import datetime
from typing import Any

from pydantic import BaseModel, Field, EmailStr

from packages.core.models.user import UserRole
from packages.core.models.audit import AuditAction


# ── Authentication ──────────────────────────────────────────────

class LoginRequest(BaseModel):
    """OAuth2 password flow login payload."""

    username: str = Field(..., min_length=1, max_length=100)
    password: str = Field(..., min_length=1, max_length=200)


class TokenResponse(BaseModel):
    """JWT token pair response."""

    access_token: str
    refresh_token: str
    token_type: str = "bearer"
    expires_in: int = Field(description="Access token lifetime in seconds")


class RefreshRequest(BaseModel):
    """Refresh token request."""

    refresh_token: str


# ── User Management ────────────────────────────────────────────

class UserCreate(BaseModel):
    """Payload to create a new user account."""

    email: str = Field(..., min_length=5, max_length=255)
    username: str = Field(..., min_length=3, max_length=100, pattern=r"^[a-zA-Z0-9_-]+$")
    password: str = Field(..., min_length=8, max_length=200)
    full_name: str | None = Field(None, max_length=200)
    role: UserRole = UserRole.DEVELOPER


class UserUpdate(BaseModel):
    """Payload to update user details."""

    full_name: str | None = None
    role: UserRole | None = None
    is_active: bool | None = None


class UserResponse(BaseModel):
    """User account response (never includes password)."""

    id: str
    email: str
    username: str
    full_name: str | None
    role: UserRole
    is_active: bool
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class UserListResponse(BaseModel):
    """List of users."""

    users: list[UserResponse]
    total: int


class UserMeResponse(BaseModel):
    """Current user profile with permissions."""

    id: str
    email: str
    username: str
    full_name: str | None
    role: UserRole
    permissions: list[str]

    model_config = {"from_attributes": True}


# ── API Keys ────────────────────────────────────────────────────

class ApiKeyCreate(BaseModel):
    """Payload to create a new API key."""

    name: str = Field(..., min_length=1, max_length=100)
    expires_at: datetime | None = None
    scopes: dict[str, Any] | None = None


class ApiKeyResponse(BaseModel):
    """API key response (full key only shown once at creation)."""

    id: str
    name: str
    key_prefix: str
    key: str | None = Field(None, description="Full key — only returned at creation time")
    scopes: dict[str, Any] | None
    expires_at: datetime | None
    is_revoked: bool
    last_used_at: datetime | None
    created_at: datetime

    model_config = {"from_attributes": True}


class ApiKeyListResponse(BaseModel):
    """List of API keys (without full key values)."""

    api_keys: list[ApiKeyResponse]
    total: int


# ── Audit Logs ──────────────────────────────────────────────────

class AuditLogResponse(BaseModel):
    """Response for a single audit log entry."""

    id: str
    user_id: str | None
    user_email: str | None
    ip_address: str | None
    action: AuditAction
    resource_type: str
    resource_id: str | None
    resource_name: str | None
    changes_json: dict[str, Any] | None
    timestamp: datetime

    model_config = {"from_attributes": True}


class AuditLogListResponse(BaseModel):
    """Paginated audit log list."""

    logs: list[AuditLogResponse]
    total: int
