#!/bin/bash
# Verification script for CUDA overlay
# Asserts nvidia-smi exits 0 (used by the doctor command)

set -e

echo "🔍 Verifying CUDA (NVIDIA GPU) overlay..."
echo ""

echo "1️⃣ Checking nvidia-smi..."
if command -v nvidia-smi &> /dev/null; then
    if nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>/dev/null; then
        echo "   ✅ nvidia-smi is available and GPU is accessible"
    elif nvidia-smi -L; then
        echo "   ✅ nvidia-smi is available and GPU is accessible"
    else
        echo "   ❌ nvidia-smi is installed but failed to query GPU information"
        echo ""
        echo "   Possible causes:"
        echo "   - NVIDIA driver is not loaded or mismatched with the container CUDA version"
        echo "   - Insufficient permissions to access the GPU from this container"
        echo "   - NVIDIA Container Toolkit / runtime is misconfigured"
        echo ""
        echo "   Resolve the above issues and retry the CUDA overlay verification."
        exit 1
    fi
else
    echo "   ❌ nvidia-smi not found"
    echo ""
    echo "   Ensure the host has:"
    echo "   - NVIDIA drivers installed"
    echo "   - NVIDIA Container Toolkit installed and configured"
    echo "   - Docker runtime configured for NVIDIA (nvidia-ctk runtime configure)"
    exit 1
fi

echo ""
echo "✅ CUDA overlay verification complete"
