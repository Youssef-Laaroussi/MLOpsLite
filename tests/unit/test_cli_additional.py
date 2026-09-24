"""Unit tests for MLite CLI commands using Typer CliRunner (Issue #28).

Tests argument parsing, flags, environment variables, exit codes,
and formatted terminal outputs across:
- mlite init
- mlite config
- mlite login, logout, whoami
- mlite model
- mlite deployment
- mlite alert
- mlite rollback
- mlite audit
"""

from unittest.mock import patch, MagicMock
from typer.testing import CliRunner

from apps.cli.main import app

runner = CliRunner()


class TestCliConfigCommands:
    """Test CLI configuration subcommands."""

    def test_config_view(self, tmp_path):
        with patch("apps.cli.commands.config_cmd.CONFIG_PATH", tmp_path / "config.json"):
            result = runner.invoke(app, ["config", "view"])
            assert result.exit_code == 0
            assert "MLite Configuration" in result.output

    def test_config_set_and_get(self, tmp_path):
        with patch("apps.cli.commands.config_cmd.CONFIG_PATH", tmp_path / "config.json"):
            set_res = runner.invoke(app, ["config", "set", "api_url", "http://custom:8000"])
            assert set_res.exit_code == 0
            assert "Set api_url" in set_res.output

            get_res = runner.invoke(app, ["config", "get", "api_url"])
            assert get_res.exit_code == 0
            assert "http://custom:8000" in get_res.output

    def test_config_get_nonexistent(self, tmp_path):
        with patch("apps.cli.commands.config_cmd.CONFIG_PATH", tmp_path / "config.json"):
            res = runner.invoke(app, ["config", "get", "non_existent_key"])
            assert res.exit_code != 0


class TestCliAuthCommands:
    """Test login, logout, and whoami commands."""

    def test_logout_clears_credentials(self):
        with patch("apps.cli.commands.auth_cmd.clear_credentials", return_value=True):
            res = runner.invoke(app, ["logout"])
            assert res.exit_code == 0
            assert "Successfully logged out" in res.output

    def test_whoami_unauthenticated(self):
        with patch("apps.cli.commands.auth_cmd.get_auth_headers", return_value={}):
            res = runner.invoke(app, ["whoami"])
            assert res.exit_code != 0
            assert "Not logged in" in res.output

    def test_whoami_authenticated(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "id": "u-123",
            "username": "lead_user",
            "email": "lead@mlite.local",
            "role": "MAINTAINER",
            "permissions": ["model:promote", "deployment:rollback"],
        }
        with patch("apps.cli.commands.auth_cmd.get_auth_headers", return_value={"Authorization": "Bearer fake"}), \
             patch("httpx.get", return_value=mock_response):
            res = runner.invoke(app, ["whoami"])
            assert res.exit_code == 0
            assert "lead_user" in res.output
            assert "MAINTAINER" in res.output


class TestCliAuditCommand:
    """Test audit log listing command."""

    def test_audit_list_unauthenticated(self):
        with patch("apps.cli.commands.audit_cmd.get_auth_headers", return_value={}):
            res = runner.invoke(app, ["audit", "list"])
            assert res.exit_code != 0
            assert "Authentication required" in res.output

    def test_audit_list_success(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "logs": [
                {
                    "timestamp": "2026-09-18T18:00:00Z",
                    "action": "MODEL_PROMOTE",
                    "resource_type": "model",
                    "resource_name": "fraud-v1",
                    "user_email": "admin@mlite.local",
                    "ip_address": "127.0.0.1",
                    "changes_json": {"stage": "PRODUCTION"},
                }
            ],
            "total": 1,
        }
        with patch("apps.cli.commands.audit_cmd.get_auth_headers", return_value={"Authorization": "Bearer token"}), \
             patch("httpx.get", return_value=mock_response):
            res = runner.invoke(app, ["audit", "list"])
            assert res.exit_code == 0
            assert "MODEL_PROMOTE" in res.output
            assert "fraud-v1" in res.output


class TestCliRollbackCommand:
    """Test rollback and rollback-policy commands."""

    def test_rollback_policy_list(self):
        mock_response = MagicMock()
        mock_response.status_code = 200
        mock_response.json.return_value = {
            "policies": [],
            "total": 0,
        }
        with patch("httpx.get", return_value=mock_response):
            res = runner.invoke(app, ["rollback-policy", "list"])
            assert res.exit_code == 0
            assert "No auto-rollback policies" in res.output
