"""mlite model [list|register|promote|compare] — model registry CLI commands."""

import httpx
import typer
from rich.console import Console
from rich.table import Table
from rich.columns import Columns
from rich.panel import Panel

console = Console()

app = typer.Typer(no_args_is_help=True)

DEFAULT_API_URL = "http://localhost:8000"


@app.command("list")
def list_models(
    project: str = typer.Option(None, "--project", "-p", help="Filter by project slug"),
    stage: str = typer.Option(None, "--stage", "-s", help="Filter by stage"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", help="MLite API URL"),
) -> None:
    """📦 List registered models."""
    table = Table(title="📦 Model Registry", show_lines=True)
    table.add_column("Name", style="cyan")
    table.add_column("Version", justify="center")
    table.add_column("Stage", justify="center")
    table.add_column("Metrics", style="green")
    table.add_column("Created", style="dim")

    try:
        params = {}
        if project:
            params["project"] = project
        if stage:
            params["stage"] = stage
        resp = httpx.get(f"{api_url}/api/v1/models/", params=params, timeout=5.0)
        data = resp.json()
        models = data.get("models", [])

        if not models:
            console.print("[dim]No models registered.[/dim]")
            return

        for m in models:
            stage_str = m.get("stage", "—")
            stage_color = {
                "PRODUCTION": "[bold green]PRODUCTION[/bold green]",
                "STAGING": "[yellow]STAGING[/yellow]",
                "CANDIDATE": "[cyan]CANDIDATE[/cyan]",
                "DEVELOPMENT": "[dim]DEVELOPMENT[/dim]",
                "ARCHIVED": "[dim strikethrough]ARCHIVED[/dim strikethrough]",
            }.get(stage_str, stage_str)

            table.add_row(
                m.get("name", "—"),
                str(m.get("version", "—")),
                stage_color,
                str(m.get("metrics", {})),
                m.get("created_at", "—"),
            )
        console.print(table)
    except httpx.ConnectError:
        console.print("[red]✗ Cannot connect to MLite API.[/red]")
        raise typer.Exit(code=1)


@app.command("register")
def register(
    name: str = typer.Argument(..., help="Model name"),
    run_id: str = typer.Option(..., "--run-id", "-r", help="MLflow run ID"),
    project: str = typer.Option(None, "--project", "-p", help="Project slug"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", help="MLite API URL"),
) -> None:
    """📝 Register a model from an MLflow run."""
    try:
        resp = httpx.post(
            f"{api_url}/api/v1/models/register",
            json={"name": name, "run_id": run_id, "project_slug": project},
            timeout=10.0,
        )
        if resp.status_code in (200, 201):
            data = resp.json()
            console.print(
                f"[bold green]✓[/bold green] Model [cyan]{name}[/cyan] registered "
                f"(version {data.get('version', '?')})"
            )
        else:
            console.print(f"[red]✗ Registration failed: {resp.text}[/red]")
            raise typer.Exit(code=1)
    except httpx.ConnectError:
        console.print("[red]✗ Cannot connect to MLite API.[/red]")
        raise typer.Exit(code=1)


@app.command("promote")
def promote(
    name: str = typer.Argument(..., help="Model name"),
    version: int = typer.Option(..., "--version", "-v", help="Model version number"),
    stage: str = typer.Option(
        ..., "--stage", "-s",
        help="Target stage: CANDIDATE, STAGING, PRODUCTION, ARCHIVED",
    ),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", help="MLite API URL"),
) -> None:
    """⬆️  Promote a model version to a new stage."""
    try:
        resp = httpx.post(
            f"{api_url}/api/v1/models/{name}/versions/{version}/promote",
            json={"stage": stage.upper()},
            timeout=10.0,
        )
        if resp.status_code == 200:
            console.print(
                f"[bold green]✓[/bold green] Model [cyan]{name}[/cyan] v{version} "
                f"promoted to [yellow]{stage.upper()}[/yellow]"
            )
        else:
            console.print(f"[red]✗ Promotion failed: {resp.text}[/red]")
            raise typer.Exit(code=1)
    except httpx.ConnectError:
        console.print("[red]✗ Cannot connect to MLite API.[/red]")
        raise typer.Exit(code=1)


@app.command("compare")
def compare(
    name: str = typer.Argument(..., help="Model name"),
    v1: int = typer.Option(..., "--v1", help="First version to compare"),
    v2: int = typer.Option(..., "--v2", help="Second version to compare"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", help="MLite API URL"),
) -> None:
    """⚖️  Compare two model versions side by side."""
    try:
        resp = httpx.get(
            f"{api_url}/api/v1/models/compare",
            params={"name": name, "v1": v1, "v2": v2},
            timeout=10.0,
        )
        if resp.status_code != 200:
            console.print(f"[red]✗ Compare failed: {resp.text}[/red]")
            raise typer.Exit(code=1)

        data = resp.json()
        metrics_v1 = data.get("v1_metrics", {})
        metrics_v2 = data.get("v2_metrics", {})

        all_keys = sorted(set(list(metrics_v1.keys()) + list(metrics_v2.keys())))

        table = Table(title=f"⚖️  {name}: v{v1} vs v{v2}", show_lines=True)
        table.add_column("Metric", style="cyan")
        table.add_column(f"v{v1}", justify="right")
        table.add_column(f"v{v2}", justify="right")
        table.add_column("Winner", justify="center")

        for key in all_keys:
            val1 = metrics_v1.get(key, "—")
            val2 = metrics_v2.get(key, "—")
            winner = "—"
            if isinstance(val1, (int, float)) and isinstance(val2, (int, float)):
                if val1 > val2:
                    winner = f"[green]v{v1}[/green]"
                elif val2 > val1:
                    winner = f"[green]v{v2}[/green]"
                else:
                    winner = "[dim]tie[/dim]"
            table.add_row(key, str(val1), str(val2), winner)

        console.print(table)
    except httpx.ConnectError:
        console.print("[red]✗ Cannot connect to MLite API.[/red]")
        raise typer.Exit(code=1)
