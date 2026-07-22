#!/bin/bash
# copilot-cli overlay verification script

set -e

echo "🔍 Verifying copilot-cli overlay setup..."

if ! command -v copilot &>/dev/null; then
    echo "✗ GitHub Copilot CLI is not installed or not in PATH"
    exit 1
fi

echo "✓ GitHub Copilot CLI is installed: $(copilot --version 2>/dev/null || echo 'installed')"

if copilot --help >/dev/null 2>&1; then
    echo "✓ GitHub Copilot CLI help command succeeded"
else
    echo "✗ GitHub Copilot CLI help command failed"
    exit 1
fi

echo ""
echo "✅ copilot-cli overlay verification complete!"
echo ""
echo "💡 Tips:"
echo "  - Run 'copilot --help' to explore commands"
echo "  - Run 'copilot login' for browser-based sign-in"
echo "  - For headless auth, set COPILOT_GITHUB_TOKEN, GH_TOKEN, or GITHUB_TOKEN"
