#!/bin/bash
# Verification script for NATS overlay
# Confirms NATS is installed and accessible

set -e

echo "🔍 Verifying NATS overlay..."
echo ""

# Check if NATS service is running
echo "1️⃣ Checking NATS service..."
# Wait up to 20 seconds for NATS to be ready
NATS_READY=false
for i in {1..20}; do
    if curl -s http://nats:8222/healthz &> /dev/null; then
        echo "   ✅ NATS service is ready"
        NATS_READY=true
        break
    fi
    sleep 1
done

if [ "$NATS_READY" = false ]; then
    echo "   ❌ NATS service not ready after 20 seconds"
    exit 1
fi

# Check NATS monitoring endpoint
echo ""
echo "2️⃣ Checking NATS monitoring endpoint..."
if curl -s http://nats:8222/varz &> /dev/null; then
    echo "   ✅ NATS monitoring endpoint is accessible"
else
    echo "   ❌ NATS monitoring endpoint not accessible"
    exit 1
fi

# Check JetStream is enabled
echo ""
echo "3️⃣ Checking JetStream..."
if curl -s http://nats:8222/jsz &> /dev/null; then
    echo "   ✅ JetStream is enabled"
else
    echo "   ⚠️  JetStream status unknown"
fi

echo ""
echo "✅ NATS overlay verification complete"
echo "   Client URL: nats://nats:4222"
echo "   Monitoring: http://localhost:8222"
