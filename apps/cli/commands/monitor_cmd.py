"""CLI commands for model drift and performance monitoring (Issues #19, #20)."""

import httpx
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()
app = typer.Typer(no_args_is_help=True, help="Monitor feature drift and model performance")

DEFAULT_API_URL = "http://localhost:8000"


@app.command("drift")
def check_drift(
    model_name: str = typer.Argument(..., help="Registered model name"),
    threshold: float = typer.Option(0.20, "--threshold", "-t", help="Drift ratio threshold (default: 0.20)"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """Run data drift detection comparing baseline vs live inference payloads."""
    console.print(f"[bold cyan]Running drift analysis[/bold cyan] for model '{model_name}'...")
    try:
        payload = {"model_name": model_name, "drift_threshold": threshold}
        res = httpx.post(f"{api_url}/api/v1/monitoring/drift/check", json=payload, timeout=20.0)

        if res.status_code not in (200, 201):
            console.print(f"[red]Error {res.status_code}:[/red] {res.text}")
            raise typer.Exit(code=1)

        data = res.json()
        status_colors = {"LOW": "green", "MEDIUM": "yellow", "HIGH": "red"}
        st = data.get("drift_status", "LOW")
        color = status_colors.get(st, "white")

        console.print(
            Panel.fit(
                f"[bold]Model:[/bold] {model_name}\n"
                f"[bold]Drift Status:[/bold] [{color}]{st}[/{color}]\n"
                f"[bold]Drift Share:[/bold] {data.get('drift_share', 0.0):.1%}\n"
                f"[bold]Drifted Features:[/bold] {', '.join(data.get('drifted_features') or ['None'])}\n"
                f"[bold]HTML Report:[/bold] {data.get('html_report_path') or 'N/A'}",
                title="🔍 Data Drift Evaluation",
                border_style=color,
            )
        )
    except Exception as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1)


@app.command("performance")
def check_performance(
    model_name: str = typer.Argument(..., help="Registered model name"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """Inspect live production performance metrics and concept degradation."""
    try:
        res = httpx.get(f"{api_url}/api/v1/monitoring/performance/{model_name}", timeout=10.0)
        if res.status_code != 200:
            console.print(f"[red]Error {res.status_code}:[/red] {res.text}")
            raise typer.Exit(code=1)

        records = res.json()
        if not records:
            console.print(f"[yellow]No performance evaluations recorded for '{model_name}'.[/yellow]")
            return

        table = Table(title=f"Performance History: {model_name}", header_style="bold cyan")
        table.add_column("Date", style="dim")
        table.add_column("Samples", justify="right")
        table.add_column("Accuracy / Metric", justify="center")
        table.add_column("Status", justify="center")

        for r in records:
            metrics = r.get("metrics", {})
            acc_str = f"Accuracy: {metrics.get('accuracy', 'N/A')}" if "accuracy" in metrics else str(metrics)
            deg = r.get("degraded", False)
            status_badge = "[red]DEGRADED[/red]" if deg else "[green]STABLE[/green]"
            table.add_row(
                r.get("created_at", "")[:19].replace("T", " "),
                str(r.get("sample_count", 0)),
                acc_str,
                status_badge,
            )

        console.print(table)
    except Exception as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1)
