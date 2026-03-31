#!/bin/bash
# Setup script for Skaffold

set -e

echo "🔧 Setting up Skaffold..."

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

detect_arch

SKAFFOLD_VERSION="${SKAFFOLD_VERSION:-v2.13.2}"
echo "📦 Installing Skaffold ${SKAFFOLD_VERSION}..."

install_binary \
    "https://storage.googleapis.com/skaffold/releases/${SKAFFOLD_VERSION}/skaffold-linux-${CS_ARCH}" \
    "skaffold"

# Verify installation
if command -v skaffold &>/dev/null; then
    echo "✅ Skaffold installed successfully"
    skaffold version
else
    echo "❌ Skaffold installation failed"
    exit 1
fi

echo "✅ Skaffold setup complete"
echo ""
echo "ℹ️  To start continuous development, run:"
echo "   skaffold dev"
