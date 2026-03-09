#!/bin/bash
# spec-kit overlay verification script

set -e

echo "🔍 Verifying spec-kit overlay setup..."

# Check uv is available
if ! command -v uv &>/dev/null; then
    echo "✗ uv not found"
    exit 1
fi

echo "✓ uv is installed: $(uv --version 2>/dev/null || echo 'installed')"

# Check specify CLI is available
if ! command -v specify &>/dev/null; then
    echo "✗ specify not found"
    exit 1
fi

echo "✓ specify is installed: $(specify --version 2>/dev/null || echo 'installed')"

echo ""
echo "✅ spec-kit overlay verification complete!"
echo ""
echo "💡 Tips:"
echo "  - Run 'specify --help' to see available commands"
echo "  - Initialize a project: specify init <PROJECT_NAME> --ai <agent>"
echo "  - Supported agents: codex, claude, gemini, copilot, cursor-agent, windsurf, amp, ..."
