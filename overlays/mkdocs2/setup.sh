#!/bin/bash
# mkdocs2 setup script — install MkDocs 2.x with Material theme and common plugins

set -e

echo "📚 Setting up MkDocs 2.x..."

# Prefer the workspace .venv created by the Python overlay when available,
# otherwise fall back to the system pip (--break-system-packages for PEP 668
# environments such as Debian bookworm/trixie).
if [ -f "${PWD}/.venv/bin/pip" ]; then
    PIP="${PWD}/.venv/bin/pip"
    echo "  Using virtual environment: ${PWD}/.venv"
elif command -v pip3 &>/dev/null; then
    PIP="pip3"
else
    PIP="pip"
fi

echo "📦 Installing MkDocs 2.x packages..."
"${PIP}" install --no-cache-dir \
    "mkdocs>=2.0,<3.0" \
    "mkdocs-material>=9.0" \
    "mkdocs-minify-plugin" \
    "mkdocs-redirects" \
    "pymdown-extensions"

# Verify installation
if command -v mkdocs &>/dev/null; then
    echo "✓ mkdocs $(mkdocs --version)"
elif [ -f "${PWD}/.venv/bin/mkdocs" ]; then
    echo "✓ mkdocs $("${PWD}/.venv/bin/mkdocs" --version)"
else
    echo "✗ mkdocs not found on PATH after installation"
    exit 1
fi

echo "✅ MkDocs 2.x setup complete"
echo "ℹ️  Start dev server: mkdocs serve"
echo "ℹ️  Build static site:  mkdocs build"
