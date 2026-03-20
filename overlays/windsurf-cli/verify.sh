#!/bin/bash
# windsurf-cli overlay verification script

set -e

echo "🔍 Verifying windsurf-cli overlay setup..."

# windsurf-cli is a best-effort install — it is skipped on unsupported platforms
# (arm64 Linux). Exit 0 gracefully when it was intentionally not installed.
if ! command -v windsurf &>/dev/null; then
    ARCH=$(uname -m)
    case "$ARCH" in
        aarch64|arm64)
            echo "ℹ️  windsurf-cli skipped (not available for $ARCH)"
            exit 0
            ;;
        *)
            echo "✗ windsurf CLI is not installed or not in PATH"
            exit 1
            ;;
    esac
fi

echo "✓ windsurf CLI is installed: $(windsurf --version 2>/dev/null || echo 'installed')"

echo ""
echo "✅ windsurf-cli overlay verification complete!"
echo ""
echo "💡 Tips:"
echo "  - Run 'windsurf --help' to see available commands"
echo "  - Authenticate with your Codeium account"
