#!/bin/bash
# gemini-cli overlay verification script

set -e

echo "🔍 Verifying gemini-cli overlay setup..."

# Check if gemini CLI is installed
if ! command -v gemini &>/dev/null; then
    echo "✗ gemini CLI is not installed or not in PATH"
    exit 1
fi

echo "✓ gemini CLI is installed: $(gemini --version 2>/dev/null || echo 'installed')"

echo ""
echo "✅ gemini-cli overlay verification complete!"
echo ""
echo "💡 Tips:"
echo "  - Run 'gemini --help' to see available commands"
echo "  - Authenticate with your Google account or API key"
