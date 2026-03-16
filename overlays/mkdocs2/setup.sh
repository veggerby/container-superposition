#!/bin/bash
# mkdocs2 setup script — install MkDocs 2.x with Material theme and common plugins

set -e

echo "📚 Setting up MkDocs 2.x..."

# Always install into the workspace virtual environment.
# The Python overlay is declared as a hard dependency (requires: [python]) so
# its setup script should have run first; but if the .venv doesn't exist yet
# (e.g., ordering edge-case) we create it here so this script is self-contained.
VENV_DIR="${PWD}/.venv"

if [ ! -d "${VENV_DIR}" ]; then
    echo "📦 Creating virtual environment at .venv (python overlay may not have run yet)..."
    if ! command -v python3 &>/dev/null; then
        echo "❌ python3 is not available. Please ensure the python overlay is included."
        exit 1
    fi
    python3 -m venv "${VENV_DIR}"
    echo "✓ Virtual environment created"
else
    echo "  Using virtual environment: ${VENV_DIR}"
fi

PIP="${VENV_DIR}/bin/pip"

echo "📦 Installing MkDocs 2.x packages..."
"${PIP}" install --no-cache-dir \
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
