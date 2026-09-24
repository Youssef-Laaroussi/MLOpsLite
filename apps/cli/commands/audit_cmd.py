"""CLI commands for querying immutable audit logs (Issue #27)."""

import json
from typing import Optional

import httpx
import typer
from rich.console import Console
from rich.table import Table

from apps.cli.credentials import get_auth_headers

console = Console()
app = typer.Typer(no_args_is_help=True, help="Inspect immutable compliance and operational audit logs")

DEFAULT_API_URL = "http://localhost:8000"


@app.command("list")
def list_audit_logs(
    resource: Optional[str] = typer.Option(None, "--resource", "-r", help="Filter by resource type (e.g. model, deployment, user)"),
    action: Optional[str] = typer.Option(None, "--action", "-a", help="Filter by action (e.g. MODEL_PROMOTE, DEPLOYMENT_CREATE, USER_LOGIN)"),
    user_id: Optional[str] = typer.Option(None, "--user", "-u", help="Filter by user ID"),
    limit: int = typer.Option(50, "--limit", "-n", help="Maximum entries to retrieve"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """📜 List immutable audit log entries."""
    headers = get_auth_headers()
    if not headers:
        console.print("[red]Authentication required.[/red] Run [cyan]mlite login[/cyan] first.")
        raise typer.Exit(code=1)

    params: dict[str, str | int] = {"limit": limit}
    if resource:
        params["resource_type"] = resource
    if action:
        params["action"] = action.upper()
    if user_id:
        params["user_id"] = user_id

    try:
        res = httpx.get(f"{api_url}/api/v1/audit/logs", params=params, headers=headers, timeout=10.0)
        if res.status_code == 403:
            console.print("[bold red]Access denied:[/bold red] Only MAINTAINER and ADMIN roles can view audit logs.")
            raise typer.Exit(code=1)
        elif res.status_code != 200:
            console.print(f"[bold red]Error {res.status_code}:[/bold red] {res.text}")
            raise typer.Exit(code=1)

        logs = res.json().get("logs", [])
        if not logs:
            console.print("[dim]No audit log entries matching criteria.[/dim]")
            return

        table = Table(
            title="MLite Operational & Compliance Audit Logs",
            header_style="bold magenta",
        )
        table.add_column("Timestamp", style="dim")
        table.add_column("Action", style="bold cyan", min_width=14, no_wrap=True)
        table.add_column("Resource", style="green")
        table.add_column("Target Name", style="white", min_width=10, no_wrap=True)
        table.add_column("Actor", style="yellow")
        table.add_column("IP Address", style="dim")
        table.add_column("Details", style="dim")

        for log in logs:
            changes = log.get("changes_json")
            details_str = json.dumps(changes) if changes else "—"
            if len(details_str) > 35:
                details_str = details_str[:32] + "..."

            actor = log.get("user_email") or log.get("user_id") or "system"
            table.add_row(
                (log.get("timestamp") or "")[:19],
                log.get("action", ""),
                log.get("resource_type", ""),
                log.get("resource_name") or (log.get("resource_id") or "")[:8] or "—",
                actor,
                log.get("ip_address") or "—",
                details_str,
            )

        console.print(table)
    except httpx.RequestError as exc:
        console.print(f"[bold red]Connection error:[/bold red] {exc}")
        raise typer.Exit(code=1)
