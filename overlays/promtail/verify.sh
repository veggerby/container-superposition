#!/bin/bash
# Promtail verification script

echo "🔍 Verifying Promtail installation..."

# Track overall success
ALL_CHECKS_PASSED=true

# Wait for Promtail /ready endpoint (primary health signal).
# docker ps is informational only — not reliably accessible in all devcontainers.
PROMTAIL_READY=false
for i in {1..40}; do
    if curl -s -o /dev/null -w "%{http_code}" http://promtail:3101/ready 2>/dev/null | grep -q "200"; then
        echo "✓ Promtail is ready (HTTP /ready)"
        PROMTAIL_READY=true
        break
    fi
    sleep 3
done
if [ "$PROMTAIL_READY" = false ]; then
    echo "✗ Promtail /ready endpoint not responding after 120 s (http://promtail:3101/ready)"
    ALL_CHECKS_PASSED=false
fi

# Informational: check via docker ps if available.
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q promtail; then
    echo "✓ Promtail container visible in docker ps"
fi

# Final result
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✓ All critical checks passed"
    exit 0
else
    echo "✗ Some checks failed"
    exit 1
fi
