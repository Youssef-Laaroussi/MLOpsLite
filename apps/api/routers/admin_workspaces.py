"""Explicit recovery of unassigned legacy resources, outside personal workspaces."""

import asyncio
from typing import Literal

from fastapi import APIRouter, Depends, HTTPException, Request
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.core.models.alert import Alert, AlertRule, NotificationChannel
from packages.core.models.audit import AuditAction
from packages.core.models.dataset import Dataset
from packages.core.models.deployment import Deployment
from packages.core.models.model_registry import RegisteredModel
from packages.core.models.project import Project, ProjectMembership, ProjectRole
from packages.core.models.user import User, UserRole
from packages.core.models.workspace import WorkspaceExperiment
from packages.core.security.audit import AuditService
from packages.core.security.dependencies import get_current_user, require_role

router = APIRouter(prefix="/api/v1/admin/workspaces", tags=["Workspace recovery"],
                   dependencies=[Depends(require_role(UserRole.ADMIN))])
RESOURCES = {"dataset": Dataset, "model": RegisteredModel, "deployment": Deployment,
             "alert": Alert, "rule": AlertRule, "channel": NotificationChannel}


class AssignResource(BaseModel):
    kind: Literal["dataset", "model", "deployment", "alert", "rule", "channel", "experiment"]
    resource_id: str
    username: str
    model_config = {"extra": "forbid"}


@router.get("/unassigned")
async def list_unassigned(db: AsyncSession = Depends(get_db)):
    result = {}
    for kind, model in RESOURCES.items():
        rows = (await db.scalars(select(model).where(model.owner_id.is_(None)))).all()
        result[kind] = [{"id": row.id, "name": getattr(row, "name", None) or getattr(row, "model_name", None) or getattr(row, "title", None)} for row in rows]
    from packages.tracking.mlflow_client import MLiteMLflowManager
    client = MLiteMLflowManager().client
    assigned = set((await db.scalars(select(WorkspaceExperiment.experiment_id))).all())
    remote = await asyncio.to_thread(client.search_experiments, max_results=1000)
    result["experiment"] = [{"id": exp.experiment_id, "name": exp.name} for exp in remote if str(exp.experiment_id) not in assigned]
    return result


@router.post("/assign")
async def assign_resource(payload: AssignResource, request: Request,
                          db: AsyncSession = Depends(get_db), actor: User = Depends(get_current_user)):
    user = await db.scalar(select(User).where(User.username == payload.username, User.is_active.is_(True)))
    if user is None:
        raise NotFoundError("Active account", payload.username)
    if payload.kind == "experiment":
        if await db.get(WorkspaceExperiment, payload.resource_id):
            raise HTTPException(409, "This experiment already has an owner.")
        from packages.tracking.mlflow_client import MLiteMLflowManager
        client = MLiteMLflowManager().client
        try:
            experiment = await asyncio.to_thread(client.get_experiment, payload.resource_id)
        except Exception as exc:
            raise NotFoundError("Experiment", payload.resource_id) from exc
        tags = dict(experiment.tags or {})
        if tags.get("mlite.owner_id") not in (None, user.id):
            raise HTTPException(409, "The remote experiment already identifies another owner.")
        project = await db.scalar(select(Project).where(Project.slug == tags.get("mlite.project", experiment.name)))
        project_id = project.id if project else None
        record = WorkspaceExperiment(experiment_id=payload.resource_id, name=experiment.name,
                                     project_id=project_id, owner_id=user.id)
    else:
        model = RESOURCES[payload.kind]
        record = await db.get(model, payload.resource_id)
        if record is None:
            raise NotFoundError(payload.kind, payload.resource_id)
        if record.owner_id is not None:
            raise HTTPException(409, "This resource already has an owner; recovery never transfers owned data.")
        project_id = getattr(record, "project_id", None)
    if project_id:
        owner = await db.scalar(select(ProjectMembership.user_id).where(
            ProjectMembership.project_id == project_id, ProjectMembership.project_role == ProjectRole.OWNER,
        ))
        if owner != user.id:
            raise HTTPException(409, "Assign this resource to its established project owner.")
    record.owner_id = user.id
    db.add(record)
    await db.flush()
    await AuditService(db).log(action=AuditAction.USER_UPDATE, resource_type="user",
        resource_id=user.id, resource_name=user.username, user_id=actor.id, user_email=actor.email,
        ip_address=request.client.host if request.client else None,
        changes={"workspace_resource_assignment": {"kind": payload.kind, "id": payload.resource_id}})
    return {"assigned": True, "kind": payload.kind, "resource_id": payload.resource_id, "username": user.username}
