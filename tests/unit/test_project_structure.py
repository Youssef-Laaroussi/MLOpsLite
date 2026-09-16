"""Verification of MLite monorepo workspace structure."""

from pathlib import Path
import importlib

BASE_DIR = Path(__file__).resolve().parent.parent.parent

EXPECTED_APPS = [
    "api",
    "worker",
    "cli",
    "web",
]

EXPECTED_PACKAGES = [
    "core",
    "data",
    "tracking",
    "registry",
    "deployment",
    "monitoring",
    "alerting",
    "rollback",
]


def test_root_configuration_files_exist() -> None:
    """Verify that root configuration files are present."""
    assert (BASE_DIR / "pyproject.toml").is_file(), "pyproject.toml is missing"
    assert (BASE_DIR / "Makefile").is_file(), "Makefile is missing"
    assert (BASE_DIR / ".editorconfig").is_file(), ".editorconfig is missing"
    assert (BASE_DIR / ".gitignore").is_file(), ".gitignore is missing"


def test_apps_directories_exist() -> None:
    """Verify that all apps directories exist."""
    apps_dir = BASE_DIR / "apps"
    assert apps_dir.is_dir(), "apps/ directory is missing"

    for app in EXPECTED_APPS:
        app_path = apps_dir / app
        assert app_path.is_dir(), f"apps/{app} directory is missing"


def test_packages_directories_and_markers_exist() -> None:
    """Verify that all packages directories, __init__.py, and py.typed markers exist."""
    packages_dir = BASE_DIR / "packages"
    assert packages_dir.is_dir(), "packages/ directory is missing"

    for pkg in EXPECTED_PACKAGES:
        pkg_path = packages_dir / pkg
        assert pkg_path.is_dir(), f"packages/{pkg} directory is missing"
        assert (pkg_path / "__init__.py").is_file(), f"packages/{pkg}/__init__.py is missing"
        assert (pkg_path / "py.typed").is_file(), f"packages/{pkg}/py.typed is missing"


def test_packages_importable() -> None:
    """Verify that all packages can be imported cleanly."""
    for pkg in EXPECTED_PACKAGES:
        module_name = f"packages.{pkg}"
        module = importlib.import_module(module_name)
        assert module is not None, f"Could not import {module_name}"
