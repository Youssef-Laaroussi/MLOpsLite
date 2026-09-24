"""CLI commands for alert management and incident resolution (Issue #21)."""

import httpx
import typer
from rich.console import Console
from rich.table import Table

console = Console()
app = typer.Typer(no_args_is_help=True, help="Manage alerts and incident notifications")

DEFAULT_API_URL = "http://localhost:8000"


@app.command("list")
def list_alerts(
    status: str = typer.Option(None, "--status", "-s", help="Filter by status: OPEN, ACKNOWLEDGED, RESOLVED"),
    severity: str = typer.Option(None, "--severity", help="Filter by severity: INFO, WARNING, HIGH, CRITICAL"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """List recent alerts and incident history."""
    try:
        params = {}
        if status:
            params["status"] = status.upper()
        if severity:
            params["severity"] = severity.upper()

        res = httpx.get(f"{api_url}/api/v1/alerts/", params=params, timeout=10.0)
        if res.status_code != 200:
            console.print(f"[red]Error {res.status_code}:[/red] {res.text}")
            raise typer.Exit(code=1)

        alerts = res.json().get("alerts", [])
        if not alerts:
            console.print("[green]✓ No active alerts found.[/green]")
            return

        table = Table(title="MLite Alerts", header_style="bold red")
        table.add_column("ID", style="dim")
        table.add_column("Severity", justify="center")
        table.add_column("Title")
        table.add_column("Model")
        table.add_column("Status", justify="center")
        table.add_column("Created", style="dim")

        sev_colors = {
            "INFO": "blue",
            "WARNING": "yellow",
            "HIGH": "bright_red",
            "CRITICAL": "bold red",
        }

        for a in alerts:
            sev = a.get("severity", "WARNING")
            color = sev_colors.get(sev, "white")
            table.add_row(
                a.get("id", "")[:8],
                f"[{color}]{sev}[/{color}]",
                a.get("title"),
                a.get("model_name") or "—",
                a.get("status"),
                a.get("created_at", "")[:19].replace("T", " "),
            )

        console.print(table)
    except Exception as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1)


@app.command("ack")
def acknowledge_alert(
    alert_id: str = typer.Argument(..., help="Alert ID to acknowledge"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """Acknowledge an open alert."""
    try:
        res = httpx.post(f"{api_url}/api/v1/alerts/{alert_id}/acknowledge", timeout=10.0)
        if res.status_code == 200:
            console.print(f"[green]✓ Alert {alert_id} acknowledged.[/green]")
        else:
            console.print(f"[red]Error {res.status_code}:[/red] {res.text}")
            raise typer.Exit(code=1)
    except Exception as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1)


@app.command("resolve")
def resolve_alert(
    alert_id: str = typer.Argument(..., help="Alert ID to resolve"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """Mark an alert as resolved."""
    try:
        res = httpx.post(f"{api_url}/api/v1/alerts/{alert_id}/resolve", timeout=10.0)
        if res.status_code == 200:
            console.print(f"[green]✓ Alert {alert_id} resolved.[/green]")
        else:
            console.print(f"[red]Error {res.status_code}:[/red] {res.text}")
            raise typer.Exit(code=1)
    except Exception as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1)
