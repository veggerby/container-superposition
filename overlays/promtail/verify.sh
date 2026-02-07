#!/bin/bash
# Promtail verification script

echo "🔍 Verifying Promtail installation..."

# Track overall success
ALL_CHECKS_PASSED=true

# Check if Promtail service is running
if docker ps --format '{{.Names}}' | grep -q promtail; then
    echo "✓ Promtail service is running"
else
    echo "✗ Promtail service is not running"
    ALL_CHECKS_PASSED=false
fi

# Check if Promtail can access Docker socket
if docker exec promtail test -S /var/run/docker.sock 2>/dev/null; then
    echo "✓ Promtail has access to Docker socket"
else
    echo "⚠️ Promtail cannot access Docker socket"
fi

# Final result
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✓ All critical checks passed"
    exit 0
else
    echo "✗ Some checks failed"
    exit 1
fi
