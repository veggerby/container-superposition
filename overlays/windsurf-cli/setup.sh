#!/bin/bash
# windsurf-cli setup script - Install Codeium Windsurf CLI

set -e

echo "📦 Installing Codeium Windsurf CLI..."

# Windsurf CLI is distributed as a binary release from GitHub, not via npm
ARCH=$(uname -m)
case "$ARCH" in
    x86_64)  ARCH_TAG="x86_64" ;;
    aarch64|arm64) ARCH_TAG="aarch64" ;;
    *) echo "⚠️  Unsupported architecture: $ARCH, skipping windsurf-cli installation"; exit 0 ;;
esac

WINDSURF_VERSION=$(curl -fsSL https://api.github.com/repos/codeium-ai/windsurf-cli/releases/latest 2>/dev/null | grep '"tag_name"' | head -1 | sed 's/.*"tag_name": *"\([^"]*\)".*/\1/')

if [ -z "$WINDSURF_VERSION" ]; then
    echo "⚠️  Could not determine latest windsurf-cli version, trying known stable"
    WINDSURF_VERSION="v0.1.0"
fi

echo "  Downloading windsurf-cli ${WINDSURF_VERSION} for ${ARCH_TAG}..."
DOWNLOAD_URL="https://github.com/codeium-ai/windsurf-cli/releases/download/${WINDSURF_VERSION}/windsurf-linux-${ARCH_TAG}"

if curl -fsSL --head "$DOWNLOAD_URL" >/dev/null 2>&1; then
    curl -fsSL "$DOWNLOAD_URL" -o /tmp/windsurf
    sudo install -m 0755 /tmp/windsurf /usr/local/bin/windsurf
    rm -f /tmp/windsurf
else
    echo "⚠️  windsurf-cli binary not available for this platform — skipping"
    exit 0
fi

# Verify installation
if command -v windsurf &>/dev/null; then
    echo "✓ Windsurf CLI installed successfully: $(windsurf --version 2>/dev/null || echo 'installed')"
else
    echo "⚠️  windsurf-cli not found after install — may need a shell restart"
fi

echo "✓ windsurf-cli setup complete"
echo "ℹ️  Codeium Windsurf: https://docs.codeium.com/windsurf/getting-started"
echo "ℹ️  Run 'windsurf --help' to get started"
