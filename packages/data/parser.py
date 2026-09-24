"""Tabular data file parser and schema inspector using Polars."""

import hashlib
import json
import logging
from pathlib import Path
from typing import Any, Dict, List, Tuple

logger = logging.getLogger(__name__)

try:
    import polars as pl
    _POLARS_AVAILABLE = True
except ImportError:
    pl = None  # type: ignore
    _POLARS_AVAILABLE = False


def compute_sha256(file_path: str | Path) -> Tuple[str, int]:
    """Compute cryptographic SHA-256 hash and byte size of a file in chunks."""
    path = Path(file_path)
    if not path.is_file():
        raise FileNotFoundError(f"File does not exist: {file_path}")

    sha = hashlib.sha256()
    total_bytes = 0
    with open(path, "rb") as f:
        while chunk := f.read(65536):
            sha.update(chunk)
            total_bytes += len(chunk)

    return sha.hexdigest(), total_bytes


class TabularDataParser:
    """Inspects and extracts schema, null counts, and stats from CSV, Parquet, and JSON files."""

    @staticmethod
    def inspect(file_path: str | Path) -> Dict[str, Any]:
        """Parse file and return structural metadata and schema summary."""
        path = Path(file_path)
        sha256, size_bytes = compute_sha256(path)
        suffix = path.suffix.lower()

        if suffix in (".csv", ".tsv"):
            fmt = "CSV"
        elif suffix in (".parquet", ".pq"):
            fmt = "PARQUET"
        elif suffix in (".json", ".jsonl"):
            fmt = "JSON"
        else:
            fmt = "OTHER"

        columns_meta: List[Dict[str, Any]] = []
        sample_records: List[Dict[str, Any]] = []
        row_count = 0
        column_count = 0

        if _POLARS_AVAILABLE:
            try:
                if fmt == "CSV":
                    df = pl.read_csv(path, n_rows=1000)
                    total_rows = pl.scan_csv(path).select(pl.len()).collect().item()
                elif fmt == "PARQUET":
                    df = pl.read_parquet(path, n_rows=1000)
                    total_rows = pl.scan_parquet(path).select(pl.len()).collect().item()
                elif fmt == "JSON":
                    df = pl.read_json(path)
                    total_rows = len(df)
                else:
                    df = pl.read_csv(path, n_rows=1000)
                    total_rows = len(df)

                row_count = int(total_rows)
                column_count = len(df.columns)

                # Schema & null counts
                null_counts = df.null_count().to_dicts()[0]
                for col_name, dtype in df.schema.items():
                    columns_meta.append({
                        "name": col_name,
                        "dtype": str(dtype),
                        "null_count": int(null_counts.get(col_name, 0)),
                    })

                # Sample records (up to 5)
                sample_records = df.head(5).to_dicts()

                return {
                    "hash_sha256": sha256,
                    "format": fmt,
                    "row_count": row_count,
                    "column_count": column_count,
                    "size_bytes": size_bytes,
                    "columns": columns_meta,
                    "sample_records": sample_records,
                }
            except Exception as e:
                logger.warning("Polars inspection failed: %s; falling back to basic parser", e)

        # Fallback basic parser for CSV or JSON
        try:
            if fmt == "CSV":
                import csv
                with open(path, "r", encoding="utf-8", errors="replace") as f:
                    reader = csv.reader(f)
                    header = next(reader, [])
                    column_count = len(header)
                    rows = list(reader)
                    row_count = len(rows)
                    for col in header:
                        columns_meta.append({"name": col, "dtype": "string", "null_count": 0})
                    for row in rows[:5]:
                        sample_records.append(dict(zip(header, row)))
            elif fmt == "JSON":
                with open(path, "r", encoding="utf-8") as f:
                    data = json.load(f)
                    if isinstance(data, list) and data and isinstance(data[0], dict):
                        row_count = len(data)
                        column_count = len(data[0].keys())
                        for col in data[0].keys():
                            columns_meta.append({"name": col, "dtype": "any", "null_count": 0})
                        sample_records = data[:5]
        except Exception as exc:
            logger.error("Fallback parser failed: %s", exc)

        return {
            "hash_sha256": sha256,
            "format": fmt,
            "row_count": row_count,
            "column_count": column_count,
            "size_bytes": size_bytes,
            "columns": columns_meta,
            "sample_records": sample_records,
        }
