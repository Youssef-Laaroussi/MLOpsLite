"""Standardized FastAPI inference serving application (Issues #12, #13).

Provides /predict, /metadata, /health, /live, and /ready endpoints with
strict Pydantic input validation, latency metrics, and audit logging.
"""

import os
import time
from contextlib import asynccontextmanager
from typing import Any, AsyncGenerator

from fastapi import FastAPI, HTTPException, Response, status
from fastapi.middleware.cors import CORSMiddleware

from packages.deployment.server.logger import InferencePayloadLogger
from packages.deployment.server.predictor import BasePredictor
from packages.deployment.server.schemas import (
    ModelMetadataResponse,
    PredictionRequest,
    PredictionResponse,
)

# Startup state
START_TIME = time.time()
MODEL_NAME = os.environ.get("MODEL_NAME", "default-model")
MODEL_VERSION = os.environ.get("MODEL_VERSION", "1")
ARTIFACT_PATH = os.environ.get("MODEL_ARTIFACT_PATH")

predictor = BasePredictor(
    model_name=MODEL_NAME,
    model_version=MODEL_VERSION,
    artifact_path=ARTIFACT_PATH,
)
payload_logger = InferencePayloadLogger()


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncGenerator[None, None]:
    """Initialize predictor and start serving."""
    predictor.load()
    yield
    # Cleanup on shutdown
    await payload_logger.flush()


app = FastAPI(
    title=f"MLite Inference Serving — {MODEL_NAME}",
    version=MODEL_VERSION,
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.post(
    "/predict",
    response_model=PredictionResponse,
    status_code=status.HTTP_200_OK,
    summary="Compute model predictions",
)
async def predict(request: PredictionRequest, response: Response) -> PredictionResponse:
    """Validate input payload and compute inference predictions.

    Calculates execution latency, writes payload to drift logger,
    and returns predictions.
    """
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="Model is not loaded or serving worker is not ready",
        )

    t0 = time.perf_counter()
    try:
        preds = predictor.predict(
            inputs=request.inputs,
            dataframe_records=request.dataframe_records,
            dataframe_split=request.dataframe_split,
        )
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
            detail=f"Inference execution failed: {exc}",
        )
    t1 = time.perf_counter()
    latency_ms = round((t1 - t0) * 1000.0, 3)

    # Set latency response header
    response.headers["X-Inference-Latency-Ms"] = str(latency_ms)

    # Asynchronous audit log
    await payload_logger.log_inference(
        model_name=predictor.model_name,
        model_version=predictor.model_version,
        request_payload=request.model_dump(exclude_none=True),
        predictions=preds,
        latency_ms=latency_ms,
    )

    return PredictionResponse(
        predictions=preds,
        model=predictor.model_name,
        version=predictor.model_version,
        latency_ms=latency_ms,
    )


@app.get(
    "/metadata",
    response_model=ModelMetadataResponse,
    summary="Get model schema and metadata",
)
async def get_metadata() -> Any:
    """Return model framework, input feature definitions, and version."""
    return predictor.get_metadata()


@app.get("/health", summary="Deployment health and readiness probe")
async def health_check() -> dict[str, Any]:
    """Verify inference server availability and model loaded state.

    Returns 200 if model is loaded and ready; 503 Service Unavailable otherwise.
    """
    uptime = int(time.time() - START_TIME)
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={
                "status": "unhealthy",
                "model_loaded": False,
                "uptime_seconds": uptime,
                "error": "Model artifact failed to load",
            },
        )

    return {
        "status": "healthy",
        "model_loaded": True,
        "uptime_seconds": uptime,
    }


@app.get("/live", summary="Kubernetes liveness probe")
async def liveness_probe() -> dict[str, str]:
    """Process liveness probe; returns 200 if container web server is responsive."""
    return {"status": "alive"}


@app.get("/ready", summary="Kubernetes readiness probe")
async def readiness_probe() -> dict[str, Any]:
    """Readiness probe; returns 200 if ready to receive prediction traffic."""
    if not predictor.is_loaded:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail={"status": "not_ready", "model_loaded": False},
        )
    return {"status": "ready", "model_loaded": True}
