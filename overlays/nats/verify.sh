#!/bin/bash
# Verification script for NATS overlay
# Confirms NATS is installed and accessible

set -e

echo "🔍 Verifying NATS overlay..."
echo ""

# Check if NATS service is running
echo "1️⃣ Checking NATS service..."
NATS_HOST="${NATS_HOST:-nats{{cs.CS_INSTANCE_SUFFIX}}}"
NATS_CLIENT_PORT="${NATS_CLIENT_PORT:-{{cs.NATS_CLIENT_PORT}}}"
NATS_HTTP_PORT="${NATS_HTTP_PORT:-{{cs.NATS_HTTP_PORT}}}"
NATS_URL="${NATS_URL:-nats://${NATS_HOST}:${NATS_CLIENT_PORT}}"
# Wait up to 20 seconds for NATS to be ready
NATS_READY=false
for i in {1..20}; do
    if curl -s "http://${NATS_HOST}:${NATS_HTTP_PORT}/healthz" &> /dev/null; then
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
if curl -s "http://${NATS_HOST}:${NATS_HTTP_PORT}/varz" &> /dev/null; then
    echo "   ✅ NATS monitoring endpoint is accessible"
else
    echo "   ❌ NATS monitoring endpoint not accessible"
    exit 1
fi

# Check JetStream is enabled
echo ""
echo "3️⃣ Checking JetStream..."
if curl -s "http://${NATS_HOST}:${NATS_HTTP_PORT}/jsz" &> /dev/null; then
    echo "   ✅ JetStream is enabled"
else
    echo "   ⚠️  JetStream status unknown"
fi

echo ""
echo "✅ NATS overlay verification complete"
echo "   Client URL: ${NATS_URL}"
echo "   Monitoring: http://${NATS_HOST}:${NATS_HTTP_PORT}"
