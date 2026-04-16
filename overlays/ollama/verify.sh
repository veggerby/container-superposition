#!/bin/bash
# Verification script for Ollama overlay
# Confirms Ollama sidecar service is running and accessible

set -e

echo "🔍 Verifying Ollama overlay..."
echo ""

# Check OLLAMA_HOST is set
echo ""
echo "1️⃣ Checking OLLAMA_HOST..."
if [[ -z "${OLLAMA_HOST:-}" ]]; then
    echo "   ⚠️  OLLAMA_HOST is not set — CLI will target localhost instead of the sidecar"
else
    echo "   ✅ OLLAMA_HOST=${OLLAMA_HOST}"
fi

# Check if curl is available
echo ""
echo "2️⃣ Checking curl availability..."
if ! command -v curl &> /dev/null; then
    echo "   ❌ curl not found"
    echo ""
    echo "❌ Ollama overlay verification failed (curl is required but not installed)"
    exit 1
fi
echo "   ✅ curl found"

# Check Ollama API
echo ""
echo "3️⃣ Checking Ollama service..."
OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"
OLLAMA_READY=false

set +e
for i in {1..20}; do
    if curl -sf "${OLLAMA_HOST}/api/tags" &> /dev/null; then
        echo "   ✅ Ollama service is ready"
        OLLAMA_READY=true
        break
    fi
    sleep 2
done
set -e

if [ "$OLLAMA_READY" = false ]; then
    echo "   ❌ Ollama service not ready after 40 seconds"
    echo ""
    echo "❌ Ollama overlay verification failed"
    exit 1
fi

# Show available models via REST API
echo ""
echo "4️⃣ Listing available models via API..."
TAGS_JSON=$(curl -sf "${OLLAMA_HOST}/api/tags")
CURL_STATUS=$?
if [ $CURL_STATUS -ne 0 ]; then
    echo "   ⚠️  Skipping model listing: failed to query /api/tags (curl exit code $CURL_STATUS)"
else
    MODELS=$(printf '%s\n' "$TAGS_JSON" | grep -o '"name":"[^"]*"' | sed 's/"name":"//;s/"//')
    if [ -n "$MODELS" ]; then
        echo "   ✅ Models available:"
        echo "$MODELS" | while read -r model; do
            echo "      - $model"
        done
    else
        echo "   ℹ️  No models pulled yet. Use 'ollama pull <model>' to download a model."
    fi
fi

echo ""
echo "✅ Ollama overlay verification complete"
echo "   API endpoint: ${OLLAMA_HOST}"
echo "   Docs: https://ollama.com/library"
