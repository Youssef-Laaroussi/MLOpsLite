# 💳 Production Fraud Detection with Drift & Auto-Rollback

> **Component:** `examples/fraud-detection/`  
> **Milestone:** M8 — Documentation & Examples (Issue #37)

---

## Overview

This tutorial demonstrates MLite's enterprise reliability capabilities in a real-world financial fraud detection scenario:
1. **Train Baseline (v1):** Stable model trained on historical domestic card transactions.
2. **Deploy v1:** Expose real-time `/predict` inference API.
3. **Train Candidate (v2):** Aggressive model trained on experimental parameters.
4. **Deploy v2 & Inject Shifted Traffic:** Ingest sudden surge in international transactions and high payment amounts.
5. **Drift & Alert Detection:** Evidently KS-test identifies statistical distribution drift and triggers a `HIGH` severity alert.
6. **Controlled Rollback:** Execute `mlite rollback` to seamlessly switch production traffic back to v1 with zero downtime.

---

## Quickstart Instructions

### 1. Install Dependencies
```bash
pip install -r requirements.txt
```

### 2. Generate Synthetic Datasets
```bash
python src/generate_data.py
```
This produces:
- `data/baseline_transactions.csv` (normal domestic distribution)
- `data/shifted_transactions.csv` (shifted international surge)

### 3. Train Baseline (v1) and Candidate (v2)
```bash
# Train v1 (Baseline)
python src/train.py --version 1

# Train v2 (Candidate)
python src/train.py --version 2
```

### 4. Register & Promote v1
```bash
mlite model register fraud-detector --run-id <RUN-ID-V1>
mlite model promote fraud-detector --version 1 --stage PRODUCTION
mlite deploy fraud-detector --version 1 --port 8100
```

### 5. Simulate Real-Time Traffic & Inject Drift
```bash
python src/simulate_traffic.py --port 8100
```

### 6. Execute Instant Rollback
When the alert fires:
```bash
mlite rollback fraud-detector --to 1 --reason "High feature drift on international transactions"
```
Verify the rollback record:
```bash
mlite rollback-policy list
```
Production traffic is immediately routed back to v1!
