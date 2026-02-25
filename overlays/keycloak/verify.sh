#!/bin/bash
# Verification script for Keycloak overlay
# Confirms Keycloak is running and accessible

echo "🔍 Verifying Keycloak overlay..."
echo ""

# Check if curl is available
echo "1️⃣ Checking curl availability..."
if ! command -v curl &> /dev/null; then
    echo "   ❌ curl not found"
    exit 1
fi
echo "   ✅ curl found"

# Check Keycloak health endpoint
echo ""
echo "2️⃣ Checking Keycloak service..."
KEYCLOAK_HOST="${KEYCLOAK_HOST:-keycloak}"
KEYCLOAK_PORT="${KEYCLOAK_PORT:-8180}"
KEYCLOAK_READY=false

for i in {1..40}; do
    if curl -sf "http://${KEYCLOAK_HOST}:${KEYCLOAK_PORT}/health/ready" &> /dev/null; then
        echo "   ✅ Keycloak service is ready"
        KEYCLOAK_READY=true
        break
    fi
    sleep 3
done

if [ "$KEYCLOAK_READY" = false ]; then
    echo "   ❌ Keycloak service not ready after 2 minutes"
    echo "   ℹ️  Keycloak can take a while to start on first run"
    exit 1
fi

# Check OIDC discovery endpoint
echo ""
echo "3️⃣ Checking OIDC discovery endpoint..."
if curl -sf "http://${KEYCLOAK_HOST}:${KEYCLOAK_PORT}/realms/master/.well-known/openid-configuration" &> /dev/null; then
    echo "   ✅ OIDC discovery endpoint is accessible"
else
    echo "   ❌ OIDC discovery endpoint not accessible"
    exit 1
fi

echo ""
echo "✅ Keycloak overlay verification complete"
echo "   Admin console: http://localhost:${KEYCLOAK_PORT}"
echo "   Admin credentials: admin / admin (default)"
echo "   OIDC discovery: http://localhost:${KEYCLOAK_PORT}/realms/master/.well-known/openid-configuration"
