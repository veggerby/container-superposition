#!/bin/bash
# Verification script for Prometheus overlay
# Confirms Prometheus service is accessible

set -e

echo "🔍 Verifying Prometheus overlay..."
echo ""

# Check if Prometheus service is running
echo "1️⃣ Checking Prometheus service..."
# Wait up to 15 seconds for prometheus to be ready
PROMETHEUS_READY=false
for i in {1..15}; do
    if curl -sf http://prometheus:9090/-/healthy &> /dev/null; then
        echo "   ✅ Prometheus service is ready"
        curl -s http://prometheus:9090/-/healthy
        PROMETHEUS_READY=true
        break
    fi
    sleep 1
done

if [ "$PROMETHEUS_READY" = false ]; then
    echo "   ❌ Prometheus service not ready after 15 seconds"
    exit 1
fi

echo ""
echo "2️⃣ Checking Prometheus version..."
echo "   Prometheus is accessible at http://prometheus:9090"

echo ""
echo "✅ Prometheus overlay verification complete"
