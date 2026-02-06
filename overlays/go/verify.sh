#!/bin/bash
# Verification script for Go overlay

set -e

echo "🔍 Verifying Go overlay..."
echo ""

# Check Go is installed
echo "1️⃣ Checking Go..."
if command -v go &> /dev/null; then
    go version
    echo "   ✅ Go found"
else
    echo "   ❌ Go not found"
    exit 1
fi

# Check gopls (Language Server)
echo ""
echo "2️⃣ Checking gopls..."
if command -v gopls &> /dev/null; then
    gopls version
    echo "   ✅ gopls found"
else
    echo "   ⚠️ gopls not found (will be installed on first use)"
fi

# Check delve (Debugger)
echo ""
echo "3️⃣ Checking delve..."
if command -v dlv &> /dev/null; then
    dlv version
    echo "   ✅ delve found"
else
    echo "   ⚠️ delve not found (will be installed on first use)"
fi

echo ""
echo "✅ Go overlay verification complete"
