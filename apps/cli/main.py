"""MLite CLI — main entry point.

Command hierarchy:
  mlite init <project-name>
  mlite config [view|set|get]
  mlite status
  mlite experiment [run|list]
  mlite model [list|register|promote|compare]
  mlite deploy <model> --version <v> [--port <p>]
  mlite deployment [list|stop|status]
  mlite data [add|list|info|validate|dvc-init|push|pull|checkout]
  mlite monitor [drift|performance]
  mlite alert [list|ack|resolve]
"""

import typer
from rich.console import Console

from apps.cli.commands import init_cmd, config_cmd, status_cmd
from apps.cli.commands import experiment_cmd, model_cmd, deploy_cmd, data_cmd
from apps.cli.commands import monitor_cmd, alert_cmd

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
app.command("deploy", help="Deploy a registered model version to Docker container")(deploy_cmd.deploy_model_action)
app.add_typer(config_cmd.app, name="config", help="View and manage CLI configuration")
app.add_typer(experiment_cmd.app, name="experiment", help="Manage experiments and training runs")
app.add_typer(model_cmd.app, name="model", help="Manage model registry and promotions")
app.add_typer(deploy_cmd.app, name="deployment", help="Manage active model deployments")
app.add_typer(data_cmd.app, name="data", help="Manage datasets, schemas, and DVC sync")
app.add_typer(monitor_cmd.app, name="monitor", help="Monitor feature drift and model performance")
app.add_typer(alert_cmd.app, name="alert", help="Manage alerts and incident notifications")


if __name__ == "__main__":
    app()
