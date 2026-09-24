"""Train Random Forest demand forecasting model and log to MLflow (Issue #38)."""

import os
from pathlib import Path
import pickle
import mlflow
import polars as pl
from sklearn.ensemble import RandomForestRegressor
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
from rich.console import Console
from rich.table import Table

console = Console()

FEATURE_COLS = [
    "store_id",
    "item_id",
    "day_of_week",
    "is_weekend",
    "promo",
    "lag_1",
    "lag_7",
    "lag_14",
    "rolling_mean_7",
]
TARGET_COL = "sales"


def train():
    data_dir = Path(__file__).parent.parent / "data"
    train_file = data_dir / "daily_sales_train.csv"
    test_file = data_dir / "daily_sales_test.csv"

    if not train_file.exists() or not test_file.exists():
        from generate_data import generate_demand_data
        generate_demand_data(data_dir)

    console.print("[bold cyan]📊 Loading demand forecasting datasets...[/bold cyan]")
    train_df = pl.read_csv(train_file)
    test_df = pl.read_csv(test_file)

    X_train = train_df.select(FEATURE_COLS).to_numpy()
    y_train = train_df.select(TARGET_COL).to_numpy().ravel()

    X_test = test_df.select(FEATURE_COLS).to_numpy()
    y_test = test_df.select(TARGET_COL).to_numpy().ravel()

    console.print(f"  Training samples: {len(X_train):,} | Test samples: {len(X_test):,}")

    # MLflow Setup
    tracking_uri = os.getenv("MLFLOW_TRACKING_URI", "http://localhost:5000")
    mlflow.set_tracking_uri(tracking_uri)
    mlflow.set_experiment("demand-forecasting")

    hyperparams = {
        "n_estimators": 100,
        "max_depth": 10,
        "min_samples_split": 4,
        "random_state": 42,
    }

    with mlflow.start_run(run_name="rf-demand-forecaster-v1") as run:
        mlflow.log_params(hyperparams)

        console.print("[bold yellow]⚙ Training RandomForestRegressor...[/bold yellow]")
        model = RandomForestRegressor(**hyperparams)
        model.fit(X_train, y_train)

        # Evaluation
        preds = model.predict(X_test)
        rmse = float(mean_squared_error(y_test, preds, squared=False))
        mae = float(mean_absolute_error(y_test, preds))
        r2 = float(r2_score(y_test, preds))

        mlflow.log_metrics({"rmse": rmse, "mae": mae, "r2_score": r2})

        # Save model artifact
        models_dir = Path(__file__).parent.parent / "models"
        models_dir.mkdir(parents=True, exist_ok=True)
        model_path = models_dir / "demand_forecaster.pkl"
        with open(model_path, "wb") as f:
            pickle.dump(model, f)

        try:
            mlflow.log_artifact(str(model_path), artifact_path="model")
        except Exception:
            pass

    table = Table(title="Demand Forecasting Evaluation Metrics", header_style="bold magenta")
    table.add_column("Metric", style="cyan")
    table.add_column("Value", style="green")
    table.add_row("Root Mean Squared Error (RMSE)", f"{rmse:.3f}")
    table.add_row("Mean Absolute Error (MAE)", f"{mae:.3f}")
    table.add_row("R² Determination Score", f"{r2:.4f}")
    table.add_row("Model Artifact Path", str(model_path))
    table.add_row("MLflow Run ID", run.info.run_id)
    console.print(table)


if __name__ == "__main__":
    train()
