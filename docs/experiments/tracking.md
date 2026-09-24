# Experiment Tracking

> Track ML experiments with automatic metadata collection via the Python SDK or CLI.

---

## Python SDK

### Context Manager

```python
from packages.tracking.tracker import start_run

with start_run(experiment_name="iris-classifier", project_slug="iris") as run:
    # Log hyperparameters
    run.log_params({
        "n_estimators": 100,
        "max_depth": 5,
        "learning_rate": 0.1,
    })

    # ... your training code ...
    model = train_model(X_train, y_train)

    # Log metrics
    run.log_metrics({
        "accuracy": 0.95,
        "precision": 0.93,
        "recall": 0.91,
        "f1": 0.92,
    })

    # Log artifacts
    run.log_artifact("models/model.pkl")
    run.log_artifact("plots/confusion_matrix.png")

    print(f"Run ID: {run.run_id}")
```

### Automatic Metadata

Every run automatically captures:
- **Git commit SHA** and dirty tree status
- **Python version** and OS platform
- **Hostname** and MLite version
- **Start time** and **duration**

---

## CLI Tracking

```bash
# Run a training script with automatic tracking
mlite experiment run src/train.py --project iris-classifier --name "baseline-v1"

# List experiments
mlite experiment list --project iris-classifier

# List runs for a specific experiment
mlite experiment list --limit 50
```

---

## Sample Training Script

```python
#!/usr/bin/env python3
"""Sample Scikit-learn training script with MLite tracking."""

from sklearn.datasets import load_iris
from sklearn.ensemble import RandomForestClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, f1_score
import joblib

from packages.tracking.tracker import start_run

X, y = load_iris(return_X_y=True)
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42)

with start_run(experiment_name="iris-rf", project_slug="iris-classifier") as run:
    params = {"n_estimators": 100, "max_depth": 5, "random_state": 42}
    run.log_params(params)

    clf = RandomForestClassifier(**params)
    clf.fit(X_train, y_train)

    y_pred = clf.predict(X_test)
    run.log_metrics({
        "accuracy": accuracy_score(y_test, y_pred),
        "f1_macro": f1_score(y_test, y_pred, average="macro"),
    })

    joblib.dump(clf, "models/iris_rf.pkl")
    run.log_artifact("models/iris_rf.pkl")

    print(f"✓ Run {run.run_id} completed")
```

---

## REST API

| Method | Endpoint | Description |
|--------|----------|-------------|
| `GET`  | `/api/v1/experiments/` | List experiments |
| `POST` | `/api/v1/experiments/` | Create experiment |
| `GET`  | `/api/v1/experiments/{id}/runs` | List runs for experiment |
