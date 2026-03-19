#!/bin/bash
# Setup script for Tilt

set -e

echo "🔧 Setting up Tilt..."

TILT_VERSION="${TILT_VERSION:-0.37.0}"
ARCH=$(uname -m)
case "$ARCH" in
    x86_64)  TILT_ARCH="x86_64" ;;
    aarch64|arm64) TILT_ARCH="arm64" ;;
    *) echo "⚠️  Unsupported architecture: $ARCH"; exit 1 ;;
esac

OS="linux"

echo "📦 Installing Tilt v${TILT_VERSION} for ${OS}.${TILT_ARCH}..."
TARBALL="tilt.${TILT_VERSION}.${OS}.${TILT_ARCH}.tar.gz"
URL="https://github.com/tilt-dev/tilt/releases/download/v${TILT_VERSION}/${TARBALL}"

# Download to a known temp directory so we can find the extracted binary
TMPDIR=$(mktemp -d)
trap 'rm -rf "$TMPDIR"' EXIT

curl -fsSL "$URL" -o "${TMPDIR}/${TARBALL}"
tar -xzf "${TMPDIR}/${TARBALL}" -C "${TMPDIR}" tilt

sudo install -m 0755 "${TMPDIR}/tilt" /usr/local/bin/tilt

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
