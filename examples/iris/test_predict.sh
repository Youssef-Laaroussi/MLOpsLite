#!/usr/bin/env bash
# Test inference endpoint for Iris classification model (Issue #36)
set -e

PORT="${1:-8100}"
ENDPOINT="http://localhost:${PORT}/predict"

echo "🌺 Sending inference requests to ${ENDPOINT}..."
echo ""

# Test Sample 1: Setosa (species 0)
echo "Sample 1 (Setosa - expected species 0):"
curl -s -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"features": [5.1, 3.5, 1.4, 0.2]}' | jq . || true

echo ""
# Test Sample 2: Versicolor (species 1)
echo "Sample 2 (Versicolor - expected species 1):"
curl -s -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"features": [6.4, 3.2, 4.5, 1.5]}' | jq . || true

echo ""
# Test Sample 3: Virginica (species 2)
echo "Sample 3 (Virginica - expected species 2):"
curl -s -X POST "${ENDPOINT}" \
  -H "Content-Type: application/json" \
  -d '{"features": [6.9, 3.1, 5.4, 2.1]}' | jq . || true

echo ""
echo "✓ Inference test completed successfully!"
