#!/bin/bash
# Python setup script - Virtual environment and dependency installation

set -e

# Extract overlay name from script filename (setup-<overlay>.sh -> <overlay>)
OVERLAY_NAME=$(basename "$0" | sed 's/setup-//;s/\.sh$//')

echo "🐍 Setting up Python environment..."

# Install overlay-specific packages (if requirements-overlay.txt exists)
if [ -f ".devcontainer/requirements-overlay-${OVERLAY_NAME}.txt" ]; then
    echo "📦 Installing overlay packages from requirements-overlay-${OVERLAY_NAME}.txt..."
    pip install --user -r .devcontainer/requirements-overlay-${OVERLAY_NAME}.txt
    echo "✓ Overlay packages installed"
fi

# Check if requirements.txt exists (project dependencies)
if [ -f "requirements.txt" ]; then
    echo "📦 Found requirements.txt, installing dependencies..."
    pip install --user -r requirements.txt
    echo "✓ Dependencies installed from requirements.txt"
elif [ -f "requirements-dev.txt" ]; then
    echo "📦 Found requirements-dev.txt, installing dev dependencies..."
    pip install --user -r requirements-dev.txt
    echo "✓ Dev dependencies installed from requirements-dev.txt"
fi

# Check if pyproject.toml exists (modern Python projects)
if [ -f "pyproject.toml" ]; then
    echo "📦 Found pyproject.toml, installing project..."
    pip install --user -e .
    echo "✓ Project installed in editable mode"
fi

# Check if setup.py exists (legacy Python projects)
if [ -f "setup.py" ] && [ ! -f "pyproject.toml" ]; then
    echo "📦 Found setup.py, installing project..."
    pip install --user -e .
    echo "✓ Project installed in editable mode"
fi

# Upgrade pip, setuptools, and wheel
echo "⬆️  Upgrading pip, setuptools, and wheel..."
pip install --user --upgrade pip setuptools wheel

echo "✓ Python setup complete"
