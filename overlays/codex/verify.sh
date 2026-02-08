#!/bin/bash
# Codex overlay verification script

set -e

echo "🔍 Verifying Codex overlay setup..."

# Check if pnpm is installed
if ! command -v pnpm &> /dev/null; then
    echo "✗ pnpm is not installed or not in PATH"
    echo "  Try: source ~/.bashrc (or ~/.zshrc)"
    exit 1
fi

echo "✓ pnpm is installed: $(pnpm --version)"

# Check PATH includes PNPM_HOME
if [[ ":$PATH:" == *":$HOME/.local/share/pnpm:"* ]]; then
    echo "✓ PNPM_HOME is in PATH"
else
    echo "⚠️  PNPM_HOME may not be in PATH"
    echo "  Current PATH: $PATH"
fi

# Check PNPM_HOME environment variable
if [ -n "$PNPM_HOME" ]; then
    echo "✓ PNPM_HOME is set: $PNPM_HOME"
else
    echo "⚠️  PNPM_HOME environment variable is not set"
fi

# Check CODEX_HOME directory exists
if [ -d "$HOME/.codex" ]; then
    echo "✓ .codex directory exists: $HOME/.codex"
else
    echo "⚠️  .codex directory not found"
fi

# Check if pnpm config is accessible
if pnpm config get global-bin-dir &> /dev/null; then
    PNPM_BIN_DIR=$(pnpm config get global-bin-dir)
    echo "✓ pnpm global bin directory: $PNPM_BIN_DIR"
else
    echo "⚠️  Could not get pnpm global bin directory"
fi

# Test pnpm functionality
echo ""
echo "📦 Testing pnpm functionality..."

# Try to list global packages
if pnpm list -g --depth=0 &> /dev/null; then
    echo "✓ pnpm can list global packages"
    echo "  Installed global packages:"
    pnpm list -g --depth=0 | grep -v "^Legend:" | head -5
else
    echo "⚠️  Could not list global packages"
fi

echo ""
echo "✅ Codex overlay verification complete!"
echo ""
echo "💡 Tips:"
echo "  - Install global packages: pnpm add -g <package>"
echo "  - View global packages: pnpm list -g"
echo "  - Global bin directory: $PNPM_BIN_DIR"
