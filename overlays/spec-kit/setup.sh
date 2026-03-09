#!/bin/bash
# spec-kit setup — install specify-cli for Spec-Driven Development

set -e

echo "📦 Installing prerequisites for spec-kit..."

# Ensure uv tool bin directory is always on PATH (uv puts shims here regardless
# of whether uv itself was pre-installed or freshly installed in this script)
export PATH="$HOME/.local/bin:$PATH"

# Ensure uv is available (fast Python package manager)
if ! command -v uv &>/dev/null; then
    echo "  Installing uv..."
    curl -LsSf https://astral.sh/uv/install.sh | sh
    # Re-source in case the installer wrote to a non-standard location
    export PATH="$HOME/.cargo/bin:$HOME/.local/bin:$PATH"
fi

echo "📦 Installing specify-cli..."
# Install from the spec-kit repository; update the @ref to pin a specific release tag
uv tool install specify-cli --from git+https://github.com/github/spec-kit.git

# Verify — use the full path as a fallback in case the shim dir is not yet in PATH
SPECIFY_BIN="$(uv tool dir 2>/dev/null)/specify-cli/bin/specify"
if command -v specify &>/dev/null; then
    echo "✓ specify-cli installed: $(specify --version 2>/dev/null || echo 'ok')"
elif [ -x "$SPECIFY_BIN" ]; then
    echo "✓ specify-cli installed at $SPECIFY_BIN (add ~/.local/bin to PATH)"
else
    echo "✗ specify-cli installation failed"
    exit 1
fi

echo "✓ spec-kit setup complete"
echo "ℹ️  Spec Kit: https://github.com/github/spec-kit"
echo "ℹ️  Usage:  specify init <PROJECT_NAME> --ai <agent>"
echo "ℹ️  Agents: codex, claude, gemini, copilot, cursor-agent, windsurf, amp, ..."
