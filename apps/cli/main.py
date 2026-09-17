"""MLite CLI — main entry point.

Command hierarchy:
  mlite init <project-name>
  mlite config [view|set|get]
  mlite status
  mlite experiment run <script>
  mlite experiment list
  mlite model list
  mlite model register
  mlite model promote
  mlite model compare
"""

import typer
from rich.console import Console

from apps.cli.commands import init_cmd, config_cmd, status_cmd
from apps.cli.commands import experiment_cmd, model_cmd

console = Console()

app = typer.Typer(
    name="mlite",
    help="🚀 MLite — Lightweight Self-Hosted MLOps Platform CLI",
    no_args_is_help=True,
    rich_markup_mode="rich",
)

# ── Register sub-commands ───────────────────────────────────
app.command("init")(init_cmd.init)
app.command("status")(status_cmd.status)
app.add_typer(config_cmd.app, name="config", help="View and manage CLI configuration")
app.add_typer(experiment_cmd.app, name="experiment", help="Manage experiments and training runs")
app.add_typer(model_cmd.app, name="model", help="Manage model registry and promotions")


if __name__ == "__main__":
    app()
