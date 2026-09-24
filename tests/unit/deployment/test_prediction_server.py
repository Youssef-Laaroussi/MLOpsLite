"""Unit tests for standardized prediction server and request validation (Issue #12)."""

import pytest
from fastapi.testclient import TestClient

from packages.deployment.server.app import app, predictor


@pytest.fixture(autouse=True)
def ensure_predictor_loaded():
    """Ensure model is loaded before tests run."""
    predictor.load()


@pytest.fixture
def client():
    return TestClient(app)


class TestPredictionEndpoints:
    """Test /predict with various valid and invalid input envelope shapes."""

    def test_predict_with_2d_inputs(self, client):
        payload = {
            "inputs": [
                [1.0, 2.0, 3.0],
                [4.0, 5.0, 6.0],
            ]
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert "predictions" in data
        assert len(data["predictions"]) == 2
        assert "latency_ms" in data
        assert data["latency_ms"] >= 0.0
        assert "X-Inference-Latency-Ms" in response.headers

    def test_predict_with_dataframe_records(self, client):
        payload = {
            "dataframe_records": [
                {"feature_a": 10.5, "feature_b": 2.1},
                {"feature_a": 3.2, "feature_b": 8.9},
            ]
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 200

        data = response.json()
        assert len(data["predictions"]) == 2
        assert data["model"] == predictor.model_name
        assert data["version"] == predictor.model_version

    def test_predict_with_dataframe_split(self, client):
        payload = {
            "dataframe_split": {
                "columns": ["age", "income"],
                "data": [
                    [25, 50000],
                    [42, 120000],
                ],
            }
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 200
        data = response.json()
        assert len(data["predictions"]) == 2

    def test_predict_empty_payload_fails_422(self, client):
        response = client.post("/predict", json={})
        assert response.status_code == 422
        assert "Must provide one of" in response.text

    def test_predict_multiple_formats_fails_422(self, client):
        payload = {
            "inputs": [[1, 2]],
            "dataframe_records": [{"a": 1, "b": 2}],
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 422
        assert "Only one payload format" in response.text

    def test_predict_mismatched_split_length_fails_422(self, client):
        payload = {
            "dataframe_split": {
                "columns": ["col1", "col2"],
                "data": [[1, 2, 3]],  # 3 values for 2 columns
            }
        }
        response = client.post("/predict", json=payload)
        assert response.status_code == 422

    def test_metadata_endpoint(self, client):
        response = client.get("/metadata")
        assert response.status_code == 200
        data = response.json()
        assert "model" in data
        assert "version" in data
        assert "framework" in data
        assert "task" in data

    def test_health_probes(self, client):
        health = client.get("/health")
        assert health.status_code == 200
        assert health.json()["status"] == "healthy"
        assert health.json()["model_loaded"] is True

        live = client.get("/live")
        assert live.status_code == 200
        assert live.json()["status"] == "alive"

        ready = client.get("/ready")
        assert ready.status_code == 200
        assert ready.json()["status"] == "ready"
