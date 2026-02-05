#!/bin/bash
# Verification script for Python overlay
# Confirms Python and pip are installed

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

echo ""
echo "✅ Python overlay verification complete"
