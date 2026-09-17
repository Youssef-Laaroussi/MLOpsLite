"""mlite experiment [run|list] — experiment tracking CLI commands."""

import subprocess
import sys

import httpx
import typer
from rich.console import Console
from rich.table import Table

console = Console()

app = typer.Typer(no_args_is_help=True)

DEFAULT_API_URL = "http://localhost:8000"


@app.command("run")
def run(
    script: str = typer.Argument(..., help="Path to the training script to execute"),
    project: str = typer.Option(None, "--project", "-p", help="Project slug"),
    experiment_name: str = typer.Option(None, "--name", "-n", help="Experiment name"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", help="MLite API URL"),
) -> None:
    """🚂 Execute a training script with automatic experiment tracking.

    Sets MLFLOW_TRACKING_URI and registers the run under the active MLite project.
    """
    console.print(f"[cyan]▶[/cyan] Running training script: [bold]{script}[/bold]")

    if project:
        console.print(f"  Project: [green]{project}[/green]")
    if experiment_name:
        console.print(f"  Experiment: [green]{experiment_name}[/green]")

    # Set environment for the subprocess
    import os

    env = os.environ.copy()
    env.setdefault("MLFLOW_TRACKING_URI", "http://localhost:5000")
    if experiment_name:
        env["MLFLOW_EXPERIMENT_NAME"] = experiment_name

    console.print()
    try:
        result = subprocess.run(
            [sys.executable, script],
            env=env,
            check=False,
        )
        if result.returncode == 0:
            console.print("\n[bold green]✓ Training completed successfully![/bold green]")
        else:
            console.print(f"\n[bold red]✗ Training failed (exit code {result.returncode})[/bold red]")
            raise typer.Exit(code=result.returncode)
    except FileNotFoundError:
        console.print(f"[red]✗ Script not found: {script}[/red]")
        raise typer.Exit(code=1)


@app.command("list")
def list_experiments(
    project: str = typer.Option(None, "--project", "-p", help="Filter by project slug"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", help="MLite API URL"),
    limit: int = typer.Option(20, "--limit", "-l", help="Number of experiments to show"),
) -> None:
    """📋 List recent experiments and training runs."""
    table = Table(title="📊 Experiments", show_lines=True)
    table.add_column("#", style="dim", width=4)
    table.add_column("Experiment", style="cyan")
    table.add_column("Status", justify="center")
    table.add_column("Metrics", style="green")
    table.add_column("Created", style="dim")

    try:
        params = {"page_size": limit}
        if project:
            params["project"] = project
        resp = httpx.get(f"{api_url}/api/v1/experiments/", params=params, timeout=5.0)
        data = resp.json()
        experiments = data.get("experiments", [])

        if not experiments:
            console.print("[dim]No experiments found.[/dim]")
            return

        for i, exp in enumerate(experiments, 1):
            table.add_row(
                str(i),
                exp.get("name", "—"),
                exp.get("status", "—"),
                str(exp.get("metrics", {})),
                exp.get("created_at", "—"),
            )
        console.print(table)
    except httpx.ConnectError:
        console.print("[red]✗ Cannot connect to MLite API. Is it running?[/red]")
        raise typer.Exit(code=1)
    except Exception as e:
        console.print(f"[red]✗ Error: {e}[/red]")
        raise typer.Exit(code=1)
