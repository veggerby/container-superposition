#!/bin/bash
# spec-kit setup — install specify-cli for Spec-Driven Development

set -e

echo "📦 Installing prerequisites for spec-kit..."

# Ensure uv is available (fast Python package manager)
if ! command -v uv &>/dev/null; then
    echo "  Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    export PATH="$HOME/.local/bin:$PATH"
fi

echo "📦 Installing specify-cli..."
# Install from the spec-kit repository; update the @ref to pin a specific release tag
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# Ensure uv tool bin directory is on PATH
export PATH="$HOME/.local/bin:$PATH"

# Verify
if command -v specify &>/dev/null; then
    echo "✓ specify-cli installed: $(specify --version 2>/dev/null || echo 'ok')"
else
    echo "✗ specify-cli installation failed"
    exit 1
fi

echo "✓ spec-kit setup complete"
echo "ℹ️  Spec Kit: https://github.com/github/spec-kit"
echo "ℹ️  Usage:  specify init <PROJECT_NAME> --ai <agent>"
echo "ℹ️  Agents: codex, claude, gemini, copilot, cursor-agent, windsurf, amp, ..."
