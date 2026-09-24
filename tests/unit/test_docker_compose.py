"""Unit test verifying docker-compose.yml configuration and environment templates."""

from pathlib import Path
import yaml

BASE_DIR = Path(__file__).resolve().parent.parent.parent


def test_compose_file_exists_and_valid_yaml() -> None:
    """Verify docker-compose.yml exists and has valid YAML structure."""
    compose_path = BASE_DIR / "docker-compose.yml"
    assert compose_path.is_file(), "docker-compose.yml does not exist"

    with open(compose_path, encoding="utf-8") as f:
        compose_data = yaml.safe_load(f)

    assert "services" in compose_data, "docker-compose.yml is missing 'services' key"
    services = compose_data["services"]

    # Verify all expected services are defined
    expected_services = [
        "mlite-db",
        "mlite-storage",
        "minio-create-buckets",
        "mlflow",
        "mlite-api",
        "mlite-ui",
    ]
    for service_name in expected_services:
        assert service_name in services, f"Service '{service_name}' is missing in docker-compose.yml"


def test_compose_networks_and_volumes() -> None:
    """Verify named volumes and bridge network are defined."""
    compose_path = BASE_DIR / "docker-compose.yml"
    with open(compose_path, encoding="utf-8") as f:
        compose_data = yaml.safe_load(f)

    assert "volumes" in compose_data, "volumes key missing in docker-compose.yml"
    volumes = compose_data["volumes"]
    assert "mlite_postgres_data" in volumes
    assert "mlite_minio_data" in volumes
    assert "mlite_mlflow_data" in volumes

    assert "networks" in compose_data, "networks key missing in docker-compose.yml"
    assert "mlite-network" in compose_data["networks"]


def test_env_example_contains_core_variables() -> None:
    """Verify .env.example exists and contains required configuration keys."""
    env_path = BASE_DIR / ".env.example"
    assert env_path.is_file(), ".env.example is missing"

    content = env_path.read_text(encoding="utf-8")
    required_keys = [
        "POSTGRES_USER",
        "POSTGRES_PASSWORD",
        "POSTGRES_DB",
        "MINIO_ROOT_USER",
        "MINIO_ROOT_PASSWORD",
        "MLFLOW_PORT",
        "API_PORT",
        "UI_PORT",
    ]
    for key in required_keys:
        assert key in content, f"Key '{key}' is missing in .env.example"
