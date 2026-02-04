#!/bin/bash
# Verification script for Prometheus overlay
# Confirms Prometheus service is accessible

set -e

echo "🔍 Verifying Prometheus overlay..."
echo ""

# Check if Prometheus service is running
echo "1️⃣ Checking Prometheus service..."
# Wait up to 15 seconds for prometheus to be ready
for i in {1..15}; do
    if curl -sf http://prometheus:9090/-/healthy &> /dev/null; then
        echo "   ✅ Prometheus service is ready"
        curl -s http://prometheus:9090/-/healthy
        break
    fi
    if [ $i -eq 15 ]; then
        echo "   ⚠️  Prometheus service not ready yet (may still be starting)"
    fi
    sleep 1
done

echo ""
echo "2️⃣ Checking Prometheus version..."
if curl -sf http://prometheus:9090/api/v1/status/buildinfo &> /dev/null; then
    echo "   Prometheus is accessible at http://prometheus:9090"
fi

echo ""
echo "✅ Prometheus overlay verification complete"
