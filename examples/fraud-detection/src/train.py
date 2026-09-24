"""Fraud detection model training script (Issue #37)."""

import argparse
import os
from pathlib import Path
import mlflow
import mlflow.sklearn
import numpy as np
import polars as pl
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import roc_auc_score, f1_score, precision_score, recall_score
from sklearn.model_selection import train_test_split


def train_model(version: int = 1):
    tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment("fraud-detection")

    data_dir = Path(__file__).parent.parent / "data"
    baseline_path = data_dir / "baseline_transactions.csv"
    if not baseline_path.exists():
        from generate_data import generate_data
        generate_data()

    df = pl.read_csv(baseline_path)
    features = ["amount", "tx_count_24h", "is_international", "risk_score"]
    X = df.select(features).to_numpy()
    y = df["is_fraud"].to_numpy()

    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.25, random_state=42, stratify=y
    )

    run_name = f"random-forest-fraud-v{version}"
    with mlflow.start_run(run_name=run_name) as run:
        # v1: conservative, high precision baseline
        # v2: overfit / aggressive candidate
        n_estimators = 100 if version == 1 else 250
        max_depth = 6 if version == 1 else 15

        params = {
            "n_estimators": n_estimators,
            "max_depth": max_depth,
            "model_version": version,
            "random_state": 42,
        }
        mlflow.log_params(params)

        clf = RandomForestClassifier(
            n_estimators=n_estimators,
            max_depth=max_depth,
            random_state=42,
            class_weight="balanced",
        )
        clf.fit(X_train, y_train)

        preds = clf.predict(X_test)
        probs = clf.predict_proba(X_test)[:, 1]

        auc = roc_auc_score(y_test, probs) if len(np.unique(y_test)) > 1 else 0.5
        f1 = f1_score(y_test, preds, zero_division=0)
        precision = precision_score(y_test, preds, zero_division=0)
        recall = recall_score(y_test, preds, zero_division=0)

        mlflow.log_metric("roc_auc", auc)
        mlflow.log_metric("f1_score", f1)
        mlflow.log_metric("precision", precision)
        mlflow.log_metric("recall", recall)

        mlflow.sklearn.log_model(clf, artifact_path="model")

        print("==================================================")
        print(f"💳 Fraud Detection Training Complete (v{version})!")
        print(f"   MLflow Run ID: {run.info.run_id}")
        print(f"   ROC-AUC:       {auc:.4f}")
        print(f"   F1-Score:      {f1:.4f}")
        print("==================================================")
        return run.info.run_id


if __name__ == "__main__":
    parser = argparse.ArgumentParser()
    parser.add_argument("--version", type=int, default=1, help="Model version to train (1 or 2)")
    args = parser.parse_args()
    train_model(version=args.version)
