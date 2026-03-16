#!/bin/bash
# mkdocs2 setup script — install MkDocs 2.x with Material theme and common plugins

set -e

echo "📚 Setting up MkDocs 2.x..."

# Always install into the workspace virtual environment.
# The Python overlay is declared as a hard dependency (requires: [python]) so
# its setup script should have run first; but if the .venv doesn't exist yet
# (e.g., ordering edge-case) we create it here so this script is self-contained.
VENV_DIR="${PWD}/.venv"

# Helper: validate that the venv's Python interpreter is actually executable.
# A stale .venv (e.g., leftover from a previous container build) can have a
# bin/python that is a dangling symlink or points to a Python version that no
# longer exists, which causes "cannot execute: required file not found" when
# any script inside the venv (including pip) is invoked.
venv_is_valid() {
    "${VENV_DIR}/bin/python" -c "import sys" &>/dev/null
}

if [ -d "${VENV_DIR}" ]; then
    if venv_is_valid; then
        echo "  Using virtual environment: ${VENV_DIR}"
    else
        echo "⚠️  Existing .venv is invalid (stale interpreter), recreating..."
        rm -rf "${VENV_DIR}"
    fi
fi

if [ ! -d "${VENV_DIR}" ]; then
    echo "📦 Creating virtual environment at .venv..."
    if ! command -v python3 &>/dev/null; then
        echo "❌ python3 is not available. Please ensure the python overlay is included."
        exit 1
    fi
    python3 -m venv "${VENV_DIR}"
    echo "✓ Virtual environment created"
fi

# Use the venv's Python directly to invoke pip — this is more robust than
# calling the pip wrapper script, whose shebang can point to a stale path.
PYTHON="${VENV_DIR}/bin/python"

echo "📦 Installing MkDocs 2.x packages..."
"${PYTHON}" -m pip install --no-cache-dir \
    "mkdocs>=2.0,<3.0" \
    "mkdocs-material>=9.0" \
    "mkdocs-minify-plugin" \
    "mkdocs-redirects" \
    "pymdown-extensions"

MKDOCS_BIN="${VENV_DIR}/bin/mkdocs"
if [ -x "${MKDOCS_BIN}" ]; then
    echo "✓ $("${MKDOCS_BIN}" --version)"
else
    echo "✗ mkdocs not found in ${VENV_DIR}/bin after installation"
    exit 1
fi

echo "✅ MkDocs 2.x setup complete"
echo "ℹ️  Start dev server: mkdocs serve"
echo "ℹ️  Build static site:  mkdocs build"
