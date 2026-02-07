#!/bin/bash
# OTel Demo Node.js verification script

echo "🔍 Verifying OTel Demo (Node.js) installation..."

# Track overall success
ALL_CHECKS_PASSED=true

# Check if service is running
if docker ps --format '{{.Names}}' | grep -q otel-demo-nodejs; then
    echo "✓ OTel Demo (Node.js) service is running"
else
    echo "✗ OTel Demo (Node.js) service is not running"
    ALL_CHECKS_PASSED=false
fi

# Check if HTTP endpoint is accessible
if curl -s -o /dev/null -w "%{http_code}" http://otel-demo-nodejs:8080/health 2>/dev/null | grep -q "200"; then
    echo "✓ Demo app HTTP endpoint is accessible"
else
    echo "⚠️ Demo app HTTP endpoint not responding yet (may still be starting)"
fi

# Final result
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✓ All critical checks passed"
    exit 0
else
    echo "✗ Some checks failed"
    exit 1
fi
