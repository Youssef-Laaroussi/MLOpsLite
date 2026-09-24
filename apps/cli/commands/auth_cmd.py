"""CLI commands for authentication, API keys, and user management (Issues #25, #26)."""

import os
from typing import Optional

import httpx
import typer
from rich.console import Console
from rich.table import Table
from rich.panel import Panel

from apps.cli.credentials import (
    save_credentials,
    load_credentials,
    clear_credentials,
    get_auth_headers,
)

console = Console()
DEFAULT_API_URL = "http://localhost:8000"


# ── Standalone Login / Logout / Whoami ──────────────────────────


def login(
    username: Optional[str] = typer.Option(None, "--username", "-u", help="Username or email address"),
    password: Optional[str] = typer.Option(None, "--password", "-p", help="User password"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """🔑 Log in to MLite and save credentials locally."""
    if not username:
        username = typer.prompt("Username or email")
    if not password:
        password = typer.prompt("Password", hide_input=True)

    try:
        res = httpx.post(
            f"{api_url}/api/v1/auth/login",
            json={"username": username, "password": password},
            timeout=10.0,
        )
        if res.status_code == 401:
            console.print("[bold red]✗ Authentication failed:[/bold red] Incorrect username or password.")
            raise typer.Exit(code=1)
        elif res.status_code != 200:
            console.print(f"[bold red]Error {res.status_code}:[/bold red] {res.text}")
            raise typer.Exit(code=1)

        data = res.json()
        save_credentials({
            "access_token": data["access_token"],
            "refresh_token": data.get("refresh_token"),
            "token_type": data.get("token_type", "bearer"),
            "api_url": api_url,
            "username": username,
        })

        console.print(
            Panel(
                f"[bold green]✓ Successfully logged in as [cyan]{username}[/cyan][/bold green]\n"
                f"Session token saved to [dim]~/.mlite/credentials[/dim]",
                title="MLite Auth",
                border_style="green",
            )
        )
    except httpx.RequestError as exc:
        console.print(f"[bold red]Connection error:[/bold red] Could not reach API at {api_url}: {exc}")
        raise typer.Exit(code=1)


def logout() -> None:
    """🚪 Log out and remove local credentials."""
    cleared = clear_credentials()
    if cleared:
        console.print("[green]✓ Successfully logged out. Credentials cleared.[/green]")
    else:
        console.print("[dim]No active session found.[/dim]")


def whoami(
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """👤 Display information about the currently logged in user."""
    headers = get_auth_headers()
    if not headers:
        console.print("[yellow]Not logged in.[/yellow] Run [cyan]mlite login[/cyan] or set [cyan]MLITE_API_KEY[/cyan].")
        raise typer.Exit(code=1)

    try:
        res = httpx.get(f"{api_url}/api/v1/auth/me", headers=headers, timeout=10.0)
        if res.status_code == 401:
            console.print("[bold red]Session expired or invalid.[/bold red] Please run [cyan]mlite login[/cyan].")
            raise typer.Exit(code=1)
        elif res.status_code != 200:
            console.print(f"[bold red]Error {res.status_code}:[/bold red] {res.text}")
            raise typer.Exit(code=1)

        user = res.json()
        table = Table(title=f"Current User: {user.get('username')}", show_header=False)
        table.add_column("Field", style="cyan")
        table.add_column("Value", style="green")
        table.add_row("ID", user.get("id"))
        table.add_row("Username", user.get("username"))
        table.add_row("Email", user.get("email"))
        table.add_row("Full Name", user.get("full_name") or "—")
        table.add_row("Role", f"[bold yellow]{user.get('role')}[/bold yellow]")
        perms = user.get("permissions", [])
        table.add_row("Permissions", f"{len(perms)} granted ({', '.join(perms[:5])}...)")
        console.print(table)
    except httpx.RequestError as exc:
        console.print(f"[bold red]Connection error:[/bold red] {exc}")
        raise typer.Exit(code=1)


# ── API Key Management Typer ───────────────────────────────────

api_key_app = typer.Typer(no_args_is_help=True, help="Manage API keys for CI/CD and automation")


@api_key_app.command("create")
def create_key(
    name: str = typer.Argument(..., help="Descriptive name for the API key (e.g. 'CI-Runner')"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """Generate a new long-lived API key."""
    headers = get_auth_headers()
    if not headers:
        console.print("[red]Authentication required.[/red] Run [cyan]mlite login[/cyan] first.")
        raise typer.Exit(code=1)

    try:
        res = httpx.post(
            f"{api_url}/api/v1/auth/api-keys",
            json={"name": name},
            headers=headers,
            timeout=10.0,
        )
        if res.status_code != 201:
            console.print(f"[bold red]Error {res.status_code}:[/bold red] {res.text}")
            raise typer.Exit(code=1)

        data = res.json()
        console.print(
            Panel(
                f"[bold yellow]API Key Created Successfully![/bold yellow]\n\n"
                f"[bold white]Key:[/bold white] [cyan]{data.get('key')}[/cyan]\n"
                f"[bold white]Prefix:[/bold white] {data.get('key_prefix')}\n"
                f"[bold white]ID:[/bold white] {data.get('id')}\n\n"
                f"[bold red]⚠ Warning:[/bold red] Store this key now. It will [bold]never[/bold] be shown again!",
                title="New API Key",
                border_style="yellow",
            )
        )
    except httpx.RequestError as exc:
        console.print(f"[bold red]Connection error:[/bold red] {exc}")
        raise typer.Exit(code=1)


@api_key_app.command("list")
def list_keys(
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """List all API keys belonging to the current user."""
    headers = get_auth_headers()
    if not headers:
        console.print("[red]Authentication required.[/red] Run [cyan]mlite login[/cyan] first.")
        raise typer.Exit(code=1)

    try:
        res = httpx.get(f"{api_url}/api/v1/auth/api-keys", headers=headers, timeout=10.0)
        if res.status_code != 200:
            console.print(f"[bold red]Error {res.status_code}:[/bold red] {res.text}")
            raise typer.Exit(code=1)

        keys = res.json().get("api_keys", [])
        if not keys:
            console.print("[dim]No API keys found. Run [cyan]mlite api-key create <name>[/cyan] to create one.[/dim]")
            return

        table = Table(title="MLite API Keys")
        table.add_column("ID", style="dim")
        table.add_column("Name", style="bold")
        table.add_column("Prefix")
        table.add_column("Status", justify="center")
        table.add_column("Created", style="dim")
        table.add_column("Last Used", style="dim")

        for k in keys:
            status_str = "[red]REVOKED[/red]" if k.get("is_revoked") else "[green]ACTIVE[/green]"
            table.add_row(
                k.get("id", "")[:8],
                k.get("name"),
                k.get("key_prefix"),
                status_str,
                (k.get("created_at") or "")[:19],
                (k.get("last_used_at") or "never")[:19],
            )
        console.print(table)
    except httpx.RequestError as exc:
        console.print(f"[bold red]Connection error:[/bold red] {exc}")
        raise typer.Exit(code=1)


@api_key_app.command("revoke")
def revoke_key(
    key_id: str = typer.Argument(..., help="API key ID to revoke"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """Revoke an API key immediately."""
    headers = get_auth_headers()
    if not headers:
        console.print("[red]Authentication required.[/red] Run [cyan]mlite login[/cyan] first.")
        raise typer.Exit(code=1)

    try:
        res = httpx.delete(f"{api_url}/api/v1/auth/api-keys/{key_id}", headers=headers, timeout=10.0)
        if res.status_code == 204:
            console.print(f"[green]✓ API key [cyan]{key_id}[/cyan] revoked successfully.[/green]")
        elif res.status_code == 404:
            console.print(f"[red]✗ API key '{key_id}' not found.[/red]")
            raise typer.Exit(code=1)
        else:
            console.print(f"[bold red]Error {res.status_code}:[/bold red] {res.text}")
            raise typer.Exit(code=1)
    except httpx.RequestError as exc:
        console.print(f"[bold red]Connection error:[/bold red] {exc}")
        raise typer.Exit(code=1)


# ── User Management Typer ──────────────────────────────────────

user_app = typer.Typer(no_args_is_help=True, help="Manage user accounts (Admin only)")


@user_app.command("list")
def list_users(
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """List all registered user accounts."""
    headers = get_auth_headers()
    if not headers:
        console.print("[red]Authentication required.[/red] Run [cyan]mlite login[/cyan] first.")
        raise typer.Exit(code=1)

    try:
        res = httpx.get(f"{api_url}/api/v1/users", headers=headers, timeout=10.0)
        if res.status_code == 403:
            console.print("[bold red]Access denied:[/bold red] Only ADMIN users can manage user accounts.")
            raise typer.Exit(code=1)
        elif res.status_code != 200:
            console.print(f"[bold red]Error {res.status_code}:[/bold red] {res.text}")
            raise typer.Exit(code=1)

        users = res.json().get("users", [])
        table = Table(title="MLite Registered Users")
        table.add_column("ID", style="dim")
        table.add_column("Username", style="bold")
        table.add_column("Email")
        table.add_column("Role", justify="center")
        table.add_column("Active", justify="center")
        table.add_column("Created", style="dim")

        for u in users:
            act_str = "[green]✓[/green]" if u.get("is_active") else "[red]✗[/red]"
            table.add_row(
                u.get("id", "")[:8],
                u.get("username"),
                u.get("email"),
                f"[yellow]{u.get('role')}[/yellow]",
                act_str,
                (u.get("created_at") or "")[:19],
            )
        console.print(table)
    except httpx.RequestError as exc:
        console.print(f"[bold red]Connection error:[/bold red] {exc}")
        raise typer.Exit(code=1)


@user_app.command("create")
def create_user_cmd(
    email: str = typer.Argument(..., help="User email address"),
    username: str = typer.Argument(..., help="Unique username"),
    role: str = typer.Option("DEVELOPER", "--role", "-r", help="Role: ADMIN, MAINTAINER, DEVELOPER, VIEWER"),
    password: Optional[str] = typer.Option(None, "--password", "-p", help="Initial password"),
    full_name: Optional[str] = typer.Option(None, "--name", help="Full name"),
    api_url: str = typer.Option(DEFAULT_API_URL, "--api-url", envvar="MLITE_API_URL", help="MLite API URL"),
) -> None:
    """Create a new user account (Admin only)."""
    headers = get_auth_headers()
    if not headers:
        console.print("[red]Authentication required.[/red] Run [cyan]mlite login[/cyan] first.")
        raise typer.Exit(code=1)

    if not password:
        password = typer.prompt("Set initial password", hide_input=True)

    try:
        res = httpx.post(
            f"{api_url}/api/v1/users",
            json={
                "email": email,
                "username": username,
                "password": password,
                "role": role.upper(),
                "full_name": full_name,
            },
            headers=headers,
            timeout=10.0,
        )
        if res.status_code == 403:
            console.print("[bold red]Access denied:[/bold red] Only ADMIN users can create accounts.")
            raise typer.Exit(code=1)
        elif res.status_code == 409:
            console.print("[bold red]Conflict:[/bold red] User with this email or username already exists.")
            raise typer.Exit(code=1)
        elif res.status_code != 201:
            console.print(f"[bold red]Error {res.status_code}:[/bold red] {res.text}")
            raise typer.Exit(code=1)

        user = res.json()
        console.print(f"[green]✓ User [cyan]{user.get('username')}[/cyan] ({user.get('role')}) created successfully.[/green]")
    except httpx.RequestError as exc:
        console.print(f"[bold red]Connection error:[/bold red] {exc}")
        raise typer.Exit(code=1)
