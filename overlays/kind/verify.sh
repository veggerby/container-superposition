#!/bin/bash
# Verification script for kind overlay
# Confirms kind is installed

set -e

echo "🔍 Verifying kind overlay..."
echo ""

# Check kind is installed
echo "1️⃣ Checking kind installation..."
if command -v kind &> /dev/null; then
    kind version
    echo "   ✅ kind is installed"
else
    echo "   ❌ kind is not installed"
    exit 1
fi

# Check Docker is available (required for kind)
echo ""
echo "2️⃣ Checking Docker availability..."
if command -v docker &> /dev/null; then
    docker version --format '{{.Server.Version}}' &> /dev/null
    if [ $? -eq 0 ]; then
        echo "   ✅ Docker is available"
    else
        echo "   ❌ Docker daemon not accessible"
        exit 1
    fi
else
    echo "   ❌ Docker CLI not found"
    exit 1
fi

echo ""
echo "✅ kind overlay verification complete"
echo ""
echo "ℹ️  To create a cluster, run:"
echo "   kind create cluster --name dev"
