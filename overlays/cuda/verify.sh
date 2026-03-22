#!/bin/bash
# Verification script for CUDA overlay
# Asserts nvidia-smi exits 0 (used by the doctor command)

set -e

echo "🔍 Verifying CUDA (NVIDIA GPU) overlay..."
echo ""

echo "1️⃣ Checking nvidia-smi..."
if command -v nvidia-smi &> /dev/null; then
    nvidia-smi --query-gpu=name,driver_version,memory.total --format=csv,noheader 2>/dev/null \
        || nvidia-smi -L
    echo "   ✅ nvidia-smi is available and GPU is accessible"
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
