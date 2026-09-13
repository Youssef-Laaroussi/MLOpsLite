# #36 — Create end-to-end Iris classification starter example

> **Milestone:** M8 — Documentation & Examples  
> **Priority:** `P1`  
> **Labels:** `example` `P1`  

---

## Problem
Users need an instant, lightweight tutorial that runs in under 2 minutes without downloading large datasets or training heavy deep learning models, allowing them to verify their local MLite installation immediately.

## Objective
Build a complete, standalone Iris classification example in `examples/iris/` walking through the complete lifecycle: `mlite init`, data registration, training with Scikit-learn, MLflow logging, model promotion, and Docker deployment.

## Proposed solution
Create a clean example repository directory with `mlite.yaml`, `src/train.py`, `data/iris.csv`, and a step-by-step `README.md`. The training script trains a LogisticRegression / DecisionTreeClassifier, logs accuracy/precision to MLflow, registers `iris-classifier:v1`, and provides a test curl script for the deployed endpoint.

## Technical requirements
- Directory `examples/iris/`: contains `README.md`, `mlite.yaml`, `requirements.txt`, `src/train.py`, `test_predict.sh`.
- Execution time: complete training and registration finishes in < 5 seconds on any machine.
- Demonstrates: dataset registration, MLflow metric logging, model registry promotion, and inference query via curl.
- Zero GPU or external network download requirements.

## Acceptance criteria
- A developer can clone the example, run `mlite experiment run src/train.py`, and see metrics in MLflow immediately.
- Deploying the model via `mlite deploy iris-classifier --version 1` exposes a working REST endpoint.
- `test_predict.sh` sends sample flowers and receives expected species predictions with 200 OK.
- Example README is clear, concise, and tested end-to-end.

## Tests
- Include `examples/iris/` in automated integration tests to ensure future code changes don't break the tutorial.
- Assert valid inference response from deployed container.

## Documentation
- `examples/iris/README.md`.
- `docs/getting-started/quickstart.md` linking directly to this example.

## Dependencies
Issue #8 (CLI), Issue #9 (Tracking), Issue #10 (Registry), Issue #11 (Deployment).
