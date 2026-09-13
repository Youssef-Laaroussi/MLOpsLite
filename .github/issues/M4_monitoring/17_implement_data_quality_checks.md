# #17 — Implement automated data quality checks and validation reports

> **Milestone:** M4 — Monitoring  
> **Priority:** `P1`  
> **Labels:** `monitoring` `P1`  

---

## Problem
Garbage in, garbage out: training or serving on corrupt data (missing columns, severe null rates, unanticipated duplicate rows, extreme outliers) ruins model accuracy. There is currently no pre-flight data quality check in MLite to catch bad data before training or batch inference runs.

## Objective
Build an automated data quality validation engine in `packages/monitoring/quality.py` that evaluates datasets against schema rules, checks for missingness, duplicates, distributions, and produces an overall Data Quality Score (0-100).

## Proposed solution
Implement a high-speed data profiler using Polars. Evaluate datasets against configurable constraints: missing value thresholds, duplicate percentages, column type conformity, and value ranges. Expose CLI command `mlite data validate <dataset_file>` and REST endpoint `POST /api/v1/datasets/{id}/validate`.

## Technical requirements
- Data Quality Rules: column existence, type conformance, null percentage threshold (e.g. < 5%), duplicate row threshold (< 1%), value bounds (min/max).
- Quality score algorithm: weighted composite metric (0-100) combining completeness, uniqueness, validity, and consistency.
- Report output: JSON payload and pretty terminal output displaying: Rows, Columns, Missing %, Duplicates %, Quality Score, and Status (PASS/WARN/FAIL).
- Database table `data_quality_reports`: stores historical scores and failed constraint lists.

## Acceptance criteria
- Running `mlite data validate data/train.csv` generates a formatted terminal summary and passes or fails based on thresholds.
- Datasets with critical errors (e.g. missing target column or >20% nulls) return status `FAIL` and exit code 1.
- Quality report JSON is archived in MinIO and retrievable via the MLite API.
- Fast evaluation: profiling a 100,000 row dataset executes in under 2 seconds.

## Tests
- Unit tests in `tests/unit/monitoring/test_data_quality.py` testing clean, missing-rich, and duplicate-rich datasets.
- Test threshold violation logic and composite score calculation.

## Documentation
- Write `docs/monitoring/data_quality.md` explaining quality score computation and rule configuration in `mlite.yaml`.
- Add sample validation reports for common data formats.

## Dependencies
Issue #15 (Dataset Management).
