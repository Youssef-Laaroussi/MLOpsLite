"""Rollback management REST endpoints (Issues #23, #24).

Manual rollback operations, rollback history, and auto-rollback policy management.
"""

from typing import Any, Optional

from fastapi import APIRouter, Depends, Query, status
from sqlalchemy.ext.asyncio import AsyncSession

from apps.api.dependencies import get_db
from apps.api.errors import NotFoundError
from packages.core.schemas.rollback import (
    RollbackRequest,
    RollbackResponse,
    RollbackListResponse,
    PolicyCreate,
    PolicyResponse,
    PolicyListResponse,
)
from packages.core.models.rollback import RollbackTrigger
from packages.rollback.coordinator import RollbackCoordinator, RollbackError
from packages.rollback.policies import AutoRollbackEvaluator

router = APIRouter(prefix="/api/v1", tags=["Rollback & Reliability"])


def _get_coordinator(session: AsyncSession = Depends(get_db)) -> RollbackCoordinator:
    return RollbackCoordinator(session)


def _get_evaluator(session: AsyncSession = Depends(get_db)) -> AutoRollbackEvaluator:
    return AutoRollbackEvaluator(session)


# ── Manual Rollback ──────────────────────────────────────────────


@router.post(
    "/deployments/{deployment_id}/rollback",
    response_model=RollbackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def rollback_deployment(
    deployment_id: str,
    payload: RollbackRequest,
    db: AsyncSession = Depends(get_db),
) -> Any:
    """Initiate a rollback for a specific deployment.

    Atomically switches production traffic to the target model version
    and archives the faulty version.
    """
    coordinator = RollbackCoordinator(session=db)

    # Retrieve the deployment to get model_name
    from packages.deployment.service import DeploymentService

    service = DeploymentService(session=db)
    deployment = await service.get_deployment(deployment_id)
    if deployment is None:
        raise NotFoundError("Deployment", deployment_id)

    try:
        record = await coordinator.execute_rollback(
            model_name=deployment.model_name,
            target_version=payload.target_version,
            reason=payload.reason,
            trigger=RollbackTrigger.API,
            initiated_by="api-user",
        )
        return record
    except RollbackError as exc:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )


@router.post(
    "/models/{model_name}/rollback",
    response_model=RollbackResponse,
    status_code=status.HTTP_201_CREATED,
)
async def rollback_model(
    model_name: str,
    payload: RollbackRequest,
    coordinator: RollbackCoordinator = Depends(_get_coordinator),
) -> Any:
    """Initiate a rollback by model name.

    Finds the active deployment for the model and rolls back to the
    specified or previous version.
    """
    try:
        record = await coordinator.execute_rollback(
            model_name=model_name,
            target_version=payload.target_version,
            reason=payload.reason,
            trigger=RollbackTrigger.API,
            initiated_by="api-user",
        )
        return record
    except RollbackError as exc:
        from fastapi import HTTPException

        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=str(exc),
        )


# ── Rollback History ─────────────────────────────────────────────


@router.get("/rollbacks", response_model=RollbackListResponse)
async def list_rollbacks(
    model_name: Optional[str] = Query(None, description="Filter by model name"),
    limit: int = Query(50, ge=1, le=500),
    coordinator: RollbackCoordinator = Depends(_get_coordinator),
) -> Any:
    """Query rollback audit log history."""
    records = await coordinator.get_rollback_history(
        model_name=model_name, limit=limit
    )
    return {"rollbacks": records, "total": len(records)}


@router.get("/rollbacks/{rollback_id}", response_model=RollbackResponse)
async def get_rollback(
    rollback_id: str,
    coordinator: RollbackCoordinator = Depends(_get_coordinator),
) -> Any:
    """Fetch details of a specific rollback operation."""
    record = await coordinator.get_rollback(rollback_id)
    if record is None:
        raise NotFoundError("RollbackRecord", rollback_id)
    return record


# ── Auto-Rollback Policies ──────────────────────────────────────


@router.post(
    "/rollback-policies",
    response_model=PolicyResponse,
    status_code=status.HTTP_201_CREATED,
)
async def create_policy(
    payload: PolicyCreate,
    evaluator: AutoRollbackEvaluator = Depends(_get_evaluator),
) -> Any:
    """Create a new auto-rollback policy."""
    policy = await evaluator.create_policy(
        model_name=payload.model_name,
        deployment_id=payload.deployment_id,
        enabled=payload.enabled,
        require_approval=payload.require_approval,
        metric=payload.metric,
        threshold=payload.threshold,
        evaluation_window_seconds=payload.evaluation_window_seconds,
        consecutive_violations=payload.consecutive_violations,
        cooldown_hours=payload.cooldown_hours,
    )
    return policy


@router.get("/rollback-policies", response_model=PolicyListResponse)
async def list_policies(
    model_name: Optional[str] = Query(None, description="Filter by model name"),
    enabled_only: bool = Query(False, description="Only show enabled policies"),
    evaluator: AutoRollbackEvaluator = Depends(_get_evaluator),
) -> Any:
    """List all auto-rollback policies."""
    policies = await evaluator.list_policies(
        model_name=model_name, enabled_only=enabled_only
    )
    return {"policies": policies, "total": len(policies)}


@router.get("/rollback-policies/{policy_id}", response_model=PolicyResponse)
async def get_policy(
    policy_id: str,
    evaluator: AutoRollbackEvaluator = Depends(_get_evaluator),
) -> Any:
    """Fetch an auto-rollback policy by ID."""
    policy = await evaluator.get_policy(policy_id)
    if policy is None:
        raise NotFoundError("RollbackPolicy", policy_id)
    return policy


@router.patch("/rollback-policies/{policy_id}", response_model=PolicyResponse)
async def update_policy(
    policy_id: str,
    payload: PolicyCreate,
    evaluator: AutoRollbackEvaluator = Depends(_get_evaluator),
) -> Any:
    """Update an auto-rollback policy."""
    policy = await evaluator.update_policy(
        policy_id,
        enabled=payload.enabled,
        require_approval=payload.require_approval,
        metric=payload.metric,
        threshold=payload.threshold,
        evaluation_window_seconds=payload.evaluation_window_seconds,
        consecutive_violations=payload.consecutive_violations,
        cooldown_hours=payload.cooldown_hours,
    )
    if policy is None:
        raise NotFoundError("RollbackPolicy", policy_id)
    return policy


@router.delete("/rollback-policies/{policy_id}", status_code=status.HTTP_204_NO_CONTENT)
async def delete_policy(
    policy_id: str,
    evaluator: AutoRollbackEvaluator = Depends(_get_evaluator),
) -> None:
    """Delete an auto-rollback policy."""
    deleted = await evaluator.delete_policy(policy_id)
    if not deleted:
        raise NotFoundError("RollbackPolicy", policy_id)


@router.post("/rollback-policies/evaluate")
async def trigger_evaluation(
    evaluator: AutoRollbackEvaluator = Depends(_get_evaluator),
) -> Any:
    """Manually trigger evaluation of all enabled auto-rollback policies.

    Normally run by the background scheduler, but can be triggered
    manually for testing or immediate evaluation.
    """
    results = await evaluator.evaluate_all_policies()
    return {"evaluations": results, "total": len(results)}
