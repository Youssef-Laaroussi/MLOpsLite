"""CLI commands for dataset management, schema inspection, and DVC sync (Issues #15, #16)."""

from pathlib import Path
from typing import Optional

import httpx
import typer
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

from packages.data.dvc_manager import DVCManager

console = Console()
app = typer.Typer(no_args_is_help=True, help="Manage datasets, schemas, and DVC versioning")

DEFAULT_API_URL = "http://localhost:8000"


@app.command("add")
def add_dataset(
    file_path: str = typer.Argument(..., help="Path to local tabular file (CSV, Parquet, JSON)"),
    name: Optional[str] = typer.Option(None, "--name", "-n", help="Dataset name (defaults to filename stem)"),
    project_id: Optional[str] = typer.Option(None, "--project", "-p", help="Project ID"),
    description: Optional[str] = typer.Option(None, "--description", "-d", help="Version description"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="API URL"),
) -> None:
    """Register a new dataset or upload a new version with automatic schema extraction."""
    path = Path(file_path).resolve()
    if not path.is_file():
        console.print(f"[red]Error:[/red] File not found: {file_path}")
        raise typer.Exit(code=1)

    ds_name = name or path.stem

    console.print(f"[bold cyan]Registering dataset[/bold cyan] '{ds_name}'...")
    try:
        # 1. Create or retrieve logical dataset
        create_payload = {
            "name": ds_name,
            "project_id": project_id,
            "format": path.suffix.replace(".", "").upper() or "CSV",
            "description": description or f"Dataset from {path.name}",
        }
        res = httpx.post(f"{api_url}/api/v1/datasets/", json=create_payload, timeout=10.0)
        if res.status_code not in (200, 201):
            console.print(f"[red]Failed to create dataset:[/red] {res.text}")
            raise typer.Exit(code=1)

        ds_data = res.json()
        dataset_id = ds_data["id"]

        # 2. Register version with file path
        ver_payload = {
            "dataset_id": dataset_id,
            "file_path": str(path),
            "description": description,
        }
        ver_res = httpx.post(f"{api_url}/api/v1/datasets/{dataset_id}/versions", json=ver_payload, timeout=30.0)
        if ver_res.status_code in (200, 201):
            ver_data = ver_res.json()
            console.print(
                Panel.fit(
                    f"[green]✓ Dataset version registered successfully![/green]\n\n"
                    f"[bold]Dataset:[/bold] {ds_name} (ID: {dataset_id[:8]})\n"
                    f"[bold]Version:[/bold] v{ver_data.get('version_num')}\n"
                    f"[bold]SHA-256:[/bold] {ver_data.get('hash_sha256')[:16]}...\n"
                    f"[bold]Rows:[/bold] {ver_data.get('row_count'):,} | [bold]Columns:[/bold] {ver_data.get('column_count')}\n"
                    f"[bold]Size:[/bold] {ver_data.get('size_bytes') / 1024:.1f} KB\n"
                    f"[bold]Storage:[/bold] {ver_data.get('s3_key')}",
                    title="📊 Dataset Registered",
                    border_style="green",
                )
            )
        else:
            console.print(f"[red]Failed to register version:[/red] {ver_res.text}")
            raise typer.Exit(code=1)
    except Exception as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1)


@app.command("list")
def list_datasets(
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="API URL"),
) -> None:
    """List all registered datasets and their latest versions."""
    try:
        res = httpx.get(f"{api_url}/api/v1/datasets/", timeout=5.0)
        if res.status_code != 200:
            console.print(f"[red]Error {res.status_code}:[/red] {res.text}")
            raise typer.Exit(code=1)

        datasets = res.json().get("datasets", [])
        if not datasets:
            console.print("[yellow]No datasets registered yet.[/yellow]")
            return

        table = Table(title="MLite Registered Datasets", header_style="bold magenta")
        table.add_column("ID", style="dim")
        table.add_column("Name")
        table.add_column("Format", justify="center")
        table.add_column("Created", style="dim")

        for d in datasets:
            table.add_row(
                d.get("id", "")[:8],
                d.get("name"),
                d.get("format"),
                d.get("created_at", "")[:19].replace("T", " "),
            )

        console.print(table)
    except Exception as exc:
        console.print(f"[red]Connection error:[/red] {exc}")
        raise typer.Exit(code=1)


@app.command("info")
def inspect_file_cli(
    file_path: str = typer.Argument(..., help="Local tabular file path to inspect"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="API URL"),
) -> None:
    """Inspect schema and column details of a local dataset file."""
    try:
        res = httpx.get(f"{api_url}/api/v1/datasets/inspect?file_path={file_path}", timeout=15.0)
        if res.status_code != 200:
            console.print(f"[red]Inspection error:[/red] {res.text}")
            raise typer.Exit(code=1)

        info = res.json()
        table = Table(title=f"Schema for {Path(file_path).name}", header_style="bold cyan")
        table.add_column("Column")
        table.add_column("Inferred Type", justify="center")
        table.add_column("Null Count", justify="right")

        for col in info.get("columns", []):
            table.add_row(col.get("name"), col.get("dtype"), str(col.get("null_count", 0)))

        console.print(
            Panel.fit(
                f"[bold]Format:[/bold] {info.get('format')} | "
                f"[bold]Rows:[/bold] {info.get('row_count'):,} | "
                f"[bold]Columns:[/bold] {info.get('column_count')} | "
                f"[bold]Size:[/bold] {info.get('size_bytes') / 1024:.1f} KB\n"
                f"[bold]SHA-256:[/bold] {info.get('hash_sha256')}",
                title="🔍 Dataset Overview",
            )
        )
        console.print(table)
    except Exception as exc:
        console.print(f"[red]Error:[/red] {exc}")
        raise typer.Exit(code=1)


@app.command("validate")
def validate_dataset_cli(
    file_path: str = typer.Argument(..., help="Local tabular file path to validate"),
    max_null_pct: float = typer.Option(5.0, "--max-null", help="Max allowed null percentage per column"),
    max_dup_pct: float = typer.Option(1.0, "--max-dup", help="Max allowed duplicate row percentage"),
) -> None:
    """Run automated data quality checks and output score & constraint violations."""
    from packages.monitoring.quality import DataQualityEngine

    path = Path(file_path).resolve()
    if not path.is_file():
        console.print(f"[red]Error:[/red] File not found: {file_path}")
        raise typer.Exit(code=1)

    console.print(f"[bold cyan]Validating data quality[/bold cyan] for '{path.name}'...")
    try:
        res = DataQualityEngine.evaluate(
            file_path=path,
            max_null_pct=max_null_pct,
            max_dup_pct=max_dup_pct,
        )

        status_colors = {"PASS": "green", "WARN": "yellow", "FAIL": "red"}
        st = res.get("status", "FAIL")
        color = status_colors.get(st, "white")

        console.print(
            Panel.fit(
                f"[bold]Quality Score:[/bold] [{color}]{res.get('score')} / 100[/{color}] "
                f"([{color}]{st}[/{color}])\n\n"
                f"[bold]Rows:[/bold] {res.get('rows_count'):,} | [bold]Columns:[/bold] {res.get('cols_count')}\n"
                f"[bold]Overall Nulls:[/bold] {res.get('null_percentage')}%\n"
                f"[bold]Duplicate Rows:[/bold] {res.get('duplicate_percentage')}%\n"
                f"[bold]Failed Constraints:[/bold] {len(res.get('failed_constraints', []))}",
                title=f"📋 Data Quality Report",
                border_style=color,
            )
        )

        if res.get("failed_constraints"):
            table = Table(title="Failed Constraints", header_style="bold red")
            table.add_column("Rule")
            table.add_column("Column / Detail")
            table.add_column("Message")
            for fc in res.get("failed_constraints"):
                table.add_row(fc.get("rule"), fc.get("column", "—"), fc.get("message"))
            console.print(table)

        if st == "FAIL":
            raise typer.Exit(code=1)
    except Exception as exc:
        if isinstance(exc, typer.Exit):
            raise exc
        console.print(f"[red]Validation failed:[/red] {exc}")
        raise typer.Exit(code=1)


# ── DVC commands ───────────────────────────────────────────


@app.command("dvc-init")
def dvc_init(
    no_scm: bool = typer.Option(False, "--no-scm", help="Initialize DVC without git tracking"),
) -> None:
    """Initialize DVC in the current project and configure MinIO remote."""
    dvc = DVCManager()
    res = dvc.init_project(no_scm=no_scm)
    if res.get("success"):
        console.print(
            Panel.fit(
                f"[green]✓ DVC initialized with MinIO remote![/green]\n\n"
                f"[bold]Remote:[/bold] {res.get('remote_name')}\n"
                f"[bold]Target S3 URL:[/bold] {res.get('remote_url')}\n"
                f"[bold]MinIO Endpoint:[/bold] {res.get('endpoint')}",
                title="📦 DVC Ready",
                border_style="green",
            )
        )
    else:
        console.print(f"[red]DVC initialization failed:[/red] {res.get('error')}")
        raise typer.Exit(code=1)


@app.command("push")
def dvc_push() -> None:
    """Upload DVC-tracked datasets to MinIO remote storage."""
    dvc = DVCManager()
    res = dvc.push()
    if res.get("success"):
        console.print("[green]✓ Data successfully pushed to MinIO remote cache.[/green]")
    else:
        console.print(f"[red]DVC push failed:[/red] {res.get('stderr') or res.get('error')}")
        raise typer.Exit(code=1)


@app.command("pull")
def dvc_pull() -> None:
    """Download DVC-tracked datasets from MinIO remote storage."""
    dvc = DVCManager()
    res = dvc.pull()
    if res.get("success"):
        console.print("[green]✓ Data successfully pulled from MinIO remote cache.[/green]")
    else:
        console.print(f"[red]DVC pull failed:[/red] {res.get('stderr') or res.get('error')}")
        raise typer.Exit(code=1)


@app.command("checkout")
def dvc_checkout() -> None:
    """Restore dataset files matching current .dvc pointer files."""
    dvc = DVCManager()
    res = dvc.checkout()
    if res.get("success"):
        console.print("[green]✓ Working directory files checked out to match .dvc pointers.[/green]")
    else:
        console.print(f"[red]DVC checkout failed:[/red] {res.get('stderr') or res.get('error')}")
        raise typer.Exit(code=1)
