# Standardized inference container for MLite model deployment
# Base image: Python 3.12 slim
FROM python:3.12-slim

ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PORT=8000 \
    MODEL_NAME="" \
    MODEL_VERSION="" \
    MODEL_ARTIFACT_PATH="/app/model"

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    curl \
    gcc \
    libgomp1 \
    && rm -rf /var/lib/apt/lists/*

# Install inference serving dependencies
RUN pip install --no-cache-dir \
    fastapi>=0.111.0 \
    uvicorn[standard]>=0.30.0 \
    pydantic>=2.7.0 \
    numpy \
    scikit-learn \
    mlflow \
    minio \
    httpx

# Copy serving server implementation
COPY packages/deployment/server /app/server

# Expose container default serving port
EXPOSE 8000

# Healthcheck
HEALTHCHECK --interval=10s --timeout=3s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Start Uvicorn serving
CMD ["uvicorn", "server.app:app", "--host", "0.0.0.0", "--port", "8000"]
