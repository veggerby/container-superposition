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
# Pin to a uv-managed Python (avoids broken system Python 3.13 on Debian trixie
# where stdlib modules like shutil/os can be missing due to Debian's split packages)
UV_PYTHON_VERSION="3.12"
echo "  Ensuring uv-managed Python ${UV_PYTHON_VERSION} is available..."
uv python install --quiet "${UV_PYTHON_VERSION}"

# Install specify-cli using the uv-managed Python, not the system interpreter
uv tool install --quiet specify-cli --from git+https://github.com/github/spec-kit.git \
    --python "${UV_PYTHON_VERSION}"

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
