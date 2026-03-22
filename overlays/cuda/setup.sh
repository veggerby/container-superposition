#!/bin/bash
# CUDA overlay setup script
# Checks that nvidia-smi is reachable inside the container and prints
# a helpful message when the host is not configured for GPU passthrough.

set -e

echo "🖥️  Setting up CUDA (NVIDIA GPU) overlay..."

if command -v nvidia-smi &> /dev/null; then
    echo "✓ nvidia-smi found: $(nvidia-smi --query-gpu=name --format=csv,noheader 2>/dev/null | head -n1 || nvidia-smi -L 2>/dev/null | head -n1 || echo 'GPU detected')"
    echo "✓ CUDA overlay is ready"
else
    echo ""
    echo "⚠️  nvidia-smi not found inside the container."
    echo ""
    echo "   GPU passthrough requires the following on the host:"
    echo "   1. A supported NVIDIA GPU"
    echo "   2. NVIDIA drivers installed on the host"
    echo "   3. NVIDIA Container Toolkit installed and configured:"
    echo "      https://docs.nvidia.com/datacenter/cloud-native/container-toolkit/install-guide.html"
    echo "   4. Docker configured to use the NVIDIA runtime:"
    echo "      nvidia-ctk runtime configure --runtime=docker"
    echo ""
    echo "   This overlay adds '--gpus=all' to the container's runArgs and sets"
    echo "   hostRequirements.gpu = true in devcontainer.json, but it cannot"
    echo "   install or replace host drivers."
    echo ""
    echo "   Once the host is configured, rebuild the dev container."
    echo ""
    echo "ℹ️  CUDA overlay setup complete (nvidia-smi not available on this host)"
fi
