#!/bin/bash
# Verification script for Redpanda overlay
# Confirms Redpanda is installed and accessible

set -e

echo "🔍 Verifying Redpanda overlay..."
echo ""

# Check if Redpanda service is running
echo "1️⃣ Checking Redpanda service..."
# Wait up to 30 seconds for Redpanda to be ready
REDPANDA_READY=false
for i in {1..30}; do
    if curl -s http://redpanda:9644/v1/cluster/health_overview &> /dev/null; then
        echo "   ✅ Redpanda service is ready"
        REDPANDA_READY=true
        break
    fi
    sleep 1
done

if [ "$REDPANDA_READY" = false ]; then
    echo "   ❌ Redpanda service not ready after 30 seconds"
    exit 1
fi

# Check Redpanda Console
echo ""
echo "2️⃣ Checking Redpanda Console..."
CONSOLE_READY=false
for i in {1..30}; do
    if curl -s http://redpanda-console:8080 &> /dev/null; then
        echo "   ✅ Redpanda Console is accessible"
        CONSOLE_READY=true
        break
    fi
    sleep 1
done

if [ "$CONSOLE_READY" = false ]; then
    echo "   ⚠️  Redpanda Console not ready (may still be starting)"
fi

echo ""
echo "✅ Redpanda overlay verification complete"
echo "   Kafka API: redpanda:9092"
echo "   Console UI: http://localhost:8080"
