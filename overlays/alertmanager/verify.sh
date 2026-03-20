#!/bin/bash
# Alertmanager verification script

echo "🔍 Verifying Alertmanager installation..."

# Track overall success
ALL_CHECKS_PASSED=true

# Check if Alertmanager API is accessible (primary health signal).
# docker ps is used for info only — it may not be accessible in all setups.
if curl -s -o /dev/null -w "%{http_code}" http://alertmanager:9093/-/healthy 2>/dev/null | grep -q "200"; then
    echo "✓ Alertmanager API is accessible"
else
    echo "✗ Alertmanager API not responding (http://alertmanager:9093/-/healthy)"
    ALL_CHECKS_PASSED=false
fi

# Informational: check via docker ps if available.
if docker ps --format '{{.Names}}' 2>/dev/null | grep -q alertmanager; then
    echo "✓ Alertmanager container visible in docker ps"
fi

# Final result
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✓ All critical checks passed"
    exit 0
else
    echo "✗ Some checks failed"
    exit 1
fi
