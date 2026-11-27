"""Train a real continuous-target model inside the MLflow service for QA."""

import json
import os
import sys

import mlflow
import mlflow.sklearn
from mlflow.models import infer_signature
from sklearn.datasets import load_diabetes
from sklearn.linear_model import Ridge
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from sklearn.model_selection import train_test_split

payload = json.load(sys.stdin)
os.environ["MLFLOW_S3_ENDPOINT_URL"] = os.environ.get("MINIO_ENDPOINT", "http://mlite-storage:9000")
mlflow.set_tracking_uri(os.environ.get("MLFLOW_TRACKING_URI", "http://mlflow:5000"))
name = payload["prefix"] + "-regression"
mlflow.set_experiment(name)
data = load_diabetes(as_frame=True)
x_train, x_test, y_train, y_test = train_test_split(
    data.data,
    data.target,
    test_size=0.2,
    random_state=42,
)
with mlflow.start_run(run_name="qa-ridge-real-continuous-target") as run:
    model = Ridge(alpha=0.1).fit(x_train, y_train)
    predicted = model.predict(x_test)
    metrics = {
        "rmse": float(mean_squared_error(y_test, predicted) ** 0.5),
        "mae": float(mean_absolute_error(y_test, predicted)),
        "r2_score": float(r2_score(y_test, predicted)),
    }
    mlflow.log_params({"alpha": 0.1, "random_state": 42})
    mlflow.log_metrics(metrics)
    mlflow.set_tags({"mlite.project": payload["prefix"], "qa.validation": "real-regression"})
    mlflow.sklearn.log_model(
        model,
        artifact_path="model",
        input_example=x_test.iloc[:1],
        signature=infer_signature(x_test, predicted),
    )
    result = {
        "run_id": run.info.run_id,
        "metrics": metrics,
        "columns": list(x_test.columns),
        "inputs": x_test.iloc[:20].values.tolist(),
        "truth": y_test.iloc[:20].tolist(),
        "predictions": predicted[:20].tolist(),
        "dataset_rows": len(data.data),
        "holdout_rows": len(y_test),
    }
print("QA_RESULT=" + json.dumps(result))
