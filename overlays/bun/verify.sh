#!/bin/bash
# Verification script for Bun overlay

set -e

echo "🔍 Verifying Bun overlay..."
echo ""

# Check Bun is installed
echo "1️⃣ Checking Bun..."
if command -v bun &> /dev/null; then
    bun --version
    echo "   ✅ Bun found"
else
    echo "   ❌ Bun not found"
    exit 1
fi

# Check Node.js is available (for compatibility)
echo ""
echo "2️⃣ Checking Node.js (for compatibility)..."
if command -v node &> /dev/null; then
    node --version
    echo "   ✅ Node.js found (for compatibility)"
else
    echo "   ⚠️ Node.js not found (optional)"
fi

echo ""
echo "✅ Bun overlay verification complete"
