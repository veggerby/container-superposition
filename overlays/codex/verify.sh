#!/bin/bash
# Codex overlay verification script

set -e

echo "🔍 Verifying Codex overlay setup..."

# Check if codex CLI is installed
if ! command -v codex &> /dev/null; then
    echo "✗ codex CLI is not installed or not in PATH"
    exit 1
fi

echo "✓ codex CLI is installed: $(codex --version 2>/dev/null || echo 'installed')"

# Check CODEX_HOME directory exists
if [ -d "$HOME/.codex" ]; then
    echo "✓ .codex directory exists: $HOME/.codex"
else
    echo "⚠️  .codex directory not found"
fi

echo ""
echo "✅ Codex overlay verification complete!"
echo ""

echo "💡 Tips:"
echo "  - Install global packages: pnpm add -g <package>"
echo "  - View global packages: pnpm list -g"
echo "  - Global bin directory: $PNPM_BIN_DIR"
