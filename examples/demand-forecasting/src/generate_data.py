"""Synthetic data generator for retail demand forecasting (Issue #38)."""

from datetime import date, timedelta
import math
from pathlib import Path
import random
import polars as pl
from rich.console import Console

console = Console()


def generate_demand_data(output_dir: Path | None = None, n_days: int = 180, n_stores: int = 3, n_items: int = 4):
    if output_dir is None:
        output_dir = Path(__file__).parent.parent / "data"
    output_dir.mkdir(parents=True, exist_ok=True)

    random.seed(42)
    start_date = date(2026, 1, 1)

    store_multipliers = {1: 1.0, 2: 1.35, 3: 0.8}
    item_baselines = {1: 45, 2: 120, 3: 15, 4: 80}

    records = []

    for d in range(n_days):
        current_date = start_date + timedelta(days=d)
        day_of_week = current_date.weekday()
        is_weekend = 1 if day_of_week in (5, 6) else 0
        day_of_year = current_date.timetuple().tm_yday

        for store_id in range(1, n_stores + 1):
            for item_id in range(1, n_items + 1):
                promo = 1 if random.random() < 0.18 else 0
                base = item_baselines[item_id] * store_multipliers[store_id]
                seasonal_factor = 1.0 + 0.25 * math.sin(2 * math.pi * day_of_year / 365.0)
                weekend_factor = 1.3 if is_weekend else 0.95
                promo_factor = 1.45 if promo else 1.0

                expected_sales = base * seasonal_factor * weekend_factor * promo_factor
                noise = random.gauss(0, max(2.0, expected_sales * 0.08))
                sales = max(0, int(round(expected_sales + noise)))

                records.append({
                    "date": current_date.isoformat(),
                    "store_id": store_id,
                    "item_id": item_id,
                    "day_of_week": day_of_week,
                    "is_weekend": is_weekend,
                    "promo": promo,
                    "sales": sales,
                })

    df = pl.DataFrame(records)

    # Compute time-series lag and rolling statistics
    df = df.sort(["store_id", "item_id", "date"])
    df = df.with_columns([
        pl.col("sales").shift(1).over(["store_id", "item_id"]).alias("lag_1"),
        pl.col("sales").shift(7).over(["store_id", "item_id"]).alias("lag_7"),
        pl.col("sales").shift(14).over(["store_id", "item_id"]).alias("lag_14"),
        pl.col("sales").shift(1).rolling_mean(window_size=7).over(["store_id", "item_id"]).alias("rolling_mean_7"),
    ]).drop_nulls()

    # Train / Test split (80% chronological split)
    unique_dates = df.select("date").unique().sort("date")["date"].to_list()
    split_idx = int(len(unique_dates) * 0.8)
    split_date = unique_dates[split_idx]

    train_df = df.filter(pl.col("date") < split_date)
    test_df = df.filter(pl.col("date") >= split_date)

    train_path = output_dir / "daily_sales_train.csv"
    test_path = output_dir / "daily_sales_test.csv"

    train_df.write_csv(train_path)
    test_df.write_csv(test_path)

    console.print(f"[bold green]✔ Generated demand forecasting datasets:[/bold green]")
    console.print(f"  • Train set: {train_path} ({len(train_df)} records)")
    console.print(f"  • Test set:  {test_path} ({len(test_df)} records)")
    return train_path, test_path


if __name__ == "__main__":
    generate_demand_data()
