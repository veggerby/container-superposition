#!/bin/bash
# Verification script for Skaffold overlay
# Confirms Skaffold is installed

set -e

echo "🔍 Verifying Skaffold overlay..."
echo ""

# Check Skaffold is installed
echo "1️⃣ Checking Skaffold installation..."
if command -v skaffold &>/dev/null; then
    skaffold version
    echo "   ✅ Skaffold is installed"
else
    echo "   ❌ Skaffold is not installed"
    exit 1
fi

echo ""
echo "✅ Skaffold overlay verification complete"
echo ""
echo "ℹ️  To start continuous development, run:"
echo "   skaffold dev"
