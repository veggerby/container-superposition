#!/bin/bash
# windsurf-cli overlay verification script

set -e

echo "🔍 Verifying windsurf-cli overlay setup..."

# Check if windsurf CLI is installed
if ! command -v windsurf &>/dev/null; then
    echo "✗ windsurf CLI is not installed or not in PATH"
    exit 1
fi

echo "✓ windsurf CLI is installed: $(windsurf --version 2>/dev/null || echo 'installed')"

echo ""
echo "✅ windsurf-cli overlay verification complete!"
echo ""
echo "💡 Tips:"
echo "  - Run 'windsurf --help' to see available commands"
echo "  - Authenticate with your Codeium account"
