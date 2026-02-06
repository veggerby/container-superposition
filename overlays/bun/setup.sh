#!/bin/bash
# Bun setup script - Install Bun runtime

set -e

echo "🔧 Setting up Bun development environment..."

# Install Bun with version pinning for security
echo "📦 Installing Bun..."
if ! command -v bun &> /dev/null; then
    # Pin to a specific version for security and reproducibility
    BUN_VERSION="1.1.38"
    BUN_URL="https://github.com/oven-sh/bun/releases/download/bun-v${BUN_VERSION}/bun-linux-x64.zip"
    BUN_CHECKSUM="b10d6f82bc34b1fc923aae5be5e4eac46bc33a29b5b1a70aeb85da90089e574e"
    
    echo "   Downloading Bun version ${BUN_VERSION}..."
    wget -q "${BUN_URL}" -O /tmp/bun.zip
    
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
    mv /tmp/bun-linux-x64/bun "$HOME/.bun/bin/"
    rm -rf /tmp/bun.zip /tmp/bun-linux-x64
    echo "   ✅ Bun installed (${BUN_VERSION})"
else
    echo "   ✅ Bun already installed"
fi

# Reload shell environment
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verify installation
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    echo "✓ Bun verified: v$BUN_VERSION"
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
