#!/bin/bash
# mkdocs2 setup script — install MkDocs 2.0 pre-release from encode/mkdocs

set -e

echo "📚 Setting up MkDocs 2.0 (encode/mkdocs)..."

# Always install into the workspace virtual environment.
# The Python overlay is declared as a hard dependency (requires: [python]) so
# its setup script should have run first; but if the .venv doesn't exist yet
# (e.g., ordering edge-case) we create it here so this script is self-contained.
VENV_DIR="${PWD}/.venv"

# Helper: validate that the venv's Python interpreter is actually executable.
venv_is_valid() {
    "${VENV_DIR}/bin/python" -c "import sys" &>/dev/null
}

if [ -d "${VENV_DIR}" ]; then
    if venv_is_valid; then
        echo "  Using virtual environment: ${VENV_DIR}"
    else
        echo "⚠️  Existing .venv is invalid (stale interpreter or broken site-packages), recreating..."
        rm -rf "${VENV_DIR}"
    fi
else
    # Also handle the case where the directory listing showed site-packages exists
    # but venv_is_valid failed — this handles partial/corrupted venvs
    : # nothing to do, venv doesn't exist yet
fi

# If the venv directory exists but python fails with EEXIST on site-packages,
# it is a leftover from a previous interrupted run — recreate it.
if [ -d "${VENV_DIR}" ] && ! "${VENV_DIR}/bin/python" -m pip --version &>/dev/null; then
    echo "⚠️  Existing .venv has broken pip, recreating..."
    rm -rf "${VENV_DIR}"
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

echo "📦 Installing MkDocs 2.0 from encode/mkdocs..."
"${PYTHON}" -m pip install --no-cache-dir \
    "mkdocs @ git+https://github.com/encode/mkdocs.git"

MKDOCS_BIN="${VENV_DIR}/bin/mkdocs"
if [ -x "${MKDOCS_BIN}" ]; then
    echo "✓ $( "${MKDOCS_BIN}" --version 2>/dev/null || echo 'mkdocs 2.0' )"
else
    echo "✗ mkdocs not found in ${VENV_DIR}/bin after installation"
    exit 1
fi

echo "✅ MkDocs 2.0 setup complete"
echo "ℹ️  Start dev server: mkdocs serve"
echo "ℹ️  Build static site:  mkdocs build"
