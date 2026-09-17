# Feature Data Drift Detection

> Detecting covariate shift between training baseline data and production inference payloads.

---

## Overview

Data drift occurs when the statistical properties of model inputs change over time. MLite's `DataDriftDetector` continuously compares incoming production request distributions with reference baseline datasets to detect drift before model performance degrades.

---

## Drift Severity Levels

The proportion of features displaying statistical significance ($p < 0.05$) determines the overall drift severity:

| Severity Level | Drifted Features Ratio | Action / Recommendation |
|---|---|---|
| **LOW** | $< 10\%$ of features | Nominal operation; log metrics for trending |
| **MEDIUM** | $10\% - 25\%$ of features | Warning alert dispatched; schedule retraining cohort review |
| **HIGH** | $> 25\%$ of features | High alert; trigger automated model rollback or candidate retraining |

---

## Configuration in `mlite.yaml`

```yaml
monitoring:
  drift:
    enabled: true
    interval_hours: 24
    sample_window_size: 5000
    p_value_threshold: 0.05
    severity_thresholds:
      medium: 0.10
      high: 0.25
```

---

## CLI Command

Check live feature drift breakdown for an active model:

```bash
mlite monitor drift fraud-detector
```

Terminal Output:
```
╭─────────────── Data Drift Summary: fraud-detector ───────────────╮
│ Status: HIGH (33.3% features drifted)                            │
│ Drifted Features: transaction_amount, user_velocity              │
│ S3 Report: s3://mlite-evaluations/fraud-detector/v1/report.html  │
╰──────────────────────────────────────────────────────────────────╯
```
