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
if [ ! -d "${VENV_DIR}" ]; then
    echo "📦 Creating virtual environment at .venv..."
    python -m venv "${VENV_DIR}"
    echo "✓ Virtual environment created"
else
    echo "✓ Virtual environment already exists at .venv"
fi

# Activate virtual environment
# shellcheck source=/dev/null
source "${VENV_DIR}/bin/activate"

# Upgrade pip, setuptools, and wheel inside the venv
echo "⬆️  Upgrading pip, setuptools, and wheel..."
pip install --upgrade pip setuptools wheel
echo "✓ pip, setuptools, and wheel upgraded"

# Install overlay-specific packages (if requirements-overlay.txt exists)
if [ -f ".devcontainer/requirements-overlay-${OVERLAY_NAME}.txt" ]; then
    echo "📦 Installing overlay packages from requirements-overlay-${OVERLAY_NAME}.txt..."
    pip install -r ".devcontainer/requirements-overlay-${OVERLAY_NAME}.txt"
    echo "✓ Overlay packages installed"
fi

# Install from root requirements.txt (project production dependencies)
if [ -f "requirements.txt" ]; then
    echo "📦 Installing dependencies from requirements.txt..."
    pip install -r requirements.txt
    echo "✓ Dependencies installed from requirements.txt"
fi

# Install from requirements-dev.txt (project development dependencies)
if [ -f "requirements-dev.txt" ]; then
    echo "📦 Installing dev dependencies from requirements-dev.txt..."
    pip install -r requirements-dev.txt
    echo "✓ Dev dependencies installed from requirements-dev.txt"
fi

# Install project in editable mode if pyproject.toml exists (modern Python projects)
if [ -f "pyproject.toml" ]; then
    echo "📦 Found pyproject.toml, installing project in editable mode..."
    pip install -e .
    echo "✓ Project installed in editable mode"
elif [ -f "setup.py" ]; then
    # Fallback for legacy Python projects
    echo "📦 Found setup.py, installing project in editable mode..."
    pip install -e .
    echo "✓ Project installed in editable mode"
fi

echo ""
echo "✓ Python virtual environment setup complete"
echo "  Virtual environment: ${VENV_DIR}"
echo "  Python interpreter: ${VENV_DIR}/bin/python"
echo "  Activate manually:  source .venv/bin/activate"
