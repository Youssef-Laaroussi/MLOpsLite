"""mlite config [view|set|get] — manage CLI configuration."""

import json
from pathlib import Path

import typer
from rich.console import Console
from rich.table import Table

console = Console()

app = typer.Typer(no_args_is_help=True)

CONFIG_PATH = Path(".mlite") / "config.json"


def _load_config() -> dict:
    """Load config from .mlite/config.json or return defaults."""
    if CONFIG_PATH.exists():
        return json.loads(CONFIG_PATH.read_text())
    return {"api_url": "http://localhost:8000", "project_slug": None}


def _save_config(data: dict) -> None:
    """Persist config to .mlite/config.json."""
    CONFIG_PATH.parent.mkdir(exist_ok=True)
    CONFIG_PATH.write_text(json.dumps(data, indent=2))


@app.command("view")
def view() -> None:
    """📋 Display current CLI configuration."""
    config = _load_config()
    table = Table(title="MLite Configuration", show_lines=True)
    table.add_column("Key", style="cyan", no_wrap=True)
    table.add_column("Value", style="green")
    for k, v in sorted(config.items()):
        table.add_row(k, str(v) if v is not None else "[dim]not set[/dim]")
    console.print(table)


@app.command("set")
def set_value(
    key: str = typer.Argument(..., help="Configuration key"),
    value: str = typer.Argument(..., help="Configuration value"),
) -> None:
    """🔧 Set a configuration value."""
    config = _load_config()
    config[key] = value
    _save_config(config)
    console.print(f"[green]✓[/green] Set [cyan]{key}[/cyan] = [yellow]{value}[/yellow]")


@app.command("get")
def get_value(
    key: str = typer.Argument(..., help="Configuration key"),
) -> None:
    """🔍 Get a configuration value."""
    config = _load_config()
    if key in config:
        console.print(f"[cyan]{key}[/cyan] = [yellow]{config[key]}[/yellow]")
    else:
        console.print(f"[red]✗[/red] Key '{key}' not found in configuration.")
        raise typer.Exit(code=1)
