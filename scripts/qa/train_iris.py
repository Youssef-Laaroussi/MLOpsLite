import hashlib
import io
import json
import os
import sys

import mlflow
import mlflow.sklearn
import pandas as pd
from mlflow.models import infer_signature
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score, log_loss, precision_score, recall_score
from sklearn.model_selection import train_test_split

payload = json.load(sys.stdin)
os.environ["MLFLOW_S3_ENDPOINT_URL"] = os.environ.get("MINIO_ENDPOINT", "http://mlite-storage:9000")
mlflow.set_tracking_uri(os.environ.get("MLFLOW_TRACKING_URI", "http://mlflow:5000"))
tracking = mlflow.MlflowClient()
experiment = tracking.get_experiment_by_name(payload["prefix"])
experiment_id = (
    experiment.experiment_id
    if experiment
    else tracking.create_experiment(payload["prefix"], tags={"mlite.project": payload["prefix"]})
)
frame = pd.read_csv(io.StringIO(payload["csv"]))
x, y = frame.drop(columns="species"), frame["species"].to_numpy()
x_train, x_test, y_train, y_test = train_test_split(
    x, y, test_size=0.2, random_state=42, stratify=y
)
c_value = 0.2 if payload["version"] == 1 else 1.0
with mlflow.start_run(
    experiment_id=experiment_id, run_name=f"qa-logistic-v{payload['version']}"
) as run:
    mlflow.log_params({"C": c_value, "solver": "lbfgs", "max_iter": 200, "random_state": 42})
    mlflow.set_tags(
        {
            "mlite.project": payload["prefix"],
            "mlite.dataset.sha256": hashlib.sha256(payload["csv"].encode()).hexdigest(),
            "qa.validation": "real-iris-end-to-end",
        }
    )
    for step, iterations in enumerate((20, 80, 200)):
        model = LogisticRegression(C=c_value, max_iter=iterations, random_state=42)
        model.fit(x_train, y_train)
        mlflow.log_metric("loss", log_loss(y_test, model.predict_proba(x_test)), step=step)
    prediction = model.predict(x_test)
    metrics = {
        "accuracy": accuracy_score(y_test, prediction),
        "f1_score": f1_score(y_test, prediction, average="weighted"),
        "precision": precision_score(y_test, prediction, average="weighted"),
        "recall": recall_score(y_test, prediction, average="weighted"),
    }
    mlflow.log_metrics(metrics)
    mlflow.sklearn.log_model(
        model,
        artifact_path="model",
        input_example=x_test.iloc[:1],
        signature=infer_signature(x_test, prediction),
    )
    run_id = run.info.run_id
print(
    "QA_RESULT="
    + json.dumps(
        {
            "run_id": run_id,
            "version": payload["version"],
            "metrics": metrics,
            "experiment_id": experiment_id,
            "mlflow_version": mlflow.__version__,
        }
    )
)
