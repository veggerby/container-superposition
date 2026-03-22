#!/bin/bash
# Verification script for ROCm overlay
# Asserts rocm-smi exits 0 (used by the doctor command)

set -e

echo "🔍 Verifying ROCm (AMD GPU) overlay..."
echo ""

echo "1️⃣ Checking rocm-smi..."
if command -v rocm-smi &> /dev/null; then
    if rocm-smi --showproductname 2>/dev/null; then
        echo "   ✅ rocm-smi is available and AMD GPU is accessible"
    elif rocm-smi 2>/dev/null; then
        echo "   ✅ rocm-smi is available and AMD GPU is accessible"
    else
        echo "   ❌ rocm-smi is installed but failed to query GPU information"
        echo ""
        echo "   Possible causes:"
        echo "   - AMD GPU driver (amdgpu) is not loaded on the host"
        echo "   - /dev/kfd or /dev/dri is not accessible in this container"
        echo "   - Container user is not in the 'render' or 'video' group"
        echo "   - ROCm version mismatch between container image and host kernel"
        echo ""
        echo "   Resolve the above issues and retry the ROCm overlay verification."
        exit 1
    fi
else
    echo "   ❌ rocm-smi not found"
    echo ""
    echo "   Ensure the host has:"
    echo "   - AMD GPU drivers (amdgpu) installed"
    echo "   - ROCm runtime installed on the host or bundled in the container image"
    echo "   - /dev/kfd and /dev/dri accessible in the container"
    echo "   - Container user in the 'render' and 'video' groups"
    exit 1
fi

echo ""
echo "✅ ROCm overlay verification complete"
