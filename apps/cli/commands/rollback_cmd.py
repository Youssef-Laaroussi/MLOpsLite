"""CLI commands for model rollback and auto-rollback policy management (Issues #23, #24).

Commands:
    mlite rollback <model-name> [--to <version>] [--reason <text>]
    mlite rollback-policy [list|create|enable|disable|delete]
"""

import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel
from typing import Optional

console = Console()

# ── Rollback command ─────────────────────────────────────────────


def rollback(
    model_name: str = typer.Argument(..., help="Name of the model to roll back"),
    to: Optional[int] = typer.Option(None, "--to", "-t", help="Target version to roll back to"),
    reason: str = typer.Option(
        "Manual rollback via CLI", "--reason", "-r", help="Reason for the rollback"
    ),
) -> None:
    """Execute a controlled rollback to a previous model version.

    Atomically switches production traffic to the target version,
    verifies health, and archives the faulty version.
    """
    import asyncio

    async def _execute():
        from packages.core.db.session import async_session_factory
        from packages.rollback.coordinator import RollbackCoordinator, RollbackError
        from packages.core.models.rollback import RollbackTrigger

        async with async_session_factory() as session:
            coordinator = RollbackCoordinator(session=session)
            try:
                with console.status(
                    f"[bold yellow]Rolling back {model_name}...[/bold yellow]",
                    spinner="dots",
                ):
                    record = await coordinator.execute_rollback(
                        model_name=model_name,
                        target_version=to,
                        reason=reason,
                        trigger=RollbackTrigger.CLI,
                        initiated_by="cli-user",
                    )

                if record.status.value == "COMPLETED":
                    console.print(
                        Panel(
                            f"[bold green]✅ Rollback completed successfully![/bold green]\n\n"
                            f"  Model: [cyan]{record.model_name}[/cyan]\n"
                            f"  From version: [red]v{record.from_version}[/red]\n"
                            f"  To version:   [green]v{record.to_version}[/green]\n"
                            f"  Reason: {record.reason}\n"
                            f"  Rollback ID: [dim]{record.id}[/dim]",
                            title="🔄 Model Rollback",
                            border_style="green",
                        )
                    )
                elif record.status.value == "ABORTED":
                    console.print(
                        Panel(
                            f"[bold yellow]⚠️ Rollback aborted![/bold yellow]\n\n"
                            f"  {record.error_message}\n"
                            f"  Current traffic remains untouched.",
                            title="🔄 Rollback Aborted",
                            border_style="yellow",
                        )
                    )
                else:
                    console.print(
                        Panel(
                            f"[bold red]❌ Rollback status: {record.status.value}[/bold red]\n\n"
                            f"  {record.error_message or 'Unknown error'}",
                            title="🔄 Rollback Result",
                            border_style="red",
                        )
                    )
                await session.commit()
            except RollbackError as exc:
                console.print(f"[bold red]Error:[/bold red] {exc}")
                raise typer.Exit(code=1)
            except Exception as exc:
                console.print(f"[bold red]Unexpected error:[/bold red] {exc}")
                raise typer.Exit(code=1)

    asyncio.run(_execute())


# ── Rollback policy sub-commands ─────────────────────────────────

app = typer.Typer(help="Manage auto-rollback policies")


@app.command("list")
def policy_list(
    model_name: Optional[str] = typer.Option(None, "--model", "-m", help="Filter by model name"),
    enabled_only: bool = typer.Option(False, "--enabled", help="Show only enabled policies"),
) -> None:
    """List all auto-rollback policies."""
    import asyncio

    async def _list():
        from packages.core.db.session import async_session_factory
        from packages.rollback.policies import AutoRollbackEvaluator

        async with async_session_factory() as session:
            evaluator = AutoRollbackEvaluator(session=session)
            policies = await evaluator.list_policies(
                model_name=model_name, enabled_only=enabled_only
            )

            if not policies:
                console.print("[dim]No auto-rollback policies configured.[/dim]")
                return

            table = Table(title="🛡️ Auto-Rollback Policies", show_lines=True)
            table.add_column("ID", style="dim", max_width=12)
            table.add_column("Model", style="cyan")
            table.add_column("Metric", style="yellow")
            table.add_column("Threshold", justify="right")
            table.add_column("Enabled", justify="center")
            table.add_column("Approval", justify="center")
            table.add_column("Violations", justify="right")
            table.add_column("Window (s)", justify="right")

            for p in policies:
                table.add_row(
                    p.id[:8] + "...",
                    p.model_name,
                    p.metric,
                    f"{p.threshold:.4f}",
                    "✅" if p.enabled else "❌",
                    "🔒" if p.require_approval else "🔓",
                    f"{p.violation_count}/{p.consecutive_violations}",
                    str(p.evaluation_window_seconds),
                )

            console.print(table)

    asyncio.run(_list())


@app.command("create")
def policy_create(
    model_name: str = typer.Argument(..., help="Model name"),
    metric: str = typer.Option("error_rate", "--metric", help="Metric: error_rate, latency_p95, accuracy, drift_share"),
    threshold: float = typer.Option(0.05, "--threshold", help="Breach threshold"),
    enabled: bool = typer.Option(False, "--enabled", help="Enable immediately"),
    require_approval: bool = typer.Option(False, "--approval", help="Require human approval"),
    window: int = typer.Option(300, "--window", help="Evaluation window in seconds"),
    violations: int = typer.Option(3, "--violations", help="Consecutive violations before triggering"),
    cooldown: int = typer.Option(24, "--cooldown", help="Cooldown hours between auto-rollbacks"),
) -> None:
    """Create a new auto-rollback policy for a model."""
    import asyncio

    async def _create():
        from packages.core.db.session import async_session_factory
        from packages.rollback.policies import AutoRollbackEvaluator

        async with async_session_factory() as session:
            evaluator = AutoRollbackEvaluator(session=session)
            policy = await evaluator.create_policy(
                model_name=model_name,
                enabled=enabled,
                require_approval=require_approval,
                metric=metric,
                threshold=threshold,
                evaluation_window_seconds=window,
                consecutive_violations=violations,
                cooldown_hours=cooldown,
            )
            await session.commit()

            console.print(
                Panel(
                    f"[bold green]Policy created![/bold green]\n\n"
                    f"  ID:       [dim]{policy.id}[/dim]\n"
                    f"  Model:    [cyan]{policy.model_name}[/cyan]\n"
                    f"  Metric:   [yellow]{policy.metric}[/yellow]\n"
                    f"  Threshold:{policy.threshold:.4f}\n"
                    f"  Enabled:  {'✅' if policy.enabled else '❌'}\n"
                    f"  Approval: {'🔒 Required' if policy.require_approval else '🔓 Auto'}",
                    title="🛡️ Auto-Rollback Policy",
                    border_style="green",
                )
            )

    asyncio.run(_create())


@app.command("enable")
def policy_enable(
    policy_id: str = typer.Argument(..., help="Policy ID to enable"),
) -> None:
    """Enable an auto-rollback policy."""
    import asyncio

    async def _enable():
        from packages.core.db.session import async_session_factory
        from packages.rollback.policies import AutoRollbackEvaluator

        async with async_session_factory() as session:
            evaluator = AutoRollbackEvaluator(session=session)
            policy = await evaluator.update_policy(policy_id, enabled=True)
            if policy is None:
                console.print(f"[bold red]Policy {policy_id} not found.[/bold red]")
                raise typer.Exit(code=1)
            await session.commit()
            console.print(f"[green]✅ Policy {policy_id[:8]}... enabled for {policy.model_name}[/green]")

    asyncio.run(_enable())


@app.command("disable")
def policy_disable(
    policy_id: str = typer.Argument(..., help="Policy ID to disable"),
) -> None:
    """Disable an auto-rollback policy."""
    import asyncio

    async def _disable():
        from packages.core.db.session import async_session_factory
        from packages.rollback.policies import AutoRollbackEvaluator

        async with async_session_factory() as session:
            evaluator = AutoRollbackEvaluator(session=session)
            policy = await evaluator.update_policy(policy_id, enabled=False)
            if policy is None:
                console.print(f"[bold red]Policy {policy_id} not found.[/bold red]")
                raise typer.Exit(code=1)
            await session.commit()
            console.print(f"[yellow]❌ Policy {policy_id[:8]}... disabled for {policy.model_name}[/yellow]")

    asyncio.run(_disable())


@app.command("delete")
def policy_delete(
    policy_id: str = typer.Argument(..., help="Policy ID to delete"),
) -> None:
    """Delete an auto-rollback policy."""
    import asyncio

    async def _delete():
        from packages.core.db.session import async_session_factory
        from packages.rollback.policies import AutoRollbackEvaluator

        async with async_session_factory() as session:
            evaluator = AutoRollbackEvaluator(session=session)
            deleted = await evaluator.delete_policy(policy_id)
            if not deleted:
                console.print(f"[bold red]Policy {policy_id} not found.[/bold red]")
                raise typer.Exit(code=1)
            await session.commit()
            console.print(f"[red]🗑️ Policy {policy_id[:8]}... deleted.[/red]")

    asyncio.run(_delete())


@app.command("evaluate")
def policy_evaluate() -> None:
    """Manually trigger evaluation of all enabled auto-rollback policies."""
    import asyncio

    async def _evaluate():
        from packages.core.db.session import async_session_factory
        from packages.rollback.policies import AutoRollbackEvaluator

        async with async_session_factory() as session:
            evaluator = AutoRollbackEvaluator(session=session)
            with console.status("[bold yellow]Evaluating policies...[/bold yellow]", spinner="dots"):
                results = await evaluator.evaluate_all_policies()
            await session.commit()

            if not results:
                console.print("[dim]No enabled policies to evaluate.[/dim]")
                return

            table = Table(title="📊 Policy Evaluation Results", show_lines=True)
            table.add_column("Model", style="cyan")
            table.add_column("Action", style="bold")
            table.add_column("Metric")
            table.add_column("Value", justify="right")
            table.add_column("Threshold", justify="right")
            table.add_column("Details")

            for r in results:
                action = r.get("action", "?")
                color = {
                    "OK": "green",
                    "VIOLATION": "yellow",
                    "ROLLBACK_EXECUTED": "red",
                    "PENDING_APPROVAL": "magenta",
                    "COOLDOWN": "blue",
                    "SKIP": "dim",
                    "ERROR": "red",
                }.get(action, "white")

                table.add_row(
                    r.get("model_name", "?"),
                    f"[{color}]{action}[/{color}]",
                    r.get("metric", "—"),
                    f"{r.get('value', 0):.4f}" if r.get("value") is not None else "—",
                    f"{r.get('threshold', 0):.4f}" if r.get("threshold") is not None else "—",
                    r.get("reason", r.get("error", "")),
                )

            console.print(table)

    asyncio.run(_evaluate())
