"""Pydantic schemas for standardized inference prediction payloads and metadata."""

from typing import Any, Dict, List, Optional
from pydantic import BaseModel, Field, model_validator


class DataframeSplit(BaseModel):
    """Dataframe split format (pandas to_dict(orient='split'))."""

    columns: List[str] = Field(..., description="Column names")
    data: List[List[Any]] = Field(..., description="2D list of row values")


class PredictionRequest(BaseModel):
    """Flexible prediction request accepting multiple tabular formats.

    Supports:
      1. inputs: 2D array [[val1, val2], [val3, val4]]
      2. dataframe_records: list of dicts [{"col1": val1, "col2": val2}, ...]
      3. dataframe_split: {"columns": [...], "data": [[...], [...]]}
    """

    inputs: Optional[List[List[Any]]] = Field(
        None, description="2D matrix of input feature values"
    )
    dataframe_records: Optional[List[Dict[str, Any]]] = Field(
        None, description="List of record dictionaries mapping feature name to value"
    )
    dataframe_split: Optional[DataframeSplit] = Field(
        None, description="Column-oriented split dataframe representation"
    )

    @model_validator(mode="after")
    def validate_single_format(self) -> "PredictionRequest":
        provided = [
            self.inputs is not None,
            self.dataframe_records is not None,
            self.dataframe_split is not None,
        ]
        if sum(provided) == 0:
            raise ValueError(
                "Must provide one of: 'inputs', 'dataframe_records', or 'dataframe_split'"
            )
        if sum(provided) > 1:
            raise ValueError(
                "Only one payload format ('inputs', 'dataframe_records', 'dataframe_split') may be specified"
            )

        # Validate inputs dimensions
        if self.inputs is not None:
            if not isinstance(self.inputs, list) or len(self.inputs) == 0:
                raise ValueError("'inputs' must be a non-empty list of rows")
            if not all(isinstance(row, list) for row in self.inputs):
                raise ValueError("All elements in 'inputs' must be lists")

        # Validate dataframe records
        if self.dataframe_records is not None:
            if not isinstance(self.dataframe_records, list) or len(self.dataframe_records) == 0:
                raise ValueError("'dataframe_records' must be a non-empty list of dictionaries")
            if not all(isinstance(rec, dict) for rec in self.dataframe_records):
                raise ValueError("All elements in 'dataframe_records' must be dictionaries")

        # Validate dataframe split
        if self.dataframe_split is not None:
            if len(self.dataframe_split.columns) == 0:
                raise ValueError("'dataframe_split.columns' cannot be empty")
            if len(self.dataframe_split.data) == 0:
                raise ValueError("'dataframe_split.data' cannot be empty")
            col_count = len(self.dataframe_split.columns)
            for row in self.dataframe_split.data:
                if len(row) != col_count:
                    raise ValueError(
                        f"Row length ({len(row)}) does not match column count ({col_count})"
                    )

        return self


class PredictionResponse(BaseModel):
    """Standardized prediction output contract."""

    predictions: List[Any] = Field(..., description="List of predicted labels, probabilities, or regression values")
    model: str = Field(..., description="Model name")
    version: str = Field(..., description="Model version")
    latency_ms: float = Field(..., description="Total inference compute latency in milliseconds")


class FeatureSchema(BaseModel):
    """Feature definition in model metadata."""

    name: str
    dtype: str
    required: bool = True


class ModelMetadataResponse(BaseModel):
    """Metadata describing model capabilities, input schema, and runtime framework."""

    model: str
    version: str
    framework: str = Field("scikit-learn", description="ML framework: scikit-learn, xgboost, pytorch, onnx")
    features: List[FeatureSchema] = Field(default_factory=list, description="Expected input features")
    task: str = Field("classification", description="Task type: classification, regression, clustering")
    created_at: Optional[str] = None
