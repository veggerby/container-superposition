#!/bin/bash
# Python setup script - Create virtual environment and install dependencies

set -e

# Extract overlay name from script filename (setup-<overlay>.sh -> <overlay>)
OVERLAY_NAME=$(basename "$0" | sed 's/setup-//;s/\.sh$//')

echo "🐍 Setting up Python virtual environment..."

# Determine workspace root (script is run from workspace root via postCreateCommand)
WORKSPACE_ROOT="${PWD}"
VENV_DIR="${WORKSPACE_ROOT}/.venv"

# Create virtual environment if it doesn't exist
# Helper: validate that the venv's Python interpreter is actually executable.
# A stale .venv (e.g., leftover from a previous container build) can have a
# bin/python that is a dangling symlink, causing "cannot execute: required
# file not found" when pip or other venv scripts are invoked.
venv_is_valid() {
    "${VENV_DIR}/bin/python" -c "import sys" &>/dev/null
}

if [ -d "${VENV_DIR}" ]; then
    if venv_is_valid; then
        echo "✓ Virtual environment already exists at .venv"
    else
        echo "⚠️  Existing .venv is invalid (stale interpreter), recreating..."
        rm -rf "${VENV_DIR}"
    fi
fi

if [ ! -d "${VENV_DIR}" ]; then
    echo "📦 Creating virtual environment at .venv..."
    if ! command -v python3 >/dev/null 2>&1; then
        echo "❌ python3 is not available on PATH. Please ensure python3 is installed."
        exit 1
    fi
    python3 -m venv "${VENV_DIR}"
    echo "✓ Virtual environment created"
fi

# Use the venv's Python directly to invoke pip — this is more robust than
# calling the pip wrapper script, whose shebang can point to a stale path.
PYTHON="${VENV_DIR}/bin/python"

# Activate virtual environment for PATH and VIRTUAL_ENV
# shellcheck source=/dev/null
source "${VENV_DIR}/bin/activate"

# Upgrade pip, setuptools, and wheel inside the venv
echo "⬆️  Upgrading pip, setuptools, and wheel..."
"${PYTHON}" -m pip install --upgrade pip setuptools wheel
echo "✓ pip, setuptools, and wheel upgraded"

# Install overlay-specific packages (if requirements-overlay.txt exists)
if [ -f ".devcontainer/requirements-overlay-${OVERLAY_NAME}.txt" ]; then
    echo "📦 Installing overlay packages from requirements-overlay-${OVERLAY_NAME}.txt..."
    "${PYTHON}" -m pip install -r ".devcontainer/requirements-overlay-${OVERLAY_NAME}.txt"
    echo "✓ Overlay packages installed"
fi

# Install from root requirements.txt (project production dependencies)
if [ -f "requirements.txt" ]; then
    echo "📦 Installing dependencies from requirements.txt..."
    "${PYTHON}" -m pip install -r requirements.txt
    echo "✓ Dependencies installed from requirements.txt"
fi

# Install from requirements-dev.txt (project development dependencies)
if [ -f "requirements-dev.txt" ]; then
    echo "📦 Installing dev dependencies from requirements-dev.txt..."
    "${PYTHON}" -m pip install -r requirements-dev.txt
    echo "✓ Dev dependencies installed from requirements-dev.txt"
fi

# Install project in editable mode if pyproject.toml exists (modern Python projects)
if [ -f "pyproject.toml" ]; then
    echo "📦 Found pyproject.toml, installing project in editable mode..."
    "${PYTHON}" -m pip install -e .
    echo "✓ Project installed in editable mode"
elif [ -f "setup.py" ]; then
    # Fallback for legacy Python projects
    echo "📦 Found setup.py, installing project in editable mode..."
    "${PYTHON}" -m pip install -e .
    echo "✓ Project installed in editable mode"
fi

echo ""
echo "✓ Python virtual environment setup complete"
echo "  Virtual environment: ${VENV_DIR}"
echo "  Python interpreter: ${VENV_DIR}/bin/python"
echo "  Activate manually:  source .venv/bin/activate"
