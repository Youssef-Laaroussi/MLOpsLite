# #37 — Create production fraud detection example with drift and rollback

> **Milestone:** M8 — Documentation & Examples  
> **Priority:** `P1`  
> **Labels:** `example` `P1`  

---

## Problem
To understand the true value of MLite's advanced capabilities (Evidently drift detection, alerts, auto-rollback), users need a realistic production scenario where data shifts and models degrade in real time.

## Objective
Build a production-grade Fraud Detection example in `examples/fraud-detection/` demonstrating synthetic data drift, accuracy degradation, alert dispatch, and controlled rollback from v2 back to stable v1.

## Proposed solution
Create a comprehensive scenario: 1. Train stable model v1 on baseline credit card transactions; 2. Deploy v1 to production; 3. Simulate normal incoming transactions (drift remains LOW); 4. Train and deploy candidate model v2; 5. Inject shifted transaction data (international transactions surge, drift spikes to HIGH, accuracy drops); 6. MLite alert triggers; 7. Execute `mlite rollback fraud-detector --to 1` to restore stability.

## Technical requirements
- Directory `examples/fraud-detection/` with training scripts, dataset generators, and simulation runner `simulate_traffic.py`.
- Realistic tabular dataset (imbalanced classification: transactions, amounts, countries, fraud labels).
- Automated drift simulation injecting distribution shifts into numerical and categorical features.
- Demonstrates complete loop: Drift Detection → Alerting → Webhook Dispatch → Rollback Execution.

## Acceptance criteria
- Running the simulation clearly triggers a HIGH data drift alert with affected feature list in the CLI and UI.
- Degradation triggers rollback recommendation in the terminal.
- Executing `mlite rollback` restores production accuracy without service downtime.
- All steps are documented with terminal screenshots and command outputs in the tutorial README.

## Tests
- Automated test running the fraud detection scenario in CI and asserting drift detection and rollback success.
- Verify statistical calculations on synthetic transaction distribution.

## Documentation
- `examples/fraud-detection/README.md` with complete walkthrough and architecture explanation.
- `docs/tutorials/fraud_detection.md`.

## Dependencies
Issue #18 (Evidently), Issue #19 (Drift), Issue #21 (Alerts), Issue #23 (Rollback).
