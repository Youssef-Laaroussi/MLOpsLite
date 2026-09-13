# #25 — Add JWT authentication, user accounts, and API key management

> **Milestone:** M6 — Security  
> **Priority:** `P2`  
> **Labels:** `security` `P2`  

---

## Problem
During initial MVP development, endpoints may operate in trusted local networks without authentication. However, deploying MLite in shared company infrastructure or remote servers requires securing API endpoints, CLI operations, and the Web UI against unauthorized access.

## Objective
Implement a secure, self-hosted authentication system using OAuth2 password flow with JWT bearer tokens, argon2/bcrypt password hashing, and long-lived API keys for headless CLI and automated CI/CD pipelines.

## Proposed solution
Create `User` and `ApiKey` database entities. Implement authentication endpoints under `/api/v1/auth`: `/login` (generates access and refresh tokens), `/refresh`, `/me`, and `/api-keys` (create/revoke scoped keys). Add FastAPI security dependencies enforcing authentication on protected routes.

## Technical requirements
- Password hashing using `passlib` with `bcrypt` or `argon2`.
- JWT token generation using `PyJWT` or `python-jose` with HS256/RS256 signing, configurable expiration (default 60 mins).
- Long-lived API Keys prefixed with `mlite_` stored as cryptographic SHA-256 hashes.
- FastAPI dependency `get_current_user` extracting credentials from Bearer token or `X-API-Key` header.
- CLI command `mlite login` saving session token to local credentials store `~/.mlite/credentials`.

## Acceptance criteria
- Protected API endpoints return HTTP 401 Unauthorized when requested without a valid token or API key.
- Logging in via `mlite login` validates credentials and enables subsequent CLI calls.
- API keys can be generated with expiration dates and revoked instantly.
- Passwords are never logged or stored in plain text.

## Tests
- Unit tests in `tests/unit/security/test_auth.py` verifying password hashing, JWT generation, expiration validation, and invalid signatures.
- Integration tests verifying API key authentication and revocation.

## Documentation
- Write `docs/security/authentication.md` explaining JWT token mechanics, API key generation, and CLI login.
- Provide instructions for setting `JWT_SECRET_KEY` in production.

## Dependencies
Issue #3 (PostgreSQL), Issue #6 (FastAPI Core).
