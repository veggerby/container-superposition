#!/bin/bash
# Verification script for Tilt overlay
# Confirms Tilt is installed

set -e

echo "🔍 Verifying Tilt overlay..."
echo ""

# Check Tilt is installed
echo "1️⃣ Checking Tilt installation..."
if command -v tilt &> /dev/null; then
    tilt version
    echo "   ✅ Tilt is installed"
else
    echo "   ❌ Tilt is not installed"
    exit 1
fi

echo ""
echo "✅ Tilt overlay verification complete"
echo ""
echo "ℹ️  To start Tilt, run:"
echo "   tilt up"
