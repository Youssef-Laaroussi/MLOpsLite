"""Custom middleware stack for the MLite API."""

import logging
import time
import uuid
from collections import defaultdict, deque

from fastapi import FastAPI, Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware, RequestResponseEndpoint

logger = logging.getLogger("mlite.api")


class RequestIDMiddleware(BaseHTTPMiddleware):
    """Attach a unique request-id header to every response for traceability."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        request_id = request.headers.get("X-Request-ID", str(uuid.uuid4()))
        request.state.request_id = request_id
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        return response


class RequestLoggingMiddleware(BaseHTTPMiddleware):
    """Log incoming requests and their duration."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start = time.perf_counter()
        response = await call_next(request)
        elapsed_ms = (time.perf_counter() - start) * 1000
        logger.info(
            "%s %s → %d (%.1fms)",
            request.method,
            request.url.path,
            response.status_code,
            elapsed_ms,
        )
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """Inject industry-standard HTTP security hardening headers to protect API clients."""

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "geolocation=(), camera=(), microphone=()"
        if request.url.scheme == "https" or request.headers.get("x-forwarded-proto") == "https":
            response.headers["Strict-Transport-Security"] = "max-age=63072000; includeSubDomains"
        return response


class AuthRateLimitMiddleware(BaseHTTPMiddleware):
    """Sliding-window limiter on credential endpoints to block brute-force attacks.

    Per-process memory: behind multiple replicas, also enforce limits at the
    reverse proxy / API gateway (or swap this store for Redis).
    """

    PATHS = ("/api/v1/auth/login", "/api/v1/auth/register", "/api/v1/auth/refresh")

    def __init__(self, app, limit: int = 10, window_s: float = 60.0) -> None:
        super().__init__(app)
        self.limit, self.window = limit, window_s
        self.hits: dict[str, deque[float]] = defaultdict(deque)

    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        if request.method == "POST" and request.url.path in self.PATHS:
            ip = request.client.host if request.client else "unknown"
            now, q = time.monotonic(), self.hits[f"{ip}:{request.url.path}"]
            while q and now - q[0] > self.window:
                q.popleft()
            if len(q) >= self.limit:
                retry = int(self.window - (now - q[0])) + 1
                return JSONResponse(
                    {"detail": "Too many attempts. Try again later."},
                    status_code=429,
                    headers={"Retry-After": str(retry)},
                )
            q.append(now)
            if len(self.hits) > 50_000:  # bound memory under IP-spray attacks
                self.hits.clear()
        return await call_next(request)


def register_middleware(app: FastAPI) -> None:
    """Register all custom middleware layers on the application instance."""
    # Outermost first – order matters
    app.add_middleware(SecurityHeadersMiddleware)
    app.add_middleware(AuthRateLimitMiddleware)
    app.add_middleware(RequestIDMiddleware)
    app.add_middleware(RequestLoggingMiddleware)
