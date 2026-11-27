"""Base model loader and inference engine for serving containers."""

import logging
import os
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)


class BasePredictor:
    """Loads and invokes machine learning model artifacts for inference."""

    def __init__(
        self,
        model_name: str = "default-model",
        model_version: str = "1",
        artifact_path: str | None = None,
        framework: str = "scikit-learn",
    ) -> None:
        self.model_name = model_name
        self.model_version = model_version
        self.artifact_path = artifact_path or os.environ.get("MODEL_ARTIFACT_PATH")
        self.framework = framework
        self._model: Any = None
        self._feature_names: list[str] = []
        self._loaded: bool = False

    def load(self) -> bool:
        """Attempt to load the model artifact from disk or MLflow store."""
        self._loaded = False
        self._model = None
        if not self.artifact_path:
            logger.error("No model artifact configured")
            return False

        if self.artifact_path.startswith(("runs:/", "models:/", "s3://", "mlflow-artifacts:/")):
            try:
                import mlflow.pyfunc

                self._model = mlflow.pyfunc.load_model(self.artifact_path)
                schema = self._model.metadata.get_input_schema()
                self._feature_names = schema.input_names() if schema and schema.has_input_names() else []
                self._loaded = True
                return True
            except Exception:
                logger.exception("Failed to load the registered MLflow model")
                return False

        if not Path(self.artifact_path).is_file():
            logger.error("Model artifact is missing: %s", self.artifact_path)
            return False

        try:
            # Try pickle / joblib
            try:
                import joblib

                self._model = joblib.load(self.artifact_path)
                self._loaded = True
                logger.info("Model loaded successfully via joblib from %s", self.artifact_path)
                return True
            except Exception:
                pass

            import pickle

            with open(self.artifact_path, "rb") as f:
                self._model = pickle.load(f)  # nosec B301
            self._loaded = True
            logger.info("Model loaded successfully via pickle from %s", self.artifact_path)
            return True
        except Exception as e:
            logger.error("Failed to load model artifact: %s", e)
            self._loaded = False
            return False

    @property
    def is_loaded(self) -> bool:
        """Return True if model is initialized and ready to score."""
        return self._loaded

    def predict(
        self,
        inputs: list[list[Any]] | None = None,
        dataframe_records: list[dict[str, Any]] | None = None,
        dataframe_split: Any | None = None,
    ) -> list[Any]:
        """Convert input representation and compute model predictions."""
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded")

        # Convert to row list
        rows: list[list[Any]] = []
        if inputs is not None:
            rows = inputs
        elif dataframe_records is not None:
            # Named signatures define training order. For unnamed models retain
            # the supplied order, rather than silently alphabetizing features.
            names = self._feature_names or list(dataframe_records[0])
            if any(any(name not in record for name in names) for record in dataframe_records):
                raise ValueError("Prediction records are missing required features.")
            rows = [[record[name] for name in names] for record in dataframe_records]
        elif dataframe_split is not None:
            rows = dataframe_split.data
            if self._feature_names:
                columns = dataframe_split.columns
                if any(name not in columns for name in self._feature_names):
                    raise ValueError("Prediction columns are missing required features.")
                rows = [[row[columns.index(name)] for name in self._feature_names] for row in rows]

        if not rows:
            return []

        import numpy as np

        if self._feature_names:
            import pandas as pd

            data = pd.DataFrame(rows, columns=self._feature_names)
        else:
            data = np.asarray(rows)
        preds = self._model.predict(data)
        return preds.tolist() if hasattr(preds, "tolist") else list(preds)

    def get_metadata(self) -> dict[str, Any]:
        """Return model metadata and input schema."""
        return {
            "model": self.model_name,
            "version": str(self.model_version),
            "framework": self.framework,
            "features": [
                {"name": name, "dtype": "float64", "required": True} for name in self._feature_names
            ],
            "task": "classification",
        }
