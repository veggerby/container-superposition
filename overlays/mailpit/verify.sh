#!/bin/bash
# Verification script for Mailpit overlay
# Confirms Mailpit is running and accessible

set -e

echo "🔍 Verifying Mailpit overlay..."
echo ""

# Check if curl is available
echo "1️⃣ Checking curl availability..."
if ! command -v curl &> /dev/null; then
    echo "   ❌ curl not found"
    exit 1
fi
echo "   ✅ curl found"

# Check Mailpit web UI
echo ""
echo "2️⃣ Checking Mailpit service..."
MAILPIT_HOST="${MAILPIT_HOST:-mailpit}"
MAILPIT_UI_PORT="${MAILPIT_UI_PORT:-8025}"
MAILPIT_READY=false

for i in {1..20}; do
    if curl -sf "http://${MAILPIT_HOST}:${MAILPIT_UI_PORT}/api/v1/info" &> /dev/null; then
        echo "   ✅ Mailpit service is ready"
        MAILPIT_READY=true
        break
    fi
    sleep 2
done

if [ "$MAILPIT_READY" = false ]; then
    echo "   ❌ Mailpit service not ready after 40 seconds"
    exit 1
fi

# Check Mailpit API
echo ""
echo "3️⃣ Checking Mailpit API..."
if curl -sf "http://${MAILPIT_HOST}:${MAILPIT_UI_PORT}/api/v1/messages" &> /dev/null; then
    echo "   ✅ Mailpit API is accessible"
else
    echo "   ❌ Mailpit API not accessible"
    exit 1
fi

echo ""
echo "✅ Mailpit overlay verification complete"
echo "   Web UI: http://localhost:${MAILPIT_UI_PORT}"
echo "   SMTP server: mailpit:1025 (from inside container)"
