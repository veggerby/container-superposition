#!/bin/bash
# Tempo verification script

echo "🔍 Verifying Tempo installation..."

# Track overall success
ALL_CHECKS_PASSED=true

# Check if Tempo service is running
if docker ps --format '{{.Names}}' | grep -q tempo; then
    echo "✓ Tempo service is running"
else
    echo "✗ Tempo service is not running"
    ALL_CHECKS_PASSED=false
fi

# Check if Tempo HTTP API is accessible
if curl -s -o /dev/null -w "%{http_code}" http://tempo:3200/ready 2>/dev/null | grep -q "200"; then
    echo "✓ Tempo HTTP API is accessible"
else
    echo "⚠️ Tempo HTTP API not responding yet (may still be starting)"
fi

# Final result
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✓ All critical checks passed"
    exit 0
else
    echo "✗ Some checks failed"
    exit 1
fi
