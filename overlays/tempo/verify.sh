#!/bin/bash
# Tempo verification script

echo "🔍 Verifying Tempo installation..."

# Track overall success
ALL_CHECKS_PASSED=true

# Wait for Tempo /ready endpoint (primary health signal).
# docker ps is informational only — not reliably accessible in all devcontainers.
TEMPO_READY=false
for i in {1..40}; do
    if curl -s -o /dev/null -w "%{http_code}" http://tempo:3200/ready 2>/dev/null | grep -q "200"; then
        echo "✓ Tempo HTTP API is accessible"
        TEMPO_READY=true
        break
    fi
    sleep 3
done
if [ "$TEMPO_READY" = false ]; then
    echo "✗ Tempo /ready endpoint not responding after 120 s (http://tempo:3200/ready)"
    ALL_CHECKS_PASSED=false
fi

# Informational: check via docker ps if available.
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q tempo; then
    echo "✓ Tempo container visible in docker ps"
fi

# Final result
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✓ All critical checks passed"
    exit 0
else
    echo "✗ Some checks failed"
    exit 1
fi
