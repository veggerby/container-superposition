#!/bin/bash
# Verification script for MongoDB overlay
# Confirms MongoDB client and services are accessible

set -e

echo "🔍 Verifying MongoDB overlay..."
echo ""

# Check mongosh is installed
echo "1️⃣ Checking mongosh client..."
if command -v mongosh &> /dev/null; then
    mongosh --version
    echo "   ✅ mongosh client found"
else
    echo "   ❌ mongosh client not found"
    exit 1
fi

# Check if MongoDB service is running
echo ""
echo "2️⃣ Checking MongoDB service..."
MONGODB_READY=false
for i in {1..15}; do
    if mongosh --host mongodb --port 27017 -u root -p example --eval "db.adminCommand('ping')" &> /dev/null; then
        echo "   ✅ MongoDB service is ready"
        MONGODB_READY=true
        break
    fi
    sleep 1
done

if [ "$MONGODB_READY" = false ]; then
    echo "   ❌ MongoDB service not ready after 15 seconds"
    exit 1
fi

# Check Mongo Express
echo ""
echo "3️⃣ Checking Mongo Express web UI..."
if curl -s -o /dev/null -w "%{http_code}" http://mongo-express:8081 | grep -q "200"; then
    echo "   ✅ Mongo Express is accessible"
else
    echo "   ⚠️  Mongo Express may still be starting up"
fi

echo ""
echo "✅ MongoDB overlay verification complete"
