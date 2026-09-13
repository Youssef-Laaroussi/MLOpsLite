# #12 — Create standardized prediction REST endpoint and request validation

> **Milestone:** M2 — Deployment  
> **Priority:** `P1`  
> **Labels:** `deployment` `P1`  

---

## Problem
Model inference servers often suffer from inconsistent API contracts. Different models accept varying JSON shapes, making downstream consumer integration brittle and complicating inference monitoring and payload logging.

## Objective
Establish a uniform REST contract for all deployed MLite models, exposing `POST /predict`, `GET /metadata`, and `GET /health` with Pydantic request validation, batch prediction support, and inference latency logging.

## Proposed solution
Implement a standardized FastAPI inference template inside `packages/deployment/server/`. Define standard payload envelopes (`{"inputs": [...]}` or `{"dataframe_records": [...]}`) matching standard MLflow/Seldon inference protocols. Automatically record inference requests and responses into a local buffer for subsequent drift monitoring.

## Technical requirements
- Endpoint `POST /predict`: accepts JSON with 2D array (`inputs`), records (`dataframe_records`), or dictionary of column lists (`dataframe_split`).
- Response contract: `{"predictions": list, "model": str, "version": str, "latency_ms": float}`.
- Endpoint `GET /metadata`: returns feature names, expected data types, model framework (e.g. Scikit-learn, XGBoost), and artifact version.
- Request/Response payload streaming logger writing asynchronous inference records to MinIO for data drift analysis.

## Acceptance criteria
- `POST /predict` validates incoming tensor shapes or tabular records and returns predictions with status 200.
- Invalid inputs (missing features, wrong types) return HTTP 422 with precise validation error messages.
- `GET /metadata` accurately reflects model inputs and schema.
- Average prediction latency is measured and included in the response headers and payload.

## Tests
- Unit tests in `tests/unit/deployment/test_prediction_server.py` verifying tabular array, dictionary, and invalid input schemas.
- Benchmark test verifying endpoint latency overhead is under 5ms.

## Documentation
- Write `docs/deployment/prediction_api.md` outlining the request/response JSON schema with curl and Python `requests` examples.
- Document batch inference payload optimization guidelines.

## Dependencies
Issue #11 (Docker model deployment).
