## Description
Briefly describe the changes introduced by this pull request and the problem it solves.

Closes #(issue_number)

## Type of Change
- [ ] 🐛 Bug fix (non-breaking change which fixes an issue)
- [ ] ✨ New feature (non-breaking change which adds functionality)
- [ ] 💥 Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] 📝 Documentation update
- [ ] 🧪 Tests / CI update
- [ ] ⚡ Performance optimization
- [ ] 🎨 Code style / formatting

## Component Affected
- [ ] `apps/api` (FastAPI backend)
- [ ] `apps/cli` (MLite Typer CLI)
- [ ] `apps/web` (React Dashboard)
- [ ] `apps/worker` (Background jobs)
- [ ] `packages/core`
- [ ] `packages/tracking` (MLflow)
- [ ] `packages/registry`
- [ ] `packages/deployment` (Docker serving)
- [ ] `packages/monitoring` (Evidently & Drift)
- [ ] Infrastructure / Docker Compose / CI

## How Has This Been Tested?
Describe the tests you ran to verify your changes. Include details of your testing environment.

- [ ] Unit tests (`pytest tests/unit`)
- [ ] Integration tests (`pytest tests/integration`)
- [ ] Manual verification via CLI or API endpoint

```bash
# Paste test execution output or commands here
```

## Checklist
- [ ] My code follows the style guidelines of this project (`ruff check .` and `ruff format .`).
- [ ] I have performed a self-review of my own code.
- [ ] I have commented my code, particularly in hard-to-understand areas.
- [ ] I have updated corresponding documentation (`docs/`).
- [ ] I have added tests that prove my fix is effective or that my feature works.
- [ ] New and existing unit tests pass locally with my changes.
