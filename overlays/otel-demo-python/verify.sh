#!/bin/bash
# OTel Demo Python verification script

echo "🔍 Verifying OTel Demo (Python) installation..."

# Track overall success
ALL_CHECKS_PASSED=true

# Wait for demo app HTTP health endpoint (primary health signal).
# docker ps is informational only — not reliably accessible in all devcontainers.
APP_READY=false
for i in {1..40}; do
    if curl -s -o /dev/null -w "%{http_code}" http://otel-demo-python:8081/health 2>/dev/null | grep -q "200"; then
        echo "✓ Demo app HTTP endpoint is accessible"
        APP_READY=true
        break
    fi
    sleep 3
done
if [ "$APP_READY" = false ]; then
    echo "✗ Demo app HTTP endpoint not responding after 120 s (http://otel-demo-python:8081/health)"
    ALL_CHECKS_PASSED=false
fi

# Informational: check via docker ps if available.
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q otel-demo-python; then
    echo "✓ OTel Demo (Python) container visible in docker ps"
fi

# Final result
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✓ All critical checks passed"
    exit 0
else
    echo "✗ Some checks failed"
    exit 1
fi
