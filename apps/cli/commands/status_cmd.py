"""mlite status — ping all MLite services and display health table."""

import httpx
import typer
from rich.console import Console
from rich.table import Table

console = Console()

DEFAULT_API_URL = "http://localhost:8000"
DEFAULT_MLFLOW_URL = "http://localhost:5000"
DEFAULT_MINIO_URL = "http://localhost:9000"


def _check_service(name: str, url: str, path: str = "/") -> tuple[str, str, str]:
    """Ping a service and return (name, url, status)."""
    try:
        resp = httpx.get(f"{url}{path}", timeout=5.0)
        if resp.status_code < 500:
            return name, url, "[bold green]ONLINE[/bold green]"
        return name, url, f"[yellow]DEGRADED ({resp.status_code})[/yellow]"
    except httpx.ConnectError:
        return name, url, "[bold red]OFFLINE[/bold red]"
    except Exception as e:
        return name, url, f"[red]ERROR: {e}[/red]"


def status(
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", help="MLite API base URL"),
    mlflow_url: str = typer.Option(DEFAULT_MLFLOW_URL, "--mlflow-url", help="MLflow tracking URL"),
    minio_url: str = typer.Option(DEFAULT_MINIO_URL, "--minio-url", help="MinIO endpoint URL"),
) -> None:
    """🏥 Check the status of all MLite platform services."""
    table = Table(title="🏥 MLite Platform Status", show_lines=True)
    table.add_column("Service", style="cyan", no_wrap=True)
    table.add_column("URL", style="dim")
    table.add_column("Status", justify="center")

    checks = [
        _check_service("MLite API", api_url, "/health"),
        _check_service("MLflow Tracking", mlflow_url, "/api/2.0/mlflow/experiments/search"),
        _check_service("MinIO Storage", minio_url, "/minio/health/live"),
    ]

    for name, url, status_str in checks:
        table.add_row(name, url, status_str)

    console.print(table)

    all_online = all("ONLINE" in s for _, _, s in checks)
    if all_online:
        console.print("\n[bold green]✓ All services are operational![/bold green]")
    else:
        console.print("\n[bold yellow]⚠ Some services are not available.[/bold yellow]")
