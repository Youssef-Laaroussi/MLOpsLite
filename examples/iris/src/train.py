"""Iris classification training script with MLflow tracking (Issue #36)."""

import os
from pathlib import Path
import mlflow
import mlflow.sklearn
import polars as pl
from sklearn.linear_model import LogisticRegression
from sklearn.metrics import accuracy_score, f1_score
from sklearn.model_selection import train_test_split


def train():
    tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment("iris-classification")

    data_path = Path(__file__).parent.parent / "data" / "iris.csv"
    if not data_path.exists():
        raise FileNotFoundError(f"Dataset not found at {data_path}")

    df = pl.read_csv(data_path)
    feature_cols = ["sepal_length", "sepal_width", "petal_length", "petal_width"]
    X = df.select(feature_cols).to_numpy()
    y = df["species"].to_numpy()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )

    with mlflow.start_run(run_name="logistic-regression-baseline") as run:
        params = {"max_iter": 200, "C": 1.0, "solver": "lbfgs"}
        mlflow.log_params(params)

        clf = LogisticRegression(**params)
        clf.fit(X_train, y_train)

        preds = clf.predict(X_test)
        acc = accuracy_score(y_test, preds)
        f1 = f1_score(y_test, preds, average="weighted")

        mlflow.log_metric("accuracy", acc)
        mlflow.log_metric("f1_score", f1)

        # Log scikit-learn model artifact
        mlflow.sklearn.log_model(clf, artifact_path="model")

        print("==================================================")
        print("🌺 Iris Classification Training Complete!")
        print(f"   MLflow Run ID: {run.info.run_id}")
        print(f"   Accuracy:      {acc:.4f}")
        print(f"   F1-Score:      {f1:.4f}")
        print("==================================================")
        print("\nNext: Register and deploy the model using:")
        print(f"  mlite model register iris-classifier --run-id {run.info.run_id}")
        print("  mlite model promote iris-classifier --version 1 --stage PRODUCTION")
        print("  mlite deploy iris-classifier --version 1 --port 8100")


if __name__ == "__main__":
    train()
