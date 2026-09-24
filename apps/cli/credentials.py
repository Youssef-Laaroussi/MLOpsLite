"""Credentials store for MLite CLI (Issue #25).

Manages local session token at ~/.mlite/credentials with secure permissions.
"""

import json
import os
from pathlib import Path
from typing import Any, Optional

CREDENTIALS_DIR = Path.home() / ".mlite"
CREDENTIALS_FILE = CREDENTIALS_DIR / "credentials"


def save_credentials(data: dict[str, Any]) -> None:
    """Save authentication credentials to ~/.mlite/credentials with 0600 permissions."""
    CREDENTIALS_DIR.mkdir(mode=0o700, parents=True, exist_ok=True)
    CREDENTIALS_FILE.write_text(json.dumps(data, indent=2))
    try:
        CREDENTIALS_FILE.chmod(0o600)
    except OSError:
        pass


def load_credentials() -> Optional[dict[str, Any]]:
    """Load credentials from ~/.mlite/credentials if available."""
    if not CREDENTIALS_FILE.exists():
        return None
    try:
        return json.loads(CREDENTIALS_FILE.read_text())
    except (json.JSONDecodeError, OSError):
        return None


def clear_credentials() -> bool:
    """Delete ~/.mlite/credentials."""
    if CREDENTIALS_FILE.exists():
        try:
            CREDENTIALS_FILE.unlink()
            return True
        except OSError:
            return False
    return False


def get_auth_headers() -> dict[str, str]:
    """Return HTTP headers for authentication (Bearer token or X-API-Key).

    Precedence:
    1. MLITE_API_KEY environment variable (headless / CI/CD)
    2. Bearer access token from ~/.mlite/credentials
    3. Empty dict (unauthenticated)
    """
    api_key = os.getenv("MLITE_API_KEY")
    if api_key:
        return {"X-API-Key": api_key}

    creds = load_credentials()
    if creds and "access_token" in creds:
        return {"Authorization": f"Bearer {creds['access_token']}"}

    return {}
