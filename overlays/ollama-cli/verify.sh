#!/bin/bash
# Verification script for Ollama CLI overlay

set -e

echo "🔍 Verifying Ollama CLI overlay..."
echo ""

echo "1️⃣ Checking Ollama CLI..."
if ! command -v ollama &>/dev/null; then
    echo "   ❌ ollama CLI not found"
    echo ""
    echo "❌ Ollama CLI overlay verification failed"
    exit 1
fi
echo "   ✅ ollama CLI found: $(ollama --version 2>/dev/null || echo 'version unavailable')"

echo ""
echo "2️⃣ Checking OLLAMA_HOST configuration..."
if [[ -z "${OLLAMA_HOST:-}" ]]; then
    echo "   ℹ️  OLLAMA_HOST is not set (default CLI target: http://localhost:11434)"
    echo "   ℹ️  Set OLLAMA_HOST to a reachable Ollama endpoint, e.g. http://host.docker.internal:11434"
    echo ""
    echo "✅ Ollama CLI overlay verification complete"
    exit 0
fi

echo "   ✅ OLLAMA_HOST=${OLLAMA_HOST}"

echo ""
echo "3️⃣ Checking endpoint reachability (best effort)..."
if ! command -v curl &>/dev/null; then
    echo "   ⚠️  curl not found; skipping endpoint check"
    echo ""
    echo "✅ Ollama CLI overlay verification complete"
    exit 0
fi

set +e
if curl -sf "${OLLAMA_HOST}/api/tags" >/dev/null; then
    echo "   ✅ Reached Ollama endpoint at ${OLLAMA_HOST}"
else
    echo "   ⚠️  Could not reach ${OLLAMA_HOST}/api/tags"
    echo "   ⚠️  Ensure your Ollama server is running and reachable from the devcontainer"
fi
set -e

echo ""
echo "✅ Ollama CLI overlay verification complete"
