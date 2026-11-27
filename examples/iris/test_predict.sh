#!/usr/bin/env bash
# Test inference endpoint for Iris classification model (Issue #36)
set -euo pipefail

DEPLOYMENT_ID="${1:?Usage: ./test_predict.sh DEPLOYMENT_ID}"
if [[ -n "${MLITE_API_KEY:-}" ]]; then
  AUTH_HEADER="X-API-Key: ${MLITE_API_KEY}"
else
  : "${MLITE_TOKEN:?Set MLITE_TOKEN to your Bearer token, or set MLITE_API_KEY}"
  AUTH_HEADER="Authorization: Bearer ${MLITE_TOKEN}"
fi
API_URL="${MLITE_API_URL:-http://localhost:8000}"
ENDPOINT="${API_URL%/}/api/v1/deployments/${DEPLOYMENT_ID}/predict"

echo "🌺 Sending inference requests to ${ENDPOINT}..."
echo ""

# Test Sample 1: Setosa (species 0)
echo "Sample 1 (Setosa - expected species 0):"
curl -fsS -X POST "${ENDPOINT}" \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"inputs": [[5.1, 3.5, 1.4, 0.2]]}' | jq .

echo ""
# Test Sample 2: Versicolor (species 1)
echo "Sample 2 (Versicolor - expected species 1):"
curl -fsS -X POST "${ENDPOINT}" \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"inputs": [[6.4, 3.2, 4.5, 1.5]]}' | jq .

echo ""
# Test Sample 3: Virginica (species 2)
echo "Sample 3 (Virginica - expected species 2):"
curl -fsS -X POST "${ENDPOINT}" \
  -H "${AUTH_HEADER}" \
  -H "Content-Type: application/json" \
  -d '{"inputs": [[6.9, 3.1, 5.4, 2.1]]}' | jq .

echo ""
echo "✓ Inference test completed successfully!"
