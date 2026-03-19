#!/bin/bash
# Setup script for Tilt

set -e

echo "🔧 Setting up Tilt..."

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

TILT_VERSION="${TILT_VERSION:-0.37.0}"
detect_arch
TILT_ARCH="$CS_ARCH"
# tilt uses x86_64 for amd64 in its tarball names
[ "$TILT_ARCH" = "amd64" ] && TILT_ARCH="x86_64"

echo "📦 Installing Tilt v${TILT_VERSION} for linux.${TILT_ARCH}..."
install_binary_from_tar \
    "https://github.com/tilt-dev/tilt/releases/download/v${TILT_VERSION}/tilt.${TILT_VERSION}.linux.${TILT_ARCH}.tar.gz" \
    "tilt"

# Verify installation
if command -v tilt &>/dev/null; then
    echo "✅ Tilt installed successfully"
    tilt version
else
    echo "❌ Tilt installation failed"
    exit 1
fi

echo "✅ Tilt setup complete"
echo ""
echo "ℹ️  To start Tilt, run:"
echo "   tilt up"
