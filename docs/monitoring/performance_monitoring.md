# Model Performance & Concept Drift Monitoring

> Real-world accuracy tracking, delayed ground-truth feedback ingestion, and concept drift detection.

---

## Overview

Even when input feature distributions remain stationary, real-world relationships can evolve (concept drift). MLite provides an asynchronous delayed feedback loop to measure production accuracy, precision, recall, and F1 over time.

---

## Delayed Feedback Architecture

```
User App / Client                               MLite Platform
────────────────                                ──────────────
Inference Request ───────[POST /predict]───────> Prediction ID Returned
                                                       │
                                                 (Wait for Real Outcome)
                                                       │
Ground Truth Observed ───[POST /feedback]──────> Ground Truth Matched to ID
                                                       │
                                                 Metric Engine Evaluates
                                                 (Accuracy, Precision, F1)
                                                       │
                                                 Degradation Detected? ──> Trigger Alert
```

---

## Ingesting Ground-Truth Feedback

Submit actual observed outcomes via REST API:

```bash
curl -X POST http://localhost:8000/api/v1/deployments/d1a2b3c4/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "prediction_id": "pred-908124",
    "ground_truth": 1,
    "predicted_value": 1,
    "latency_ms": 3.4
  }'
```

---

## Performance Degradation Rules

MLite continuously compares live sliding-window metrics against the baseline metrics logged when the model version was registered in the Model Registry:

$$\Delta = \frac{\text{Baseline} - \text{Current}}{\text{Baseline}} \times 100\%$$

If $\Delta \ge 10.0\%$ (configurable via `mlite.yaml`), the system flags the deployment as **DEGRADED** and triggers a `PERFORMANCE_DROP` alert.

---

## CLI Reference

Inspect production accuracy vs baseline:

```bash
mlite monitor performance fraud-detector
```
