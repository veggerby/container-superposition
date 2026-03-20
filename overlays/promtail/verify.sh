#!/bin/bash
# Promtail verification script

echo "🔍 Verifying Promtail installation..."

# Track overall success
ALL_CHECKS_PASSED=true

# Check if Promtail /ready endpoint is accessible (primary health signal).
# docker ps is informational only — not reliably accessible in all devcontainers.
if curl -s -o /dev/null -w "%{http_code}" http://promtail:3101/ready 2>/dev/null | grep -q "200"; then
    echo "✓ Promtail is ready (HTTP /ready)"
else
    echo "✗ Promtail /ready endpoint not responding (http://promtail:3101/ready)"
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
