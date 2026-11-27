"""Request-local ORM isolation, including aggregates, relationships and writes.

Only sessions explicitly marked by the authenticated workspace dependency are
scoped. Administrative endpoints, migrations and background workers use separate
unscoped sessions. Administrator roles never bypass a workspace's owner boundary.
"""

from sqlalchemy import and_, event, inspect, or_, select
from sqlalchemy.orm import Session, with_loader_criteria

from apps.api.errors import NotFoundError
from packages.core.models.alert import Alert, AlertRule, NotificationChannel
from packages.core.models.dataset import Dataset, DatasetVersion
from packages.core.models.deployment import Deployment, DeploymentMetric
from packages.core.models.model_registry import ModelVersion, RegisteredModel
from packages.core.models.monitoring import (
    DataQualityReport,
    DriftEvaluation,
    ModelPerformanceHistory,
    PredictionFeedback,
)
from packages.core.models.project import Project, ProjectMembership, ProjectRole
from packages.core.models.rollback import RollbackPolicy, RollbackRecord
from packages.core.models.workspace import ResourceOwnerMixin, WorkspaceExperiment

SCOPE_KEY = "workspace_user_id"


@event.listens_for(Session, "do_orm_execute")
def restrict_workspace_queries(state):
    user_id = state.session.info.get(SCOPE_KEY)
    if not user_id or state.execution_options.get("workspace_unscoped"):
        return
    if not (state.is_select or state.is_update or state.is_delete):
        return
    projects = select(ProjectMembership.project_id).where(
        ProjectMembership.user_id == user_id, ProjectMembership.project_role == ProjectRole.OWNER,
    )
    datasets = select(Dataset.id).where(Dataset.owner_id == user_id)
    models = select(RegisteredModel.id).where(RegisteredModel.owner_id == user_id)
    names = select(RegisteredModel.name).where(RegisteredModel.owner_id == user_id)
    deployments = select(Deployment.id).where(Deployment.owner_id == user_id)
    criteria = [
        (Project, Project.id.in_(projects)),
        (DatasetVersion, DatasetVersion.dataset_id.in_(datasets)),
        (ModelVersion, ModelVersion.model_id.in_(models)),
        (DeploymentMetric, DeploymentMetric.deployment_id.in_(deployments)),
        (DataQualityReport, DataQualityReport.dataset_id.in_(datasets)),
        (PredictionFeedback, PredictionFeedback.deployment_id.in_(deployments)),
    ]
    for model in (Dataset, RegisteredModel, Deployment, Alert, AlertRule, NotificationChannel, WorkspaceExperiment):
        criteria.append((model, model.owner_id == user_id))
    for model in (DriftEvaluation, ModelPerformanceHistory, RollbackRecord, RollbackPolicy):
        criteria.append((model, and_(
            model.model_name.in_(names),
            or_(model.deployment_id.is_(None), model.deployment_id.in_(deployments)),
        )))
    for model, condition in criteria:
        state.statement = state.statement.options(with_loader_criteria(model, condition, include_aliases=True))


def _require_reference(session, model, field, identifier):
    if identifier is None:
        return
    if session.scalar(select(field).where(field == identifier)) is None:
        raise NotFoundError(model.__name__, str(identifier))


@event.listens_for(Session, "before_flush")
def protect_workspace_writes(session, _context, _instances):
    user_id = session.info.get(SCOPE_KEY)
    if not user_id:
        return
    records = list(session.new) + list(session.dirty)
    for record in records:
        if isinstance(record, ResourceOwnerMixin):
            if record in session.new and record.owner_id is None:
                record.owner_id = user_id
            history = inspect(record).attrs.owner_id.history
            if record.owner_id != user_id or (record not in session.new and history.has_changes()):
                raise NotFoundError(type(record).__name__, str(getattr(record, "id", "")))
        if isinstance(record, (Dataset, RegisteredModel, Deployment, Alert, WorkspaceExperiment)):
            _require_reference(session, Project, Project.id, record.project_id)
        if isinstance(record, DatasetVersion):
            _require_reference(session, Dataset, Dataset.id, record.dataset_id)
        if isinstance(record, DataQualityReport):
            _require_reference(session, Dataset, Dataset.id, record.dataset_id)
        if isinstance(record, ModelVersion):
            _require_reference(session, RegisteredModel, RegisteredModel.id, record.model_id)
        if isinstance(record, (Deployment, DriftEvaluation, ModelPerformanceHistory, RollbackRecord, RollbackPolicy)):
            _require_reference(session, RegisteredModel, RegisteredModel.name, record.model_name)
        if isinstance(record, (Alert, AlertRule)) and record.model_name:
            _require_reference(session, RegisteredModel, RegisteredModel.name, record.model_name)
        if isinstance(record, (Alert, DriftEvaluation, ModelPerformanceHistory, PredictionFeedback, RollbackRecord, RollbackPolicy)):
            _require_reference(session, Deployment, Deployment.id, record.deployment_id)
