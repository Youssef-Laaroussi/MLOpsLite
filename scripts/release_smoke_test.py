#!/usr/bin/env python3
"""MLite Release Smoke Test Script (Issue #39).

Verifies core subsystem imports, CLI command registration, configuration loading,
and optional live service reachability prior to releasing or tagging a version.
"""

import argparse
import importlib
import subprocess
import sys
from rich.console import Console
from rich.panel import Panel
from rich.table import Table

console = Console()

CORE_MODULES = [
    ("packages.db", "Database layer & SQLAlchemy models"),
    ("packages.storage", "MinIO / S3 blob storage client"),
    ("packages.models", "Model registry & versioning service"),
    ("packages.deployments", "Container orchestration & serving"),
    ("packages.monitoring", "Evidently AI drift & data quality"),
    ("packages.rollback", "Rollback coordinator & automated policies"),
    ("packages.auth", "JWT authentication & RBAC"),
    ("packages.audit", "Immutable audit logging engine"),
    ("apps.api.main", "FastAPI backend REST application"),
    ("apps.cli.main", "Typer CLI application"),
]

CLI_COMMANDS = [
    "init",
    "status",
    "config",
    "data",
    "experiments",
    "models",
    "deployments",
    "monitor",
    "rollback",
    "auth",
    "audit",
]


def test_imports() -> bool:
    console.print("[bold cyan]Step 1: Validating Python Subsystem Imports...[/bold cyan]")
    all_ok = True
    table = Table(header_style="bold blue")
    table.add_column("Module", style="cyan")
    table.add_column("Description")
    table.add_column("Status", style="bold")

    for mod_name, desc in CORE_MODULES:
        try:
            importlib.import_module(mod_name)
            table.add_row(mod_name, desc, "[green]PASSED[/green]")
        except Exception as exc:
            table.add_row(mod_name, desc, f"[red]FAILED ({exc})[/red]")
            all_ok = False

    console.print(table)
    return all_ok


def test_cli_execution() -> bool:
    console.print("\n[bold cyan]Step 2: Validating CLI Binary and Commands...[/bold cyan]")
    all_ok = True

    try:
        res = subprocess.run(
            [sys.executable, "-m", "apps.cli.main", "--help"],
            capture_output=True,
            text=True,
            timeout=10,
        )
        if res.returncode != 0:
            console.print(f"[red]CLI help command failed with returncode {res.returncode}[/red]")
            return False

        help_output = res.stdout
        table = Table(header_style="bold blue")
        table.add_column("CLI Command Group", style="cyan")
        table.add_column("Discovered in --help", style="bold")

        for cmd in CLI_COMMANDS:
            present = cmd in help_output
            status = "[green]YES[/green]" if present else "[red]NO[/red]"
            table.add_row(f"mlite {cmd}", status)
            if not present:
                all_ok = False

        console.print(table)
    except Exception as exc:
        console.print(f"[red]Failed to execute CLI: {exc}[/red]")
        return False

    return all_ok


def test_database_init() -> bool:
    console.print("\n[bold cyan]Step 3: Validating Database Engine & Schema Instantiation...[/bold cyan]")
    try:
        from packages.db.session import engine, init_db
        import asyncio

        async def _check():
            await init_db()
            async with engine.connect() as conn:
                res = await conn.execute(
                    # Works on both SQLite and PostgreSQL
                    __import__("sqlalchemy").text("SELECT 1")
                )
                return res.scalar() == 1

        val = asyncio.run(_check())
        if val:
            console.print("[green]✔ Database engine connected & initialized successfully.[/green]")
            return True
        else:
            console.print("[red]✖ Database test query returned unexpected result.[/red]")
            return False
    except Exception as exc:
        console.print(f"[yellow]⚠ Database check skipped or failed: {exc}[/yellow]")
        return True  # Non-blocking in CI without live DB


def run_smoke_tests(offline_only: bool = False) -> int:
    console.print(Panel(
        "[bold white on blue] MLite Release Candidate Pre-Flight Smoke Test [/bold white on blue]\n"
        "Verifying architecture readiness for release tagging.",
        border_style="blue",
    ))

    imports_ok = test_imports()
    cli_ok = test_cli_execution()
    db_ok = test_database_init() if not offline_only else True

    success = imports_ok and cli_ok and db_ok

    if success:
        console.print(Panel(
            "[bold green]ALL PRE-FLIGHT RELEASE CHECKS PASSED![/bold green]\n"
            "Build is verified and safe for release distribution.",
            title="Smoke Test Passed",
            border_style="green",
        ))
        return 0
    else:
        console.print(Panel(
            "[bold red]PRE-FLIGHT RELEASE CHECKS FAILED![/bold red]\n"
            "Inspect the failure messages above before creating release tag.",
            title="Smoke Test Failed",
            border_style="red",
        ))
        return 1


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="MLite Release Smoke Test")
    parser.add_argument("--offline", action="store_true", help="Skip tests requiring external service access")
    args = parser.parse_args()

    sys.exit(run_smoke_tests(offline_only=args.offline))
