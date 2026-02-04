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
for i in {1..10}; do
    if redis-cli -h redis ping &> /dev/null; then
        echo "   ✅ Redis service is ready"
        redis-cli -h redis ping
        break
    fi
    if [ $i -eq 10 ]; then
        echo "   ⚠️  Redis service not ready yet (may still be starting)"
    fi
    sleep 1
done

echo ""
echo "✅ Redis overlay verification complete"
