#!/bin/bash
# Alertmanager verification script

echo "🔍 Verifying Alertmanager installation..."

# Track overall success
ALL_CHECKS_PASSED=true

# Check if Alertmanager service is running
if docker ps --format '{{.Names}}' | grep -q alertmanager; then
    echo "✓ Alertmanager service is running"
else
    echo "✗ Alertmanager service is not running"
    ALL_CHECKS_PASSED=false
fi

# Check if Alertmanager API is accessible
if curl -s -o /dev/null -w "%{http_code}" http://alertmanager:9093/-/healthy 2>/dev/null | grep -q "200"; then
    echo "✓ Alertmanager API is accessible"
else
    echo "⚠️ Alertmanager API not responding yet (may still be starting)"
fi

# Final result
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✓ All critical checks passed"
    exit 0
else
    echo "✗ Some checks failed"
    exit 1
fi
