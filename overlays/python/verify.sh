#!/bin/bash
# Verification script for Python overlay
# Confirms Python, pip, and virtual environment are installed and functional

set -e

echo "🔍 Verifying Python overlay..."
echo ""

# Check python is installed
echo "1️⃣ Checking Python..."
if command -v python3 &> /dev/null; then
    python3 --version
    echo "   ✅ Python found"
else
    echo "   ❌ Python not found"
    exit 1
fi

# Check pip is installed
echo ""
echo "2️⃣ Checking pip..."
if command -v pip3 &> /dev/null; then
    pip3 --version
    echo "   ✅ pip found"
else
    echo "   ❌ pip not found"
    exit 1
fi

# Check venv module is available
echo ""
echo "3️⃣ Checking venv module..."
if python3 -m venv --help &> /dev/null; then
    echo "   ✅ venv module available"
else
    echo "   ❌ venv module not available"
    exit 1
fi

# Check virtual environment was created (only if we are inside a devcontainer)
echo ""
echo "4️⃣ Checking virtual environment..."
VENV_DIR="${PWD}/.venv"
if [ -d "${VENV_DIR}" ]; then
    if [ -f "${VENV_DIR}/bin/python" ]; then
        VENV_PYTHON_VERSION=$("${VENV_DIR}/bin/python" --version 2>&1)
        echo "   Virtual environment: ${VENV_DIR}"
        echo "   Python version: ${VENV_PYTHON_VERSION}"
        echo "   ✅ Virtual environment is functional"
    else
        echo "   ⚠️  Virtual environment directory exists but python not found"
        echo "   ℹ️  Run setup script to create it: bash .devcontainer/scripts/setup-python.sh"
    fi
else
    echo "   ℹ️  No .venv found — will be created on container start by setup-python.sh"
fi

echo ""
echo "✅ Python overlay verification complete"
