# Automated Data Quality Checks & Validation

> Fast, pre-flight data profiling, constraint validation, and composite data quality scoring.

---

## Overview

Corrupted training or inference data leads to silent model degradation. MLite provides automated data quality profiling powered by Polars, catching anomalies (missing columns, severe null rates, duplicate rows, extreme outliers) before model training or scoring runs.

---

## Data Quality Rules & Constraints

| Rule | Description | Default Threshold | Severity |
|---|---|---|---|
| **Completeness** | Column-level and overall null/NaN rates | `< 5.0%` nulls | High |
| **Uniqueness** | Proportion of duplicated rows across the dataset | `< 1.0%` duplicates | Medium |
| **Validity** | Schema conformance and required column existence | Target column present | Critical |
| **Consistency** | Value bounds and statistical distribution checks | Within `[min, max]` bounds | Warning |

---

## Quality Score Formula

The composite quality score $S \in [0, 100]$ is computed as:

$$S = 0.40 \cdot \text{Completeness} + 0.30 \cdot \text{Uniqueness} + 0.30 \cdot \text{Validity}$$

- **PASS ($S \ge 85$ and 0 failed constraints)**: Dataset is clean and safe for production training.
- **WARN ($70 \le S < 85$)**: Non-critical threshold warnings (e.g. minor null percentages).
- **FAIL ($S < 70$ or critical constraint breach)**: Data pipeline halt, triggering an exit code 1.

---

## CLI Reference

Validate a dataset locally before training:

```bash
# Basic validation with default rules
mlite data validate ./data/train.csv

# Custom thresholds
mlite data validate ./data/train.csv --max-null 2.0 --max-dup 0.5
```

Terminal Output Example:
```
╭────────────────────── 📋 Data Quality Report ──────────────────────╮
│ Quality Score: 94.2 / 100 (PASS)                                   │
│                                                                    │
│ Rows: 100,000 | Columns: 24                                        │
│ Overall Nulls: 0.8%                                                │
│ Duplicate Rows: 0.1%                                               │
│ Failed Constraints: 0                                              │
╰────────────────────────────────────────────────────────────────────╯
```

---

## REST API Endpoint

```bash
curl -X POST http://localhost:8000/api/v1/datasets/d1a2b3c4/validate \
  -H "Content-Type: application/json"
```
