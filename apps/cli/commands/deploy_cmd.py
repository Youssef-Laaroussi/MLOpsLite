"""CLI commands for model deployments and container management (Issues #11, #13)."""

from typing import Optional

import httpx
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

app = typer.Typer(no_args_is_help=True, help="Manage model deployments and inference containers")

DEFAULT_API_URL = "http://localhost:8000"


def deploy_model_action(
    model_name: str = typer.Argument(..., help="Registered model name"),
    version: int = typer.Option(..., "--version", "-v", help="Model version number"),
    port: Optional[int] = typer.Option(None, "--port", "-p", help="Explicit host port (optional)"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """Deploy a model version into an inference container."""
    payload = {
        "model_name": model_name,
        "model_version": version,
    }
    if port:
        payload["port"] = port

    console.print(f"[bold blue]Deploying[/bold blue] {model_name} (v{version})...")
    try:
        resp = httpx.post(f"{api_url}/api/v1/deployments/", json=payload, timeout=15.0)
        if resp.status_code in (200, 201):
            data = resp.json()
            console.print(
                Panel.fit(
                    f"[green]✓ Deployment Successful![/green]\n\n"
                    f"[bold]ID:[/bold] {data.get('id')}\n"
                    f"[bold]Model:[/bold] {data.get('model_name')} v{data.get('model_version')}\n"
                    f"[bold]Status:[/bold] {data.get('status')}\n"
                    f"[bold]Port:[/bold] {data.get('port')}\n"
                    f"[bold]Endpoint:[/bold] [link={data.get('endpoint_url')}]{data.get('endpoint_url')}[/link]\n\n"
                    f"[dim]Test endpoint: curl -X POST {data.get('endpoint_url')}/predict -d '{{\"inputs\": [...]}}'[/dim]",
                    title="🚀 Container Deployed",
                    border_style="green",
                )
            )
        else:
            console.print(f"[red]Error {resp.status_code}:[/red] {resp.text}")
            raise typer.Exit(code=1)
    except Exception as exc:
        console.print(f"[red]Failed to connect to MLite API:[/red] {exc}")
        raise typer.Exit(code=1)


@app.command("list")
def list_deployments(
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """List all active and historical deployments."""
    try:
        resp = httpx.get(f"{api_url}/api/v1/deployments/", timeout=5.0)
        if resp.status_code != 200:
            console.print(f"[red]Error {resp.status_code}:[/red] {resp.text}")
            raise typer.Exit(code=1)

        deployments = resp.json().get("deployments", [])
        if not deployments:
            console.print("[yellow]No deployments found.[/yellow]")
            return

        table = Table(title="MLite Model Deployments", header_style="bold cyan")
        table.add_column("ID", style="dim")
        table.add_column("Model")
        table.add_column("Version", justify="center")
        table.add_column("Port", justify="right")
        table.add_column("Status", justify="center")
        table.add_column("Endpoint")

        status_colors = {
            "RUNNING": "green",
            "PENDING": "yellow",
            "STOPPED": "dim",
            "FAILED": "red",
        }

        for d in deployments:
            st = d.get("status", "UNKNOWN")
            color = status_colors.get(st, "white")
            table.add_row(
                d.get("id", "")[:8],
                d.get("model_name"),
                str(d.get("model_version")),
                str(d.get("port")),
                f"[{color}]{st}[/{color}]",
                d.get("endpoint_url"),
            )

        console.print(table)
    except Exception as exc:
        console.print(f"[red]Connection error:[/red] {exc}")
        raise typer.Exit(code=1)


@app.command("stop")
def stop_deployment(
    deployment_id: str = typer.Argument(..., help="Deployment ID to stop"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """Stop and tear down a running deployment container."""
    try:
        resp = httpx.post(f"{api_url}/api/v1/deployments/{deployment_id}/stop", timeout=10.0)
        if resp.status_code == 200:
            console.print(f"[green]✓ Deployment {deployment_id} stopped and port released.[/green]")
        else:
            console.print(f"[red]Error {resp.status_code}:[/red] {resp.text}")
            raise typer.Exit(code=1)
    except Exception as exc:
        console.print(f"[red]Connection error:[/red] {exc}")
        raise typer.Exit(code=1)


@app.command("status")
def deployment_status(
    deployment_id: str = typer.Argument(..., help="Deployment ID"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """Display real-time health and resource metrics for a deployment container."""
    try:
        # Get deployment info
        d_resp = httpx.get(f"{api_url}/api/v1/deployments/{deployment_id}", timeout=5.0)
        if d_resp.status_code != 200:
            console.print(f"[red]Error fetching deployment:[/red] {d_resp.text}")
            raise typer.Exit(code=1)
        d_info = d_resp.json()

        # Get health probe
        h_resp = httpx.get(f"{api_url}/api/v1/deployments/{deployment_id}/health", timeout=5.0)
        health_info = h_resp.json() if h_resp.status_code == 200 else {"healthy": False, "status": "error"}

        # Get metrics
        m_resp = httpx.get(f"{api_url}/api/v1/deployments/{deployment_id}/metrics?limit=1", timeout=5.0)
        latest_metrics = m_resp.json()[0] if m_resp.status_code == 200 and m_resp.json() else None

        cpu_str = f"{latest_metrics.get('cpu_percent', 0.0)}%" if latest_metrics else "N/A"
        mem_str = f"{latest_metrics.get('memory_mb', 0.0)} MB / {latest_metrics.get('memory_limit_mb', 0.0)} MB" if latest_metrics else "N/A"
        p50_str = f"{latest_metrics.get('latency_p50_ms', 'N/A')} ms" if latest_metrics and latest_metrics.get('latency_p50_ms') is not None else "N/A"

        health_badge = "[green]● HEALTHY[/green]" if health_info.get("healthy") else "[red]● UNHEALTHY / DOWN[/red]"

        console.print(
            Panel.fit(
                f"[bold]Model:[/bold] {d_info.get('model_name')} v{d_info.get('model_version')}\n"
                f"[bold]Container Status:[/bold] {d_info.get('status')}\n"
                f"[bold]Health Probe:[/bold] {health_badge}\n"
                f"[bold]Endpoint:[/bold] {d_info.get('endpoint_url')}\n\n"
                f"[bold cyan]Resource Utilization:[/bold cyan]\n"
                f"  • CPU Usage: [bold]{cpu_str}[/bold]\n"
                f"  • Memory Usage: [bold]{mem_str}[/bold]\n"
                f"  • p50 Latency: [bold]{p50_str}[/bold]",
                title=f"Deployment Health & Status [{deployment_id[:8]}]",
                border_style="cyan",
            )
        )
    except Exception as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1)
