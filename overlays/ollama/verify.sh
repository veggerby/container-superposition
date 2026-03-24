#!/bin/bash
# Verification script for Ollama overlay
# Confirms Ollama service is running and accessible

echo "🔍 Verifying Ollama overlay..."
echo ""

ALL_CHECKS_PASSED=true

# Check if curl is available
echo "1️⃣ Checking curl availability..."
if ! command -v curl &> /dev/null; then
    echo "   ❌ curl not found"
    ALL_CHECKS_PASSED=false
else
    echo "   ✅ curl found"
fi

# Check Ollama API
echo ""
echo "2️⃣ Checking Ollama service..."
OLLAMA_HOST="${OLLAMA_HOST:-http://ollama:11434}"
OLLAMA_READY=false

for i in {1..20}; do
    if curl -sf "${OLLAMA_HOST}/api/tags" &> /dev/null; then
        echo "   ✅ Ollama service is ready"
        OLLAMA_READY=true
        break
    fi
    sleep 2
done

if [ "$OLLAMA_READY" = false ]; then
    echo "   ❌ Ollama service not ready after 40 seconds"
    ALL_CHECKS_PASSED=false
fi

# Show available models
echo ""
echo "3️⃣ Listing available models..."
MODELS=$(curl -sf "${OLLAMA_HOST}/api/tags" | grep -o '"name":"[^"]*"' | sed 's/"name":"//;s/"//' || echo "")
if [ -n "$MODELS" ]; then
    echo "   ✅ Models available:"
    echo "$MODELS" | while read -r model; do
        echo "      - $model"
    done
else
    echo "   ℹ️  No models pulled yet. Use 'ollama pull <model>' to download a model."
fi

echo ""
if [ "$ALL_CHECKS_PASSED" = true ]; then
    echo "✅ Ollama overlay verification complete"
    echo "   API endpoint: ${OLLAMA_HOST}"
    echo "   Docs: https://ollama.com/library"
    exit 0
else
    echo "❌ Ollama overlay verification failed"
    exit 1
fi
