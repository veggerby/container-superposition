#!/bin/bash
# Bun setup script - Install Bun runtime

set -e

echo "🔧 Setting up Bun development environment..."

# Install Bun
echo "📦 Installing Bun..."
curl -fsSL https://bun.sh/install | bash || echo "⚠️ Bun installation failed"

# Reload shell environment
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Verify installation
if command -v bun &> /dev/null; then
    BUN_VERSION=$(bun --version)
    echo "✓ Bun installed: v$BUN_VERSION"
else
    echo "⚠️ Bun not found after installation"
fi

# Install project dependencies if package.json exists
if [ -f "package.json" ]; then
    echo "📦 Installing project dependencies with Bun..."
    bun install || echo "⚠️ bun install failed"
fi

echo "✓ Bun setup complete"
