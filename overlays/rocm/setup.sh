#!/bin/bash
# ROCm overlay setup script
# Checks that rocm-smi / rocminfo is reachable inside the container and prints
# a helpful message when the host is not configured for AMD GPU passthrough.

set -e

echo "🖥️  Setting up ROCm (AMD GPU) overlay..."

if rocm-smi --showproductname >/dev/null 2>&1; then
    echo "✓ rocm-smi found: $(rocm-smi --showproductname 2>/dev/null | grep -i 'card\|gpu\|product' | head -n1 || echo 'AMD GPU detected')"
    echo "✓ ROCm overlay is ready"
elif rocminfo >/dev/null 2>&1; then
    echo "✓ rocminfo found: $(rocminfo 2>/dev/null | grep 'Marketing Name' | head -n1 | sed 's/.*: *//' || echo 'AMD GPU detected')"
    echo "✓ ROCm overlay is ready"
else
    echo ""
    echo "⚠️  Neither rocm-smi nor rocminfo is functioning inside the container."
    echo ""
    echo "   AMD GPU passthrough requires the following on the host:"
    echo "   1. A supported AMD GPU (RDNA 2+ or CDNA — check the compatibility matrix:"
    echo "      https://rocm.docs.amd.com/en/latest/compatibility/compatibility-matrix.html)"
    echo "   2. AMD GPU drivers (amdgpu) installed on the host"
    echo "   3. ROCm runtime installed on the host (or bundled in the container image)"
    echo "   4. Your user added to the 'render' and 'video' groups:"
    echo "      sudo usermod -aG render,video \$USER"
    echo "   5. /dev/kfd and /dev/dri devices accessible in the container"
    echo ""
    echo "   This overlay adds the following to the container's runArgs:"
    echo "     --device=/dev/kfd  --device=/dev/dri"
    echo "     --group-add=video  --group-add=render"
    echo "   but it cannot install or replace host drivers."
    echo ""
    echo "   Once the host is configured, rebuild the dev container."
    echo ""
    echo "ℹ️  ROCm overlay setup complete (rocm-smi not functioning on this host)"
fi
