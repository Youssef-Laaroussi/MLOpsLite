# #16 — Integrate DVC for reproducible data and pipeline version control

> **Milestone:** M3 — Dashboard  
> **Priority:** `P1`  
> **Labels:** `data` `P1`  

---

## Problem
Git is poorly suited for tracking large dataset files (gigabytes of CSVs or tensors). To achieve true end-to-end reproducibility, MLite needs a data versioning engine compatible with Git that points to self-hosted MinIO storage without adding manual user friction.

## Objective
Integrate Data Version Control (DVC) inside `packages/data/dvc_manager.py` and provide CLI integration (`mlite data dvc-init`, `mlite data sync`) configuring MinIO as the default remote S3 storage.

## Proposed solution
Automate DVC configuration within MLite projects. When initializing a project, configure DVC to use MinIO endpoint (`http://localhost:9000/mlite-datasets`) with access keys. Implement helper functions to run `dvc add`, `dvc push`, `dvc pull`, and link `.dvc` tracking files to Git commits and MLite dataset records.

## Technical requirements
- DVC Python API / CLI wrapper (`dvc>=3.50`).
- Automatic remote configuration: `dvc remote add -d minio s3://mlite-datasets/dvc-cache` with custom endpoint URL.
- CLI commands: `mlite data push`, `mlite data pull`, `mlite data checkout`.
- Linkage between Git commit SHA, DVC `.dvc` file hashes, and MLflow experiment runs.

## Acceptance criteria
- Initializing DVC in an MLite project automatically hooks up MinIO remote with zero manual AWS config.
- Executing `mlite data push` uploads dataset chunks to MinIO and generates a `.dvc` pointer file committed to Git.
- Checking out an older git commit and running `mlite data pull` restores the exact historical dataset version.
- Graceful fallback or clear warning if DVC is not installed on the user's host.

## Tests
- Integration test `tests/integration/test_dvc_integration.py` initializing a temporary Git+DVC repo, adding a CSV, pushing to MinIO, and verifying retrieval.
- Unit tests for DVC remote configuration generator.

## Documentation
- Write `docs/data/dvc_integration.md` explaining how DVC works under the hood in MLite.
- Include best practices for collaborating on datasets in small teams without cloud egress fees.

## Dependencies
Issue #5 (MinIO), Issue #8 (CLI), Issue #15 (Dataset management).
