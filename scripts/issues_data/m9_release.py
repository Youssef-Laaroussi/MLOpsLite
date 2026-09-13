"""Milestone 9: Release (Issues #39 -> #40)"""

M9_ISSUES = [
    {
        "number": 39,
        "title": "Prepare and publish MLite v0.1.0 MVP community release",
        "milestone": "M9 — Release",
        "milestone_code": "M9_release",
        "priority": "P0",
        "labels": ["release", "P0"],
        "filename": "39_prepare_v010_release.md",
        "problem": (
            "Delivering the MVP requires coordinating all P0 deliverables (monorepo layout, Docker Compose, PostgreSQL, "
            "MLflow, MinIO, FastAPI API, Typer CLI, project management, experiment tracking, model registry, basic Docker deployment, "
            "unit tests, and documentation) into a tested, tagged, and published release artifact."
        ),
        "objective": (
            "Finalize, validate, and publish MLite v0.1.0 (MVP), including the Python CLI package on PyPI, Docker images on GHCR, "
            "a comprehensive changelog, and release announcement."
        ),
        "proposed_solution": (
            "Execute the release checklist: 1. Code freeze and version bump to 0.1.0 in `pyproject.toml`; "
            "2. Execute full regression test suite (unit, integration, E2E Iris); 3. Build and verify production Docker images; "
            "4. Publish `mlite-cli` to PyPI; 5. Publish `ghcr.io/youssef-laaroussi/mlite` containers; "
            "6. Generate `CHANGELOG.md` and GitHub Release notes with installation instructions."
        ),
        "technical_requirements": [
            "Semantic Versioning `v0.1.0` tag in Git.",
            "GitHub Release with signed Git tag, changelog notes, and architecture diagram assets.",
            "Pre-built multi-arch Docker images tagged with `0.1.0` and `latest`.",
            "Published Python package `mlite-cli` on PyPI or TestPyPI with clean metadata.",
            "Smoke testing of the official installation commands on a clean machine."
        ],
        "acceptance_criteria": [
            "Tag `v0.1.0` triggers the release pipeline and publishes all release assets cleanly.",
            "`pip install mlite-cli==0.1.0` installs successfully in a clean virtual environment.",
            "`docker compose up -d` pulls and launches v0.1.0 services without compilation errors.",
            "Release announcement blog post or GitHub Discussion published."
        ],
        "tests": [
            "Execute end-to-end smoke test using published PyPI wheel and published Docker containers.",
            "Verify checksums and signatures of all release assets."
        ],
        "documentation": [
            "`CHANGELOG.md` entry for v0.1.0 summarizing core features, breaking changes, and upgrade guide.",
            "Update README release badge and quickstart version."
        ],
        "dependencies": "Milestones M0 (Setup), M1 (Core MLOps), M2 (Deployment), Issue #28 (Tests), Issue #33 (Docs)."
    },
    {
        "number": 40,
        "title": "Prepare and publish MLite v1.0.0 General Availability (GA) production release",
        "milestone": "M9 — Release",
        "milestone_code": "M9_release",
        "priority": "P2",
        "labels": ["release", "P2"],
        "filename": "40_prepare_v100_release.md",
        "problem": (
            "Transitioning from MVP (v0.1.0) to General Availability (v1.0.0) requires hardening the entire platform: "
            "incorporating user feedback, freezing stable public APIs, finalizing RBAC and audit logging, ensuring comprehensive "
            "test coverage, battle-testing drift and auto-rollback in production-like workloads, and delivering polished documentation."
        ),
        "objective": (
            "Deliver the official MLite v1.0.0 GA production release, declaring API stability, comprehensive self-hosted MLOps "
            "readiness, full test automation, and an established open-source governance process."
        ),
        "proposed_solution": (
            "Conduct full stabilization cycle: 1. API contract freeze (FastAPI and CLI backward compatibility guarantee); "
            "2. Full security and vulnerability audit; 3. Stress and load testing of inference serving and monitoring workers; "
            "4. Complete documentation site deployment; 5. Tag `v1.0.0`, publish packages, and launch public community roadmap."
        ),
        "technical_requirements": [
            "API Stability guarantee: SemVer policy committing to zero breaking API changes within 1.x series.",
            "Comprehensive test coverage: >= 85% coverage across all packages.",
            "Production security review: zero high or critical CVEs in dependencies or container bases.",
            "Automated database migrations tested forwards and backwards between all prior 0.x versions.",
            "Production load test: serving container handles sustained 1,000 req/sec with < 20ms p95 latency."
        ],
        "acceptance_criteria": [
            "All 40 roadmap issues are completed, reviewed, and closed.",
            "Tag `v1.0.0` published with release notes, binaries, and container images.",
            "Production readiness checklist signed off by maintainers.",
            "Complete open-source contributor ecosystem active (discussions, PR templates, issue triage)."
        ],
        "tests": [
            "Run automated soak test for 24 hours under continuous synthetic inference and drift injection.",
            "Run backwards compatibility test verifying that v0.1.0 projects migrate seamlessly to v1.0.0."
        ],
        "documentation": [
            "Comprehensive `v1.0.0` release announcement highlighting the full ML lifecycle journey.",
            "Production deployment guide for enterprise self-hosting."
        ],
        "dependencies": "All Milestones M0 through M8 (Issues #1 through #38)."
    }
]
