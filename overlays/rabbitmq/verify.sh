#!/bin/bash
# Verification script for RabbitMQ overlay
# Confirms RabbitMQ is installed and accessible

set -e

echo "🔍 Verifying RabbitMQ overlay..."
echo ""

# Check if RabbitMQ service is running
echo "1️⃣ Checking RabbitMQ service..."
# Wait up to 30 seconds for RabbitMQ to be ready
RABBITMQ_READY=false
for i in {1..30}; do
    if curl -s -u guest:guest http://rabbitmq:15672/api/health/checks/alarms &> /dev/null; then
        echo "   ✅ RabbitMQ service is ready"
        RABBITMQ_READY=true
        break
    fi
    sleep 1
done

if [ "$RABBITMQ_READY" = false ]; then
    echo "   ❌ RabbitMQ service not ready after 30 seconds"
    exit 1
fi

# Check RabbitMQ management API
echo ""
echo "2️⃣ Checking RabbitMQ Management API..."
if curl -s -u guest:guest http://rabbitmq:15672/api/overview &> /dev/null; then
    echo "   ✅ RabbitMQ Management API is accessible"
else
    echo "   ❌ RabbitMQ Management API not accessible"
    exit 1
fi

echo ""
echo "✅ RabbitMQ overlay verification complete"
echo "   Management UI: http://localhost:15672"
echo "   Default credentials: guest/guest"
