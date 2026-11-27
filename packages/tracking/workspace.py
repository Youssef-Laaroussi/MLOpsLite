"""Authorize remote MLflow objects before exposing runs, metrics or artifacts."""

import asyncio

from sqlalchemy import select

from apps.api.errors import NotFoundError
from packages.core.models.project import Project
from packages.core.models.workspace import WorkspaceExperiment


async def owned_project(session, slug_or_id):
    if not slug_or_id:
        return None
    project = await session.scalar(select(Project).where(
        (Project.slug == slug_or_id) | (Project.id == slug_or_id),
    ))
    if project is None:
        raise NotFoundError("Project", slug_or_id)
    return project


async def authorize_experiment(client, session, user_id, experiment_id, experiment=None):
    identifier = str(experiment_id)
    # Ownership is immutable once imported. Changing an MLflow project tag cannot
    # transfer a previously owned experiment to another installation account.
    record = await session.scalar(select(WorkspaceExperiment).where(
        WorkspaceExperiment.experiment_id == identifier,
    ).execution_options(workspace_unscoped=True))
    if record is not None:
        if record.owner_id != user_id:
            raise NotFoundError("Experiment", identifier)
        return record
    if experiment is None:
        try:
            experiment = await asyncio.to_thread(client.get_experiment, identifier)
        except Exception as exc:
            raise NotFoundError("Experiment", identifier) from exc
    tags = dict(experiment.tags or {})
    if tags.get("mlite.owner_id") not in (None, user_id):
        raise NotFoundError("Experiment", identifier)
    # Local operators may train directly against the private MLflow service.
    # Import those existing experiments only through an already owned project.
    candidate = tags.get("mlite.project") or experiment.name
    try:
        project = await owned_project(session, candidate)
    except NotFoundError as exc:
        raise NotFoundError("Experiment", identifier) from exc
    if project is None:
        raise NotFoundError("Experiment", identifier)
    record = WorkspaceExperiment(experiment_id=identifier, owner_id=user_id,
                                 project_id=project.id, name=experiment.name)
    session.add(record)
    await session.flush()
    return record


async def authorize_run(client, session, user_id, run_id):
    try:
        run = await asyncio.to_thread(client.get_run, run_id)
    except Exception as exc:
        raise NotFoundError("Run", run_id) from exc
    await authorize_experiment(client, session, user_id, run.info.experiment_id)
    return run


async def visible_experiments(client, session, user_id, project=None):
    selected = await owned_project(session, project)
    visible = []
    token = None
    while True:
        arguments = {"max_results": 1000}
        if token:
            arguments["page_token"] = token
        batch = await asyncio.to_thread(client.search_experiments, **arguments)
        for experiment in batch:
            try:
                record = await authorize_experiment(client, session, user_id, experiment.experiment_id, experiment)
            except NotFoundError:
                continue
            if selected is None or record.project_id == selected.id:
                visible.append((experiment, record))
        token = getattr(batch, "token", None)
        if not isinstance(token, str) or not token:
            return visible
