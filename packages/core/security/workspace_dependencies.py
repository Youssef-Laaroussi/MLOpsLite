"""FastAPI entry point for private operational sessions."""

from fastapi import Depends
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from packages.core.models.user import User
from packages.core.security.dependencies import get_current_user
from packages.core.security.workspace import SCOPE_KEY


async def get_workspace_db(
    current_user: User = Depends(get_current_user),
    session: AsyncSession = Depends(get_db),
) -> AsyncSession:
    session.info[SCOPE_KEY] = current_user.id
    return session
