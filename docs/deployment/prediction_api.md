# Standardized Prediction REST API

> Uniform REST contract for all deployed MLite models with automatic schema validation and latency tracking.

---

## Endpoints Overview

Every model deployed with MLite exposes three standard HTTP endpoints:

| Method | Path | Description |
|---|---|---|
| `POST` | `/predict` | Score single or batch inference samples |
| `GET` | `/metadata` | Inspect input features, data types, and framework version |
| `GET` | `/health` | Container liveness and model readiness probe |

---

## 1. Inference Request Contract (`POST /predict`)

The `/predict` endpoint accepts any of three standardized tabular envelopes.

### Option A: 2D Matrix (`inputs`)

Optimized for high-throughput numeric models (NumPy/PyTorch style).

```json
{
  "inputs": [
    [5.1, 3.5, 1.4, 0.2],
    [6.2, 2.9, 4.3, 1.3]
  ]
}
```

### Option B: Dataframe Records (`dataframe_records`)

List of key-value dictionaries. Idiomatic for JSON payloads from web applications and microservices.

```json
{
  "dataframe_records": [
    {"age": 34, "income": 72000, "credit_score": 710},
    {"age": 52, "income": 115000, "credit_score": 650}
  ]
}
```

### Option C: Split Dataframe (`dataframe_split`)

Matches `pandas.DataFrame.to_dict(orient="split")`. Highly compact for large batch transfers without key repetition.

```json
{
  "dataframe_split": {
    "columns": ["age", "income", "credit_score"],
    "data": [
      [34, 72000, 710],
      [52, 115000, 650]
    ]
  }
}
```

---

## 2. Response Contract

Status: `200 OK`

```json
{
  "predictions": [1, 0],
  "model": "fraud-detector",
  "version": "2",
  "latency_ms": 2.418
}
```

### Response Headers
- `X-Inference-Latency-Ms`: Pure compute execution time in milliseconds (excluding network transit).

---

## Code Examples

### cURL

```bash
curl -X POST http://localhost:8100/predict \
  -H "Content-Type: application/json" \
  -d '{
    "inputs": [
      [0.85, 1.22, -0.45],
      [0.10, -0.73, 0.98]
    ]
  }'
```

### Python (`httpx` or `requests`)

```python
import httpx

endpoint = "http://localhost:8100/predict"

payload = {
    "dataframe_records": [
        {"transaction_amount": 1500.0, "distance_from_home": 45.2, "is_weekend": 1},
        {"transaction_amount": 12.5, "distance_from_home": 1.1, "is_weekend": 0},
    ]
}

response = httpx.post(endpoint, json=payload)
data = response.json()

print(f"Predictions: {data['predictions']}")
print(f"Latency: {data['latency_ms']} ms")
```

---

## Batch Payload Optimization Guidelines

1. **Batch Size Tuning**: For tabular inference, batch sizes between **64 and 512 rows** achieve optimal CPU SIMD utilization.
2. **Use Split Format for Large Batches**: When sending more than 100 rows, use `dataframe_split` rather than `dataframe_records` to reduce JSON serialization overhead by 60–80%.
3. **HTTP Keep-Alive**: Reuse persistent HTTP connections (`httpx.Client()` or `requests.Session()`) to eliminate TCP/TLS handshake latency.
