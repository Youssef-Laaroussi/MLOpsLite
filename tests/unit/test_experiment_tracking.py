"""Unit tests for experiment tracking (Issue #9).

Tests Git metadata extraction and tracker environment collection.
"""

import platform

import pytest

from packages.tracking.tracker import (
    _collect_environment_metadata,
    _get_git_sha,
    _is_git_dirty,
)


class TestGitMetadata:
    """Test Git SHA and dirty-tree detection."""

    def test_get_git_sha_returns_string_or_none(self):
        sha = _get_git_sha()
        if sha is not None:
            assert len(sha) == 40
            assert all(c in "0123456789abcdef" for c in sha)

    def test_is_git_dirty_returns_bool(self):
        result = _is_git_dirty()
        assert isinstance(result, bool)


class TestEnvironmentMetadata:
    """Test automatic metadata collection."""

    def test_collects_python_version(self):
        meta = _collect_environment_metadata()
        assert "python_version" in meta
        assert meta["python_version"] == platform.python_version()

    def test_collects_os_platform(self):
        meta = _collect_environment_metadata()
        assert "os_platform" in meta
        assert "os_name" in meta

    def test_collects_hostname(self):
        meta = _collect_environment_metadata()
        assert "hostname" in meta

    def test_collects_mlite_version(self):
        meta = _collect_environment_metadata()
        assert meta["mlite_version"] == "0.1.0"

    def test_collects_git_info_when_available(self):
        meta = _collect_environment_metadata()
        if "git_commit" in meta:
            assert len(meta["git_commit"]) == 40
            assert meta["git_dirty"] in ("True", "False")
