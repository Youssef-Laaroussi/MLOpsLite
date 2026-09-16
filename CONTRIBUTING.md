# Contributing to MLite

First off, thank you for considering contributing to **MLite**! 🎉
MLite is built for the community: a lightweight, self-hosted MLOps platform built for small teams who want full ML lifecycle management without the overhead of Kubernetes or proprietary cloud lock-in.

---

## Code of Conduct

By participating in this project, you agree to abide by our [Code of Conduct](CODE_OF_CONDUCT.md). Please report any unacceptable behavior to [security@mlite.dev](mailto:security@mlite.dev).

---

## How Can I Contribute?

### 1. Picking an Issue from our Roadmap
We maintain an organized list of **40 structured GitHub Issues** divided into milestones:
- Check our [ROADMAP.md](ROADMAP.md) to see available issues across Milestones M0 through M9.
- Issues tagged with `good first issue` or `help wanted` are great starting points.
- Comment on the issue to let others know you are working on it.

### 2. Reporting Bugs
- Search existing issues to ensure the bug hasn't already been reported.
- Use our GitHub Issue **Bug Report** template.
- Provide a clear, reproducible example (Python script, CLI command, or docker compose logs).

### 3. Suggesting Enhancements
- Open a feature request discussing the proposal.
- Clearly describe the use case, why existing features are insufficient, and how it aligns with MLite's core vision (self-hosted, simple, progressive complexity).

---

## Development Workflow

### Prerequisites
- **Python 3.12+**
- **Docker & Docker Compose v2**
- **Node.js 20+** (if contributing to the React dashboard in `apps/web`)
- **Git**

### 1. Fork & Clone
```bash
git clone https://github.com/<your-username>/MLOpsLite.git
cd MLOpsLite
git remote add upstream https://github.com/Youssef-Laaroussi/MLOpsLite.git
```

### 2. Create a Topic Branch
Branch names should follow conventional prefixes:
- `feat/<feature-name>` (e.g., `feat/docker-deployment-healthcheck`)
- `fix/<bug-name>` (e.g., `fix/minio-artifact-url-resolution`)
- `docs/<doc-update>` (e.g., `docs/quickstart-guide`)
- `test/<test-suite>` (e.g., `test/e2e-model-rollback`)

```bash
git checkout -b feat/my-new-feature
```

### 3. Local Environment Setup
```bash
# Create and activate a virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install development dependencies
pip install -e ".[dev]"
```

### 4. Code Standards & Linting
We enforce strict type checking and style standards:
- **Linter & Formatter**: [Ruff](https://github.com/astral-sh/ruff)
- **Type Checker**: [MyPy](https://github.com/python/mypy)
- **Testing**: [Pytest](https://pytest.org)

Run the checks locally before committing:
```bash
# Format & lint Python code
ruff check . --fix
ruff format .

# Type checking
mypy apps packages

# Run unit tests
pytest tests/unit
```

### 5. Commit Guidelines
We adhere to [Conventional Commits](https://www.conventionalcommits.org/):
- `feat: add docker deployment health check endpoint`
- `fix: correct drift metric calculation for categorical columns`
- `docs: update CLI quickstart examples`
- `test: add integration test for MLflow artifact registry`
- `refactor: modularize worker task scheduler`

### 6. Submitting a Pull Request (PR)
- Push your changes to your fork.
- Open a PR targeting the `dev` branch of `Youssef-Laaroussi/MLOpsLite` (do NOT target `main` directly).
- Reference the related issue (e.g., `Closes #12`).
- Fill out the PR template completely with test results and verification steps.
- Ensure all GitHub Actions CI checks pass.
