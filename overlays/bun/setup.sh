#!/bin/bash
# Bun setup script - Install Bun runtime

set -e

echo "🔧 Setting up Bun development environment..."

# Install Bun with version pinning for security
echo "📦 Installing Bun..."
if ! command -v bun &> /dev/null; then
    # Pin to a specific version for security and reproducibility
    BUN_VERSION="1.1.38"
    
    # Detect architecture
    ARCH=$(uname -m)
    case $ARCH in
        x86_64)
            BUN_ARCH="x64"
            # SHA256 checksum for bun-linux-x64 v1.1.38
            BUN_CHECKSUM="a61da5357e28d4977fccd4851fed62ff4da3ea33853005c7dd93dac80bc53932"
            ;;
        aarch64|arm64)
            BUN_ARCH="aarch64"
            # SHA256 checksum for bun-linux-aarch64 v1.1.38
            BUN_CHECKSUM="3b08fd0b31f745509e1fed9c690c80d1a32ef2b3c8d059583f643f696639bd21"
            ;;
        *)
            echo "   ❌ Unsupported architecture: $ARCH"
            echo "   Bun supports x86_64 and aarch64/arm64. Your architecture is not supported."
            exit 1
            ;;
    esac
    
    BUN_URL="https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-${BUN_ARCH}.zip"
    
    echo "   Downloading Bun version ${BUN_VERSION} for ${ARCH}..."
    if ! wget "${BUN_URL}" -O /tmp/bun.zip 2>&1; then
        echo "   ❌ Failed to download Bun from ${BUN_URL}"
        exit 1
    fi
    
    # Verify checksum
    echo "   Verifying checksum..."
    echo "${BUN_CHECKSUM}  /tmp/bun.zip" | sha256sum -c - || {
        echo "   ❌ Checksum verification failed!"
        rm -f /tmp/bun.zip
        exit 1
    }
    
    # Extract and install
    unzip -q /tmp/bun.zip -d /tmp/
    mkdir -p "$HOME/.bun/bin"
    mv /tmp/bun-linux-${BUN_ARCH}/bun "$HOME/.bun/bin/"
    rm -rf /tmp/bun.zip /tmp/bun-linux-${BUN_ARCH}
    echo "   ✅ Bun installed (${BUN_VERSION})"
else
    echo "   ✅ Bun already installed"
fi

# Reload shell environment
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verify installation
if command -v bun &> /dev/null; then
    INSTALLED_VERSION=$(bun --version)
    echo "✓ Bun verified: v$INSTALLED_VERSION"
else
    echo "❌ Bun installation failed - bun command not found"
    exit 1
fi

# Install project dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing project dependencies with Bun..."
    bun install || echo "⚠️ bun install failed"
fi

echo "✓ Bun setup complete"
