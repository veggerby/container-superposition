#!/bin/bash
# Verification script for ComfyUI overlay
# Confirms the shared models directory is set up correctly and the ComfyUI service is accessible

set -e

echo "🔍 Verifying ComfyUI overlay..."
echo ""

# Check shared models directory
echo "1️⃣ Checking shared models directory..."
MODELS_DIR="${COMFYUI_MODELS_DIR:-/opt/comfyui-models}"

if [ ! -d "${MODELS_DIR}" ]; then
    echo "   ❌ Models directory not found: ${MODELS_DIR}"
    echo ""
    echo "❌ ComfyUI overlay verification failed"
    exit 1
fi
echo "   ✅ Models directory exists: ${MODELS_DIR}"

if [ ! -w "${MODELS_DIR}" ]; then
    echo "   ❌ Models directory is not writable: ${MODELS_DIR}"
    echo ""
    echo "❌ ComfyUI overlay verification failed"
    exit 1
fi
echo "   ✅ Models directory is writable"

EXPECTED_SUBDIRS=(checkpoints loras controlnet clip_vision vae embeddings upscale_models)
MISSING_SUBDIRS=()
for subdir in "${EXPECTED_SUBDIRS[@]}"; do
    if [ ! -d "${MODELS_DIR}/${subdir}" ]; then
        MISSING_SUBDIRS+=("${subdir}")
    fi
done

if [ ${#MISSING_SUBDIRS[@]} -gt 0 ]; then
    echo "   ❌ Missing model subdirectories: ${MISSING_SUBDIRS[*]}"
    echo ""
    echo "❌ ComfyUI overlay verification failed"
    exit 1
fi
echo "   ✅ All expected model subdirectories present"

# Check if curl is available
echo ""
echo "2️⃣ Checking curl availability..."
if ! command -v curl &> /dev/null; then
    echo "   ❌ curl not found"
    echo ""
    echo "❌ ComfyUI overlay verification failed (curl is required but not installed)"
    exit 1
fi
echo "   ✅ curl found"

# Check ComfyUI web UI
echo ""
echo "3️⃣ Checking ComfyUI service..."
COMFYUI_URL="${COMFYUI_URL:-http://comfyui:8188}"
COMFYUI_READY=false

set +e
for i in {1..30}; do
    if curl -sf "${COMFYUI_URL}/" &> /dev/null; then
        echo "   ✅ ComfyUI service is ready"
        COMFYUI_READY=true
        break
    fi
    sleep 2
done
set -e

if [ "$COMFYUI_READY" = false ]; then
    echo "   ❌ ComfyUI service not ready after 60 seconds"
    echo ""
    echo "   Tip: ComfyUI may take a while to start on first launch while it loads models."
    echo "   Check logs with: docker compose logs comfyui"
    echo ""
    echo "❌ ComfyUI overlay verification failed"
    exit 1
fi

# Check system stats endpoint
echo ""
echo "4️⃣ Checking ComfyUI system stats..."
set +e
STATS_JSON=$(curl -sf "${COMFYUI_URL}/system_stats")
CURL_STATUS=$?
set -e

if [ $CURL_STATUS -eq 0 ] && [ -n "$STATS_JSON" ]; then
    echo "   ✅ ComfyUI API is responding"
else
    echo "   ⚠️  Could not reach /system_stats endpoint (service may still be loading)"
fi

echo ""
echo "✅ ComfyUI overlay verification complete"
echo "   Models directory: ${MODELS_DIR}"
echo "   Web UI: ${COMFYUI_URL}"
echo "   API (example): ${COMFYUI_URL}/system_stats"
echo "   Docs: https://github.com/comfyanonymous/ComfyUI"
