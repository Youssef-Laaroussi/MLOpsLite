"""Unit tests for automated data quality checks and validation engine (Issue #17)."""

import csv
import pytest
from pathlib import Path

from packages.monitoring.quality import DataQualityEngine


@pytest.fixture
def clean_csv(tmp_path):
    f = tmp_path / "clean.csv"
    with open(f, "w", newline="", encoding="utf-8") as fp:
        w = csv.writer(fp)
        w.writerow(["id", "feature_a", "feature_b", "target"])
        for i in range(100):
            w.writerow([i, i * 1.5, i * 2.0, i % 2])
    return f


@pytest.fixture
def null_heavy_csv(tmp_path):
    f = tmp_path / "nulls.csv"
    with open(f, "w", newline="", encoding="utf-8") as fp:
        w = csv.writer(fp)
        w.writerow(["id", "feature_a", "feature_b", "target"])
        for i in range(100):
            # 50% nulls in feature_a
            val_a = "" if i % 2 == 0 else i * 1.5
            w.writerow([i, val_a, i * 2.0, i % 2])
    return f


@pytest.fixture
def duplicate_heavy_csv(tmp_path):
    f = tmp_path / "duplicates.csv"
    with open(f, "w", newline="", encoding="utf-8") as fp:
        w = csv.writer(fp)
        w.writerow(["id", "feature_a", "feature_b", "target"])
        for i in range(100):
            # Duplicate the same row repeatedly
            w.writerow([1, 10.0, 20.0, 1])
    return f


class TestDataQualityEngine:
    """Test DataQualityEngine rule evaluation, scoring, and status outcomes."""

    def test_clean_dataset_passes(self, clean_csv):
        res = DataQualityEngine.evaluate(clean_csv)
        assert res["status"] == "PASS"
        assert res["score"] >= 90.0
        assert res["null_percentage"] == 0.0
        assert res["duplicate_percentage"] == 0.0
        assert len(res["failed_constraints"]) == 0

    def test_null_heavy_dataset_triggers_rule_violation(self, null_heavy_csv):
        res = DataQualityEngine.evaluate(null_heavy_csv, max_null_pct=5.0)
        assert res["null_percentage"] > 10.0
        assert any(fc["rule"] == "null_threshold" for fc in res["failed_constraints"])
        assert res["status"] in ("WARN", "FAIL")

    def test_duplicate_heavy_dataset_triggers_violation(self, duplicate_heavy_csv):
        res = DataQualityEngine.evaluate(duplicate_heavy_csv, max_dup_pct=1.0)
        assert res["duplicate_percentage"] > 50.0
        assert any(fc["rule"] == "duplicate_threshold" for fc in res["failed_constraints"])
        assert res["status"] in ("WARN", "FAIL")

    def test_missing_required_columns_fails(self, clean_csv):
        res = DataQualityEngine.evaluate(clean_csv, required_columns=["non_existent_column"])
        assert any(fc["rule"] == "required_column" for fc in res["failed_constraints"])

    def test_empty_dataset_returns_fail(self, tmp_path):
        empty_csv = tmp_path / "empty.csv"
        empty_csv.write_text("")
        res = DataQualityEngine.evaluate(empty_csv)
        assert res["status"] == "FAIL"
        assert res["score"] == 0.0
