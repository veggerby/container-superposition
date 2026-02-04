#!/bin/bash
# Verification script for Redis overlay
# Confirms Redis is installed and accessible

set -e

echo "🔍 Verifying Redis overlay..."
echo ""

# Check redis-cli is installed
echo "1️⃣ Checking redis-cli client..."
if command -v redis-cli &> /dev/null; then
    redis-cli --version
    echo "   ✅ redis-cli client found"
else
    echo "   ❌ redis-cli client not found"
    exit 1
fi

# Check if Redis service is running
echo ""
echo "2️⃣ Checking Redis service..."
# Wait up to 10 seconds for redis to be ready
REDIS_READY=false
for i in {1..10}; do
    if redis-cli -h redis ping &> /dev/null; then
        echo "   ✅ Redis service is ready"
        redis-cli -h redis ping
        REDIS_READY=true
        break
    fi
    sleep 1
done

if [ "$REDIS_READY" = false ]; then
    echo "   ❌ Redis service not ready after 10 seconds"
    exit 1
fi

echo ""
echo "✅ Redis overlay verification complete"
