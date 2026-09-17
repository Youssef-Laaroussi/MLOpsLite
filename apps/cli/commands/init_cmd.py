"""mlite init <project-name> — scaffold a new ML project directory."""

import json
from pathlib import Path

import typer
from rich.console import Console
from rich.panel import Panel

console = Console()

DEFAULT_MLITE_YAML = """# MLite project configuration
# Docs: https://github.com/Youssef-Laaroussi/MLOpsLite

project:
  name: "{name}"
  version: "0.1.0"
  description: "{description}"

tracking:
  backend: mlflow
  tracking_uri: http://localhost:5000

storage:
  backend: minio
  endpoint: http://localhost:9000
  bucket: mlite-datasets

deployment:
  runtime: docker
  port: 5001
"""


def init(
    project_name: str = typer.Argument(..., help="Name of the ML project to create"),
    description: str = typer.Option("", "--description", "-d", help="Project description"),
    git_url: str = typer.Option("", "--git-url", "-g", help="Git repository URL"),
    directory: str = typer.Option(".", "--dir", help="Parent directory"),
) -> None:
    """🏗️  Initialize a new MLite ML project with standard directory structure."""
    project_dir = Path(directory) / project_name
    if project_dir.exists():
        console.print(f"[red]✗[/red] Directory '{project_dir}' already exists.")
        raise typer.Exit(code=1)

    # Create directory scaffold
    dirs = ["data/raw", "data/processed", "src", "models", "tests", "notebooks", "configs"]
    for d in dirs:
        (project_dir / d).mkdir(parents=True, exist_ok=True)

    # Write mlite.yaml
    yaml_content = DEFAULT_MLITE_YAML.format(
        name=project_name,
        description=description or f"MLite project: {project_name}",
    )
    (project_dir / "mlite.yaml").write_text(yaml_content)

    # Write .mlite/config.json
    mlite_config_dir = project_dir / ".mlite"
    mlite_config_dir.mkdir(exist_ok=True)
    config_data = {
        "api_url": "http://localhost:8000",
        "project_slug": project_name,
        "git_url": git_url or None,
    }
    (mlite_config_dir / "config.json").write_text(json.dumps(config_data, indent=2))

    # Write .gitignore
    gitignore_lines = [
        "# MLite local config",
        ".mlite/",
        "",
        "# Python",
        "__pycache__/",
        "*.pyc",
        ".venv/",
        "venv/",
        "",
        "# Data (track with DVC if needed)",
        "data/raw/*",
        "!data/raw/.gitkeep",
        "data/processed/*",
        "!data/processed/.gitkeep",
        "",
        "# Models",
        "models/*",
        "!models/.gitkeep",
    ]
    (project_dir / ".gitignore").write_text("\n".join(gitignore_lines) + "\n")

    # Write placeholder .gitkeep files
    for keep in ["data/raw/.gitkeep", "data/processed/.gitkeep", "models/.gitkeep"]:
        (project_dir / keep).touch()

    # Write src/__init__.py
    (project_dir / "src" / "__init__.py").write_text(f'"""Source code for {project_name}."""\n')

    # Write tests/__init__.py
    (project_dir / "tests" / "__init__.py").write_text("")

    console.print(
        Panel(
            f"[bold green]✓ Project '{project_name}' initialized successfully![/bold green]\n\n"
            f"📂 Location: [cyan]{project_dir.resolve()}[/cyan]\n"
            f"📄 Config:   [cyan]{project_dir / 'mlite.yaml'}[/cyan]\n\n"
            "Next steps:\n"
            f"  [dim]cd {project_name}[/dim]\n"
            "  [dim]mlite status[/dim]\n"
            "  [dim]mlite experiment run src/train.py[/dim]",
            title="🚀 MLite Init",
            border_style="green",
        )
    )
