#!/bin/bash
# opencode overlay verification script

set -e

echo "🔍 Verifying opencode overlay setup..."

# Check if opencode is installed
if ! command -v opencode &>/dev/null; then
    echo "✗ opencode is not installed or not in PATH"
    exit 1
fi

echo "✓ opencode is installed: $(opencode --version 2>/dev/null || echo 'installed')"

echo ""
echo "✅ opencode overlay verification complete!"
echo ""
echo "💡 Tips:"
echo "  - Run 'opencode --help' to see available commands"
echo "  - Configure your AI provider API key"
