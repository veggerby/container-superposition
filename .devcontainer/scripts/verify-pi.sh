#!/bin/bash
# pi overlay verification script

set -e

echo "🔍 Verifying pi overlay setup..."

# Check if pi CLI is installed
if ! command -v pi &>/dev/null; then
    echo "✗ pi is not installed or not in PATH"
    exit 1
fi

echo "✓ pi is installed: $(pi --version 2>/dev/null || echo 'installed')"

echo ""
echo "✅ pi overlay verification complete!"
echo ""
echo "💡 Tips:"
echo "  - Run 'pi' in any project directory to start an interactive session"
echo "  - Run 'pi --help' to see available commands"
echo "  - Run 'pi -p \"<prompt>\"' for a non-interactive one-shot prompt"
echo "  - Set ANTHROPIC_API_KEY, OPENAI_API_KEY, or GEMINI_API_KEY to authenticate"
