#!/bin/bash
# ComfyUI setup script — initializes the shared models directory

set -e

echo "🔧 Setting up ComfyUI..."

# Pre-create all expected model subdirectories inside the shared models root.
# Both the devcontainer and the ComfyUI sidecar mount this directory, so the
# subdirectories must exist before ComfyUI starts (it does not create them).
MODELS_DIR="${COMFYUI_MODELS_DIR:-/opt/comfyui-models}"

echo "📁 Initializing model subdirectories at ${MODELS_DIR}..."
for subdir in checkpoints loras controlnet clip_vision vae embeddings upscale_models; do
    mkdir -p "${MODELS_DIR}/${subdir}"
done
echo "✓ ComfyUI model subdirectories initialized at ${MODELS_DIR}"
