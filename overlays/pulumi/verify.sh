#!/bin/bash
# Verification script for Pulumi overlay
# Confirms Pulumi is installed

set -e

echo "🔍 Verifying Pulumi overlay..."
echo ""

# Check pulumi is installed
echo "1️⃣ Checking Pulumi CLI..."
if command -v pulumi &> /dev/null; then
    pulumi version
    echo "   ✅ Pulumi CLI found"
else
    echo "   ❌ Pulumi CLI not found"
    exit 1
fi

# Test basic pulumi functionality
echo ""
echo "2️⃣ Testing Pulumi functionality..."
if pulumi about > /dev/null 2>&1; then
    echo "   ✅ Pulumi 'about' command successful"
else
    echo "   ❌ Pulumi 'about' command failed"
    exit 1
fi

echo ""
echo "✅ Pulumi overlay verification complete"
