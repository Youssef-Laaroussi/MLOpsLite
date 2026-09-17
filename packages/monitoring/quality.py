"""Automated data quality validation engine for tabular datasets."""

import logging
from pathlib import Path
from typing import Any, Dict, List, Optional, Tuple

logger = logging.getLogger(__name__)

try:
    import polars as pl
    _POLARS_AVAILABLE = True
except ImportError:
    pl = None  # type: ignore
    _POLARS_AVAILABLE = False


class DataQualityEngine:
    """Evaluates tabular datasets against completeness, uniqueness, validity, and consistency rules."""

    DEFAULT_MAX_NULL_PCT = 5.0
    DEFAULT_MAX_DUP_PCT = 1.0

    @classmethod
    def evaluate(
        cls,
        file_path: str | Path,
        max_null_pct: float = DEFAULT_MAX_NULL_PCT,
        max_dup_pct: float = DEFAULT_MAX_DUP_PCT,
        required_columns: Optional[List[str]] = None,
        column_bounds: Optional[Dict[str, Tuple[float, float]]] = None,
    ) -> Dict[str, Any]:
        """Profile dataset and compute composite quality score (0-100) and failed constraints."""
        path = Path(file_path)
        if not path.is_file():
            raise FileNotFoundError(f"File not found: {file_path}")

        failed_constraints: List[Dict[str, Any]] = []

        # Load data using Polars if available
        if _POLARS_AVAILABLE:
            if path.suffix.lower() in (".parquet", ".pq"):
                df = pl.read_parquet(path)
            elif path.suffix.lower() in (".json", ".jsonl"):
                df = pl.read_json(path)
            else:
                df = pl.read_csv(path, ignore_errors=True)

            total_rows = len(df)
            total_cols = len(df.columns)

            if total_rows == 0:
                return {
                    "score": 0.0,
                    "status": "FAIL",
                    "rows_count": 0,
                    "cols_count": total_cols,
                    "null_percentage": 100.0,
                    "duplicate_percentage": 0.0,
                    "failed_constraints": [{"rule": "non_empty", "message": "Dataset is empty"}],
                }

            # 1. Completeness: Null values
            null_counts = df.null_count().to_dicts()[0]
            total_cells = total_rows * total_cols
            total_nulls = sum(null_counts.values())
            overall_null_pct = round((total_nulls / total_cells) * 100.0, 2)

            for col, n_cnt in null_counts.items():
                col_null_pct = (n_cnt / total_rows) * 100.0
                if col_null_pct > max_null_pct:
                    failed_constraints.append({
                        "rule": "null_threshold",
                        "column": col,
                        "observed": round(col_null_pct, 2),
                        "threshold": max_null_pct,
                        "message": f"Column '{col}' has {col_null_pct:.1f}% nulls (threshold: {max_null_pct}%)",
                    })

            # 2. Uniqueness: Duplicate rows
            dup_rows = df.is_duplicated().sum()
            dup_pct = round((dup_rows / total_rows) * 100.0, 2)
            if dup_pct > max_dup_pct:
                failed_constraints.append({
                    "rule": "duplicate_threshold",
                    "observed": dup_pct,
                    "threshold": max_dup_pct,
                    "message": f"Dataset has {dup_pct:.1f}% duplicate rows (threshold: {max_dup_pct}%)",
                })

            # 3. Validity: Required columns
            if required_columns:
                for req in required_columns:
                    if req not in df.columns:
                        failed_constraints.append({
                            "rule": "required_column",
                            "column": req,
                            "message": f"Required column '{req}' is missing",
                        })

            # 4. Consistency: Value bounds
            if column_bounds:
                for col, (min_v, max_v) in column_bounds.items():
                    if col in df.columns and df[col].dtype in (pl.Float32, pl.Float64, pl.Int32, pl.Int64):
                        outliers = df.filter((pl.col(col) < min_v) | (pl.col(col) > max_v)).height
                        if outliers > 0:
                            failed_constraints.append({
                                "rule": "value_bounds",
                                "column": col,
                                "outliers_count": outliers,
                                "bounds": [min_v, max_v],
                                "message": f"Column '{col}' contains {outliers} values outside [{min_v}, {max_v}]",
                            })

        else:
            # Fallback basic python CSV parsing
            import csv
            with open(path, "r", encoding="utf-8", errors="replace") as f:
                reader = csv.reader(f)
                header = next(reader, [])
                total_cols = len(header)
                rows = list(reader)
                total_rows = len(rows)

            total_cells = max(1, total_rows * total_cols)
            total_nulls = sum(sum(1 for val in r if val == "" or val.lower() == "nan") for r in rows)
            overall_null_pct = round((total_nulls / total_cells) * 100.0, 2)
            dup_pct = 0.0

        # Calculate composite score (0 - 100)
        # Completeness weight: 40%, Uniqueness: 30%, Validity/Bounds: 30%
        completeness_score = max(0.0, 100.0 - (overall_null_pct * 3.0))
        uniqueness_score = max(0.0, 100.0 - (dup_pct * 10.0))
        penalty = min(60.0, len(failed_constraints) * 15.0)
        validity_score = max(0.0, 100.0 - penalty)

        score = round(
            (completeness_score * 0.40) + (uniqueness_score * 0.30) + (validity_score * 0.30),
            1,
        )

        # Status determination
        if score >= 85.0 and len(failed_constraints) == 0:
            status = "PASS"
        elif score >= 70.0:
            status = "WARN"
        else:
            status = "FAIL"

        return {
            "score": score,
            "status": status,
            "rows_count": total_rows,
            "cols_count": total_cols,
            "null_percentage": overall_null_pct,
            "duplicate_percentage": dup_pct,
            "failed_constraints": failed_constraints,
        }
