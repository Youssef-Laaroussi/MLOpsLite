"""Local operator commands. These use the installation database, never a remote public API."""

import asyncio

import typer
from rich.console import Console

app = typer.Typer(no_args_is_help=True)
console = Console()


async def _run(operation):
    from packages.core.db.session import async_session_factory, engine
    from packages.core.services.instance_service import initialize_instance

    try:
        await initialize_instance(engine)
        async with async_session_factory.begin() as session:
            return await operation(session)
    finally:
        await engine.dispose()


@app.command("setup-code")
def setup_code() -> None:
    """Generate a new single-use setup code for a fresh, unconfigured installation."""
    from packages.core.services.instance_service import rotate_setup_code

    try:
        code = asyncio.run(_run(rotate_setup_code))
    except ValueError as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1) from exc
    console.print("Open /setup and enter this installation code (replaces any earlier code):")
    console.print(code, markup=False)


@app.command("adopt-solo")
def adopt_solo(
    username: str = typer.Option(..., "--username", help="Exact existing account username to designate as instance administrator"),
    claim_unowned_projects: bool = typer.Option(False, "--claim-unowned-projects", help="Explicitly assign projects without an Owner to this account"),
) -> None:
    """Migrate an existing personal installation; preserve all accounts, passwords and data."""
    from packages.core.services.instance_service import adopt_solo_account

    async def adopt(session):
        return await adopt_solo_account(session, username, claim_unowned_projects)

    try:
        claimed = asyncio.run(_run(adopt))
    except ValueError as exc:
        console.print(f"[red]{exc}[/red]")
        raise typer.Exit(1) from exc
    console.print(f"Account {username!r} is an instance administrator. Assigned {claimed} unowned project(s).", markup=False)
    console.print("Sign in with this same account, then open Profile → Administration (/admin).")
