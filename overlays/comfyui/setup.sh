#!/bin/bash
# ComfyUI setup script — initializes the shared models directory

set -e

echo "🔧 Setting up ComfyUI..."

# Pre-create all expected model subdirectories inside the shared models root.
# Both the devcontainer and the ComfyUI sidecar mount this directory, so the
# subdirectories must exist before ComfyUI starts (it does not create them).
MODELS_DIR="${COMFYUI_MODELS_DIR:-/opt/comfyui-models}"

echo "📁 Initializing model subdirectories at ${MODELS_DIR}..."

# Ensure the root models directory exists and is writable by the current user.
if ! mkdir -p "${MODELS_DIR}" 2>/dev/null; then
    # Likely a permission issue on a mounted volume; try with sudo if available.
    if command -v sudo >/dev/null 2>&1; then
        echo "⚠️  ${MODELS_DIR} is not writable, attempting to create it with sudo..."
        sudo mkdir -p "${MODELS_DIR}"
        sudo chown "$(id -u):$(id -g)" "${MODELS_DIR}"
    else
        echo "❌ Failed to create ${MODELS_DIR} (permission denied and sudo not available)." >&2
        exit 1
    fi
fi

if [ ! -w "${MODELS_DIR}" ]; then
    echo "❌ ${MODELS_DIR} is not writable by user $(id -un). Please adjust permissions and retry." >&2
    exit 1
fi

for subdir in checkpoints loras controlnet clip_vision vae embeddings upscale_models; do
    mkdir -p "${MODELS_DIR}/${subdir}"
done
echo "✓ ComfyUI model subdirectories initialized at ${MODELS_DIR}"
