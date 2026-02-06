#!/bin/bash
# Verification script for MinIO overlay
# Confirms MinIO service and client are accessible

set -e

echo "🔍 Verifying MinIO overlay..."
echo ""

# Check MinIO client is installed
echo "1️⃣ Checking MinIO client (mc)..."
if command -v mc &> /dev/null; then
    mc --version
    echo "   ✅ MinIO client found"
else
    echo "   ❌ MinIO client not found"
    exit 1
fi

# Check if MinIO service is running
echo ""
echo "2️⃣ Checking MinIO service..."
MINIO_READY=false
for i in {1..15}; do
    if curl -s http://minio:9000/minio/health/live &> /dev/null; then
        echo "   ✅ MinIO service is ready"
        MINIO_READY=true
        break
    fi
    sleep 1
done

if [ "$MINIO_READY" = false ]; then
    echo "   ❌ MinIO service not ready after 15 seconds"
    exit 1
fi

# Check MinIO Console
echo ""
echo "3️⃣ Checking MinIO Console..."
if curl -s -o /dev/null -w "%{http_code}" http://minio:9001 | grep -q "200\|307"; then
    echo "   ✅ MinIO Console is accessible"
else
    echo "   ⚠️  MinIO Console may still be starting up"
fi

# Test MinIO client connection
echo ""
echo "4️⃣ Testing MinIO client connection..."
if mc alias list | grep -q "local"; then
    echo "   ✅ MinIO client configured"
    
    # Try listing buckets
    if mc ls local &> /dev/null; then
        echo "   ✅ Can list buckets"
    else
        echo "   ⚠️  Cannot list buckets (may need credentials)"
    fi
else
    echo "   ⚠️  MinIO client alias not configured"
fi

echo ""
echo "✅ MinIO overlay verification complete"
