"""Unit tests for ModelPerformanceMonitor and degradation detection (Issue #20)."""

from packages.monitoring.model_monitor import ModelPerformanceMonitor


class TestModelPerformanceMonitor:
    """Test metric calculation and degradation thresholds."""

    def test_multiclass_metrics_include_the_third_class(self):
        metrics = ModelPerformanceMonitor.calculate_classification_metrics([0, 1, 2], [0, 1, 1])
        assert metrics["accuracy"] == 0.6667
        assert metrics["precision"] == 0.5
        assert metrics["recall"] == 0.6667
        assert metrics["f1"] == 0.5556

    def test_calculate_classification_metrics(self):
        y_true = [1, 0, 1, 1, 0, 1, 0, 0]
        y_pred = [1, 0, 1, 0, 0, 1, 0, 1]  # 6 correct out of 8

        metrics = ModelPerformanceMonitor.calculate_classification_metrics(y_true, y_pred)
        assert metrics["accuracy"] == 0.75
        assert metrics["precision"] > 0
        assert metrics["recall"] > 0
        assert metrics["f1"] > 0

    def test_calculate_regression_metrics(self):
        y_true = [10.0, 20.0, 30.0]
        y_pred = [12.0, 19.0, 29.0]

        metrics = ModelPerformanceMonitor.calculate_regression_metrics(y_true, y_pred)
        assert metrics["mae"] > 0
        assert metrics["rmse"] > 0
        assert metrics["r2"] > 0.8

    def test_check_degradation_detected(self):
        baseline = {"accuracy": 0.90, "f1": 0.88}
        current = {"accuracy": 0.78, "f1": 0.72}  # > 10% drop

        degraded = ModelPerformanceMonitor.check_degradation(
            current_metrics=current,
            baseline_metrics=baseline,
            tolerance_pct=10.0,
        )
        assert degraded is True

    def test_check_degradation_not_detected_within_tolerance(self):
        baseline = {"accuracy": 0.90, "f1": 0.88}
        current = {"accuracy": 0.88, "f1": 0.86}  # < 5% drop

        degraded = ModelPerformanceMonitor.check_degradation(
            current_metrics=current,
            baseline_metrics=baseline,
            tolerance_pct=10.0,
        )
        assert degraded is False
