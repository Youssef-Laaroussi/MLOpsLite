"""Generate synthetic baseline and drifted transaction datasets (Issue #37)."""

import os
from pathlib import Path
import numpy as np
import polars as pl


def generate_data(n_samples: int = 1000, seed: int = 42):
    np.random.seed(seed)
    data_dir = Path(__file__).parent.parent / "data"
    data_dir.mkdir(parents=True, exist_ok=True)

    # 1. Baseline dataset (Standard domestic operations)
    baseline_amounts = np.random.normal(loc=55.0, scale=25.0, size=n_samples)
    baseline_amounts = np.clip(baseline_amounts, 5.0, 500.0)
    baseline_tx_counts = np.random.poisson(lam=3.0, size=n_samples)
    baseline_intl = np.random.choice([0, 1], p=[0.95, 0.05], size=n_samples)
    baseline_risk_score = np.random.uniform(0.0, 0.4, size=n_samples)

    # Fraud label logic
    fraud_prob = 0.01 + 0.05 * baseline_intl + 0.15 * (baseline_amounts > 200)
    baseline_labels = (np.random.rand(n_samples) < fraud_prob).astype(int)

    df_baseline = pl.DataFrame({
        "amount": baseline_amounts,
        "tx_count_24h": baseline_tx_counts,
        "is_international": baseline_intl,
        "risk_score": baseline_risk_score,
        "is_fraud": baseline_labels,
    })
    baseline_file = data_dir / "baseline_transactions.csv"
    df_baseline.write_csv(baseline_file)
    print(f"✓ Generated baseline dataset: {baseline_file} ({len(df_baseline)} records)")

    # 2. Shifted dataset (Surge in international and large amounts - feature drift!)
    shifted_amounts = np.random.normal(loc=280.0, scale=90.0, size=n_samples)
    shifted_amounts = np.clip(shifted_amounts, 20.0, 1200.0)
    shifted_tx_counts = np.random.poisson(lam=8.0, size=n_samples)
    shifted_intl = np.random.choice([0, 1], p=[0.55, 0.45], size=n_samples)
    shifted_risk_score = np.random.uniform(0.3, 0.95, size=n_samples)

    shifted_fraud_prob = 0.05 + 0.20 * shifted_intl + 0.30 * (shifted_amounts > 500)
    shifted_labels = (np.random.rand(n_samples) < shifted_fraud_prob).astype(int)

    df_shifted = pl.DataFrame({
        "amount": shifted_amounts,
        "tx_count_24h": shifted_tx_counts,
        "is_international": shifted_intl,
        "risk_score": shifted_risk_score,
        "is_fraud": shifted_labels,
    })
    shifted_file = data_dir / "shifted_transactions.csv"
    df_shifted.write_csv(shifted_file)
    print(f"✓ Generated shifted dataset:  {shifted_file} ({len(df_shifted)} records)")


if __name__ == "__main__":
    generate_data()
