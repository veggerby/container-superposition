#!/bin/bash
# amp overlay verification script

set -e

echo "🔍 Verifying amp overlay setup..."

# Check if amp CLI is installed
if ! command -v amp &>/dev/null; then
    echo "✗ amp CLI is not installed or not in PATH"
    exit 1
fi

echo "✓ amp CLI is installed: $(amp --version 2>/dev/null || echo 'installed')"

echo ""
echo "✅ amp overlay verification complete!"
echo ""
echo "💡 Tips:"
echo "  - Run 'amp --help' to see available commands"
echo "  - Authenticate with your Sourcegraph account"
