#!/bin/bash
# Verification script for LocalStack overlay
# Confirms LocalStack is running and accessible

set -e

echo "🔍 Verifying LocalStack overlay..."
echo ""

# Check if LocalStack service is running
echo "1️⃣ Checking LocalStack service..."
if command -v curl &> /dev/null; then
    # Wait up to 30 seconds for LocalStack to be ready
    LOCALSTACK_READY=false
    for i in {1..30}; do
        if curl -s http://localstack:4566/_localstack/health &> /dev/null; then
            echo "   ✅ LocalStack service is ready"
            LOCALSTACK_READY=true
            break
        fi
        sleep 1
    done

    if [ "$LOCALSTACK_READY" = false ]; then
        echo "   ❌ LocalStack service not ready after 30 seconds"
        exit 1
    fi
else
    echo "   ⚠️  curl not found, skipping service check"
fi

# Check LocalStack health
echo ""
echo "2️⃣ Checking LocalStack health..."
if command -v curl &> /dev/null; then
    HEALTH=$(curl -s http://localstack:4566/_localstack/health)
    if [ -n "$HEALTH" ]; then
        echo "   ✅ LocalStack health endpoint responding"
        echo "$HEALTH" | head -3
    else
        echo "   ❌ LocalStack health check failed"
        exit 1
    fi
fi

echo ""
echo "✅ LocalStack overlay verification complete"
