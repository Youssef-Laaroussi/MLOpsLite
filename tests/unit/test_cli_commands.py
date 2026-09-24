"""Unit tests for MLite CLI commands (Issue #8)."""

import json
import os
from pathlib import Path

import pytest
from typer.testing import CliRunner

from apps.cli.main import app

runner = CliRunner()


class TestCLIHelp:
    """Verify CLI help and structure."""

    def test_help_shows_commands(self):
        result = runner.invoke(app, ["--help"])
        assert result.exit_code == 0
        assert "init" in result.output
        assert "status" in result.output
        assert "config" in result.output

    def test_init_help(self):
        result = runner.invoke(app, ["init", "--help"])
        assert (
            "project-name" in result.output.lower()
            or "project_name" in result.output.lower()
            or "PROJECT_NAME" in result.output
        )


class TestInitCommand:
    """Test `mlite init <project-name>`."""

    def test_init_creates_directory_structure(self, tmp_path):
        result = runner.invoke(app, ["init", "test-project", "--dir", str(tmp_path)])
        assert result.exit_code == 0

        project_dir = tmp_path / "test-project"
        assert project_dir.exists()
        assert (project_dir / "data" / "raw").is_dir()
        assert (project_dir / "data" / "processed").is_dir()
        assert (project_dir / "src").is_dir()
        assert (project_dir / "models").is_dir()
        assert (project_dir / "tests").is_dir()
        assert (project_dir / "notebooks").is_dir()
        assert (project_dir / "configs").is_dir()

    def test_init_creates_mlite_yaml(self, tmp_path):
        runner.invoke(app, ["init", "yaml-test", "--dir", str(tmp_path)])
        yaml_file = tmp_path / "yaml-test" / "mlite.yaml"
        assert yaml_file.exists()
        content = yaml_file.read_text()
        assert "yaml-test" in content
        assert "mlflow" in content

    def test_init_creates_config_json(self, tmp_path):
        runner.invoke(app, ["init", "config-test", "--dir", str(tmp_path)])
        config_file = tmp_path / "config-test" / ".mlite" / "config.json"
        assert config_file.exists()
        data = json.loads(config_file.read_text())
        assert data["api_url"] == "http://localhost:8000"
        assert data["project_slug"] == "config-test"

    def test_init_with_description(self, tmp_path):
        runner.invoke(app, [
            "init", "desc-test",
            "--dir", str(tmp_path),
            "--description", "My test project",
        ])
        yaml_file = tmp_path / "desc-test" / "mlite.yaml"
        assert "My test project" in yaml_file.read_text()

    def test_init_fails_if_dir_exists(self, tmp_path):
        (tmp_path / "existing-project").mkdir()
        result = runner.invoke(app, ["init", "existing-project", "--dir", str(tmp_path)])
        assert result.exit_code == 1

    def test_init_creates_gitignore(self, tmp_path):
        runner.invoke(app, ["init", "gi-test", "--dir", str(tmp_path)])
        gitignore = tmp_path / "gi-test" / ".gitignore"
        assert gitignore.exists()
        assert "__pycache__" in gitignore.read_text()


class TestConfigCommand:
    """Test `mlite config` subcommands."""

    def test_config_view(self, tmp_path, monkeypatch):
        # Create config
        config_dir = tmp_path / ".mlite"
        config_dir.mkdir()
        (config_dir / "config.json").write_text(json.dumps({"api_url": "http://test:8000"}))
        monkeypatch.chdir(tmp_path)

        result = runner.invoke(app, ["config", "view"])
        assert result.exit_code == 0

    def test_config_set_and_get(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)

        result = runner.invoke(app, ["config", "set", "api_url", "http://custom:9000"])
        assert result.exit_code == 0

        result = runner.invoke(app, ["config", "get", "api_url"])
        assert result.exit_code == 0
        assert "http://custom:9000" in result.output

    def test_config_get_missing_key(self, tmp_path, monkeypatch):
        monkeypatch.chdir(tmp_path)
        result = runner.invoke(app, ["config", "get", "nonexistent_key"])
        assert result.exit_code == 1
