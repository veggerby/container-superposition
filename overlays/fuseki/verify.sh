#!/bin/bash
# Verification script for Apache Jena Fuseki overlay
# Confirms Fuseki is running and responding to requests

set -e

FUSEKI_HOST="${FUSEKI_HOST:-fuseki}"
FUSEKI_PORT="${FUSEKI_PORT:-3030}"
FUSEKI_URL="http://${FUSEKI_HOST}:${FUSEKI_PORT}"

echo "Verifying Apache Jena Fuseki overlay..."
echo ""

# Check curl is available
echo "1. Checking curl availability..."
if command -v curl &> /dev/null; then
    echo "   curl found"
else
    echo "   curl not found - cannot verify Fuseki service"
    exit 1
fi

# Check Fuseki ping endpoint
echo ""
echo "2. Checking Fuseki service at ${FUSEKI_URL}/\$/ping..."
FUSEKI_READY=false
for i in {1..15}; do
    if curl -sf "${FUSEKI_URL}/\$/ping" &> /dev/null; then
        echo "   Fuseki service is ready"
        FUSEKI_READY=true
        break
    fi
    sleep 2
done

if [ "$FUSEKI_READY" = false ]; then
    echo "   Fuseki service not ready after 30 seconds"
    exit 1
fi

# Check dataset exists
DATASET="${FUSEKI_DATASET:-ds}"
ADMIN_PASSWORD="${FUSEKI_ADMIN_PASSWORD:-admin}"
echo ""
echo "3. Checking dataset '${DATASET}' exists..."
HTTP_STATUS=$(curl -s -o /dev/null -w "%{http_code}" \
    -u "admin:${ADMIN_PASSWORD}" \
    "${FUSEKI_URL}/\$/datasets/${DATASET}")

if [ "$HTTP_STATUS" = "200" ]; then
    echo "   Dataset '${DATASET}' found"
else
    echo "   Dataset '${DATASET}' not found (HTTP ${HTTP_STATUS}) - it may still be initializing"
fi

echo ""
echo "Apache Jena Fuseki overlay verification complete"
echo "Admin UI: ${FUSEKI_URL}"
