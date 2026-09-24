# Evidently AI Evaluation & Interactive Reports

> Automated statistical distribution testing, data drift detection, and interactive visual reports.

---

## Overview

MLite integrates **Evidently AI** to automate statistical comparison between baseline training distributions (`reference_data`) and live serving requests (`current_data`).

Every evaluation generates:
1. **Interactive Standalone HTML Report**: Full visualization with histograms, quantile-quantile plots, and statistical p-values.
2. **Structured JSON Metrics**: Machine-readable drift summary ingested by the MLite alert engine and web dashboard.
3. **MinIO Persistence**: Stored under `s3://mlite-evaluations/<project>/<model_version>/<run_id>/`.

---

## Supported Statistical Tests

Evidently AI automatically selects optimal non-parametric statistical tests based on column characteristics:

| Feature Type | Observations | Default Statistical Test | Drift Condition |
|---|---|---|---|
| **Numerical** | $> 1,000$ rows | Kolmogorov-Smirnov (KS) test | $p\text{-value} < 0.05$ |
| **Numerical** | $< 1,000$ rows | Wasserstein Distance | Distance $> 0.1$ |
| **Categorical** | High frequency | Chi-Square ($\chi^2$) Goodness-of-Fit | $p\text{-value} < 0.05$ |
| **Categorical** | Sparse / Rare | Jensen-Shannon Divergence | Divergence $> 0.1$ |

---

## Storage Architecture

```
MinIO Bucket: mlite-evaluations/
└── <project_name>/
    └── v<model_version>/
        └── <run_id>/
            ├── report.html   (Full interactive HTML)
            └── metrics.json  (Summary metrics payload)
```

---

## Viewing Interactive HTML Reports

The HTML report can be accessed directly from the REST API:

```http
GET /api/v1/monitoring/reports/{id}/html
```

Or embedded directly inside the MLite React Dashboard under the **Monitoring** tab.
