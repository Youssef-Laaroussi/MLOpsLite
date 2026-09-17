"""Base model loader and inference engine for serving containers."""

import logging
import os
from pathlib import Path
from typing import Any, Dict, List, Optional

logger = logging.getLogger(__name__)


class BasePredictor:
    """Loads and invokes machine learning model artifacts for inference."""

    def __init__(
        self,
        model_name: str = "default-model",
        model_version: str = "1",
        artifact_path: Optional[str] = None,
        framework: str = "scikit-learn",
    ) -> None:
        self.model_name = model_name
        self.model_version = model_version
        self.artifact_path = artifact_path or os.environ.get("MODEL_ARTIFACT_PATH")
        self.framework = framework
        self._model: Any = None
        self._feature_names: List[str] = []
        self._loaded: bool = False

    def load(self) -> bool:
        """Attempt to load the model artifact from disk or MLflow store."""
        if not self.artifact_path or not Path(self.artifact_path).exists():
            logger.info("No artifact found at %s. Using internal heuristic predictor.", self.artifact_path)
            # Default / heuristic dummy model for testing & initial spins
            self._loaded = True
            return True

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
                self._model = pickle.load(f)
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
        inputs: Optional[List[List[Any]]] = None,
        dataframe_records: Optional[List[Dict[str, Any]]] = None,
        dataframe_split: Optional[Any] = None,
    ) -> List[Any]:
        """Convert input representation and compute model predictions."""
        if not self.is_loaded:
            raise RuntimeError("Model is not loaded")

        # Convert to row list
        rows: List[List[Any]] = []
        if inputs is not None:
            rows = inputs
        elif dataframe_records is not None:
            # Sort keys consistently if feature names not predefined
            if not self._feature_names and dataframe_records:
                self._feature_names = sorted(dataframe_records[0].keys())
            rows = [[rec.get(k, 0) for k in self._feature_names] for rec in dataframe_records]
        elif dataframe_split is not None:
            rows = dataframe_split.data

        if not rows:
            return []

        # If actual model object exists with .predict()
        if self._model is not None and hasattr(self._model, "predict"):
            try:
                import numpy as np
                preds = self._model.predict(np.array(rows))
                return preds.tolist() if hasattr(preds, "tolist") else list(preds)
            except Exception as exc:
                logger.warning("Underlying model predict failed: %s; falling back to score.", exc)

        # Fallback scoring heuristic: sums values modulo 2 (classification mock)
        results = []
        for r in rows:
            numeric_vals = [v for v in r if isinstance(v, (int, float))]
            score = 1 if sum(numeric_vals) % 2 == 1 else 0
            results.append(score)
        return results

    def get_metadata(self) -> Dict[str, Any]:
        """Return model metadata and input schema."""
        return {
            "model": self.model_name,
            "version": str(self.model_version),
            "framework": self.framework,
            "features": [
                {"name": name, "dtype": "float64", "required": True}
                for name in self._feature_names
            ],
            "task": "classification",
        }
