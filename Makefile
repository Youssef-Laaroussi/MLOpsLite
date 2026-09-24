.PHONY: help install lint format test clean compose-up compose-down

help: ## Show this help message
	@echo "MLite Developer Commands:"
	@grep -E '^[a-zA-Z_-]+:.*?## .*$$' $(MAKEFILE_LIST) | sort | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

install: ## Install dependencies in editable mode
	pip install -e ".[dev]"

lint: ## Run Ruff linter and MyPy static type checks
	ruff check .
	mypy apps packages

format: ## Format code using Ruff
	ruff format .
	ruff check . --fix

test: ## Run unit tests with Pytest
	pytest tests/unit

compose-up: ## Start local Docker Compose infrastructure
	docker compose up -d

compose-down: ## Stop Docker Compose infrastructure
	docker compose down

compose-config: ## Validate docker-compose.yml configuration
	docker compose config

compose-ps: ## View running Compose service status
	docker compose ps

compose-logs: ## Follow logs from all Compose services
	docker compose logs -f

clean: ## Remove build, cache, and test artifacts
	rm -rf build/ dist/ *.egg-info .pytest_cache .mypy_cache .ruff_cache htmlcov/ .coverage
	find . -type d -name "__pycache__" -exec rm -rf {} +
