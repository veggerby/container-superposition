#!/bin/bash
# OTel Demo Node.js verification script

echo "🔍 Verifying OTel Demo (Node.js) installation..."

# Track overall success
ALL_CHECKS_PASSED=true

# Check if HTTP health endpoint is accessible (primary health signal).
# docker ps is informational only — not reliably accessible in all devcontainers.
if curl -s -o /dev/null -w "%{http_code}" http://otel-demo-nodejs:8080/health 2>/dev/null | grep -q "200"; then
    echo "✓ Demo app HTTP endpoint is accessible"
else
    echo "✗ Demo app HTTP endpoint not responding (http://otel-demo-nodejs:8080/health)"
    ALL_CHECKS_PASSED=false
fi

# Informational: check via docker ps if available.
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q otel-demo-nodejs; then
    echo "✓ OTel Demo (Node.js) container visible in docker ps"
fi

# Final result
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✓ All critical checks passed"
    exit 0
else
    echo "✗ Some checks failed"
    exit 1
fi
