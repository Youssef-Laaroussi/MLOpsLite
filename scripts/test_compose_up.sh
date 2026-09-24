#!/usr/bin/env bash
# ==============================================================================
# MLite Docker Compose Infrastructure Verification Script
# ==============================================================================
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

cd "${ROOT_DIR}"

echo "======================================================================"
echo "🚀 MLite Docker Compose Infrastructure Verification"
echo "======================================================================"

# 1. Check Compose syntax
echo "1. Validating docker-compose.yml syntax..."
docker compose config > /dev/null
echo "   ✅ Syntax is valid."

# 2. Check if .env exists, if not copy from .env.example
if [ ! -f .env ]; then
    echo "2. Creating .env from .env.example..."
    cp .env.example .env
fi

# 3. Start containers in background
echo "3. Starting containers via Docker Compose..."
docker compose up -d --build

# 4. Wait for services to become healthy (up to 60s)
echo "4. Waiting for services to become healthy (max 60s)..."
MAX_ATTEMPTS=12
ATTEMPT=1
SERVICES=("mlite-db" "mlite-storage" "mlflow" "mlite-api" "mlite-ui")

all_healthy=false
while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "   Attempt ${ATTEMPT}/${MAX_ATTEMPTS}: checking health status..."
    unhealthy=0
    for service in "${SERVICES[@]}"; do
        status=$(docker inspect --format='{{json .State.Health.Status}}' "$service" 2>/dev/null || echo '"not_found"')
        if [ "$status" != '"healthy"' ]; then
            echo "   - $service status: $status"
            unhealthy=$((unhealthy + 1))
        fi
    done

    if [ $unhealthy -eq 0 ]; then
        all_healthy=true
        break
    fi

    sleep 5
    ATTEMPT=$((ATTEMPT + 1))
done

docker compose ps

if [ "$all_healthy" = true ]; then
    echo "======================================================================"
    echo "✅ ALL MLite services are running and healthy!"
    echo "   - Web UI:      http://localhost:3000"
    echo "   - FastAPI API: http://localhost:8000/docs"
    echo "   - MLflow:      http://localhost:5000"
    echo "   - MinIO API:   http://localhost:9000"
    echo "   - MinIO Web:   http://localhost:9001"
    echo "======================================================================"
else
    echo "⚠️  Some services took longer to report healthy. Check 'docker compose logs'."
fi
