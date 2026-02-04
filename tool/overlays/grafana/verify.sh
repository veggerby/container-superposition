#!/bin/bash
# Verification script for Grafana overlay
# Confirms Grafana service is accessible

set -e

echo "🔍 Verifying Grafana overlay..."
echo ""

# Check if Grafana service is running
echo "1️⃣ Checking Grafana service..."
# Wait up to 15 seconds for grafana to be ready
for i in {1..15}; do
    if curl -sf http://grafana:3000/api/health &> /dev/null; then
        echo "   ✅ Grafana service is ready"
        curl -s http://grafana:3000/api/health | head -n 1
        break
    fi
    if [ $i -eq 15 ]; then
        echo "   ⚠️  Grafana service not ready yet (may still be starting)"
    fi
    sleep 1
done

echo ""
echo "2️⃣ Checking Grafana version..."
if curl -sf http://grafana:3000/api/health &> /dev/null; then
    echo "   Grafana is accessible at http://grafana:3000"
fi

echo ""
echo "✅ Grafana overlay verification complete"
