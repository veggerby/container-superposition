#!/bin/bash
# claude-code overlay verification script

set -e

echo "🔍 Verifying claude-code overlay setup..."

# Check if claude CLI is installed
if ! command -v claude &>/dev/null; then
    echo "✗ claude CLI is not installed or not in PATH"
    exit 1
fi

echo "✓ claude CLI is installed: $(claude --version 2>/dev/null || echo 'installed')"

echo ""
echo "✅ claude-code overlay verification complete!"
echo ""
echo "💡 Tips:"
echo "  - Run 'claude --help' to see available commands"
echo "  - Authenticate with: claude auth"
