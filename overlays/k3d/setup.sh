#!/bin/bash
# Setup script for k3d

set -e

echo "🔧 Setting up k3d..."

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

detect_arch

# Install k3d
K3D_VERSION="${K3D_VERSION:-v5.7.4}"
echo "📦 Installing k3d ${K3D_VERSION}..."

install_binary \
    "https://github.com/k3d-io/k3d/releases/download/${K3D_VERSION}/k3d-linux-${CS_ARCH}" \
    "k3d"

# Verify installation
if command -v k3d &>/dev/null; then
    echo "✅ k3d installed successfully"
    k3d version
else
    echo "❌ k3d installation failed"
    exit 1
fi

echo "✅ k3d setup complete"
echo ""
echo "ℹ️  To create a cluster, run:"
echo "   k3d cluster create dev"
