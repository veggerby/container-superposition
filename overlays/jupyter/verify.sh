#!/bin/bash
# Verification script for Jupyter overlay
# Confirms Jupyter is running

set -e

echo "🔍 Verifying Jupyter overlay..."
echo ""

# Check if Jupyter service is running
echo "1️⃣ Checking Jupyter service..."
if command -v curl &> /dev/null; then
    # Wait up to 30 seconds for Jupyter to be ready
    JUPYTER_READY=false
    for i in {1..30}; do
        if curl -s http://jupyter:8888 &> /dev/null; then
            echo "   ✅ Jupyter service is ready"
            JUPYTER_READY=true
            break
        fi
        sleep 1
    done

    if [ "$JUPYTER_READY" = false ]; then
        echo "   ❌ Jupyter service not ready after 30 seconds"
        exit 1
    fi
else
    echo "   ⚠️  curl not found, skipping service check"
fi

echo ""
echo "✅ Jupyter overlay verification complete"
echo ""
echo "ℹ️  Access Jupyter at http://localhost:8888"
