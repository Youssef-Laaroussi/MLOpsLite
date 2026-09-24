# 🔐 Authentication & API Key Management

> **Component:** `packages/core/security/auth.py`, `apps/api/routers/auth.py`, `apps/cli/commands/auth_cmd.py`  
> **Milestone:** M6 — Security & Governance (Issue #25)  
> **Status:** Production-Ready

---

## Overview

MLite provides a secure, self-hosted authentication subsystem designed for multi-tenant and enterprise deployments:
- **OAuth2 Password Flow with JWT Bearer Tokens:** Short-lived access tokens (default: 60 minutes) signed using HMAC SHA-256 (`HS256`).
- **Refresh Tokens:** Long-lived tokens (default: 7 days) allowing clients to renew sessions seamlessly without storing plaintext user passwords.
- **Argon2 / Bcrypt Password Hashing:** Passwords are never stored in plaintext and are hashed using bcrypt with adaptive work factor salting.
- **Headless API Keys:** Long-lived keys prefixed with `mlite_` stored as cryptographic SHA-256 hashes, ideal for CI/CD pipelines, automated training jobs, and headless scripts.
- **Local CLI Session Store:** `mlite login` saves credentials to `~/.mlite/credentials` with strict `0600` POSIX permissions.

---

## JWT Token Mechanics

```
┌──────────────┐         POST /api/v1/auth/login          ┌──────────────┐
│    Client    │ ───────────────────────────────────────► │  MLite API   │
│ (CLI/Web/App)│                                          │  (FastAPI)   │
│              │ ◄─────────────────────────────────────── │              │
└──────────────┘       access_token (60m) + refresh_token └──────────────┘
       │                                                         │
       │    Authorization: Bearer <access_token>                 │
       ├────────────────────────────────────────────────────────►│ Validates HMAC
       │                                                         │ signature & exp
       │    POST /api/v1/auth/refresh {refresh_token}            │
       └────────────────────────────────────────────────────────►│ Issues new pair
```

### Access Token Claims

The JWT access token payload contains:
```json
{
  "sub": "b2c174f8-4e89-4d62-a521-8f56fa68bdfa",
  "email": "lead@mlite.local",
  "role": "MAINTAINER",
  "type": "access",
  "iat": 1726678800,
  "exp": 1726682400
}
```

---

## Configuration & Environment Variables

| Variable | Description | Default | Production Requirement |
| :--- | :--- | :---: | :--- |
| `MLITE_JWT_SECRET_KEY` | HMAC secret key used to sign and verify JWT tokens | `"mlite-dev-secret-key-..."` | **CRITICAL:** Set to a secure, random 256-bit string (`openssl rand -hex 32`) |
| `MLITE_JWT_ALGORITHM` | JWT signing algorithm | `"HS256"` | `"HS256"` or `"RS256"` |
| `MLITE_JWT_ACCESS_TOKEN_EXPIRE_MINUTES` | Access token lifespan in minutes | `60` | Recommended `15`–`60` |
| `MLITE_JWT_REFRESH_TOKEN_EXPIRE_DAYS` | Refresh token lifespan in days | `7` | Recommended `7`–`30` |

---

## API Endpoints

### 1. User Login
```http
POST /api/v1/auth/login
Content-Type: application/json

{
  "username": "lead@mlite.local",
  "password": "mySecurePassword123"
}
```

**Response (200 OK):**
```json
{
  "access_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "token_type": "bearer",
  "expires_in": 3600
}
```

### 2. Token Refresh
```http
POST /api/v1/auth/refresh
Content-Type: application/json

{
  "refresh_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..."
}
```

### 3. Current User Profile
```http
GET /api/v1/auth/me
Authorization: Bearer <access_token>
```

**Response (200 OK):**
```json
{
  "id": "b2c174f8-4e89-4d62-a521-8f56fa68bdfa",
  "email": "lead@mlite.local",
  "username": "lead",
  "full_name": "Tech Lead",
  "role": "MAINTAINER",
  "permissions": [
    "alert:view",
    "dataset:create",
    "deployment:create",
    "deployment:rollback",
    "model:promote",
    "project:create"
  ]
}
```

---

## Long-Lived API Keys

For headless automated scripts, CI/CD jobs (e.g. GitHub Actions, GitLab CI), and background workers, API keys offer a non-expiring or custom-duration alternative to interactive login.

### Key Characteristics
- **Format:** `mlite_<32 url-safe random characters>` (e.g. `mlite_dGVzdF9zZWNyZXRfa2V5...`).
- **Prefix:** The first 12 characters (`key_prefix`) are stored in plaintext for identification and UI listing.
- **Storage:** Only the SHA-256 hash (`key_hash`) is stored in the PostgreSQL database. The full plaintext key is **only returned once** at generation time.
- **Revocation:** Keys can be instantly revoked via the API or CLI, invalidating subsequent requests immediately.

### API Key Usage
Pass the API key in the `X-API-Key` HTTP header:
```bash
curl -H "X-API-Key: mlite_xxxx..." http://localhost:8000/api/v1/models/
```

Or set the environment variable:
```bash
export MLITE_API_KEY="mlite_xxxx..."
mlite status
```

---

## CLI Usage

### Login
```bash
mlite login
# Prompts for username/email and password interactively
```
Optionally pass parameters:
```bash
mlite login -u lead@mlite.local -p mySecurePassword
```

### Whoami
```bash
mlite whoami
```

### Manage API Keys
```bash
# Generate a key for a CI runner
mlite api-key create "GitHub-Actions-CI"

# List active keys
mlite api-key list

# Revoke a compromised key
mlite api-key revoke <key-id>
```

### Logout
```bash
mlite logout
```
