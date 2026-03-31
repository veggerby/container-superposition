#!/bin/bash
# Verification script for k3d overlay
# Confirms k3d is installed

set -e

echo "🔍 Verifying k3d overlay..."
echo ""

# Check k3d is installed
echo "1️⃣ Checking k3d installation..."
if command -v k3d &>/dev/null; then
    k3d version
    echo "   ✅ k3d is installed"
else
    echo "   ❌ k3d is not installed"
    exit 1
fi

# Check Docker is available (required for k3d)
echo ""
echo "2️⃣ Checking Docker availability..."
if ! command -v docker &>/dev/null; then
    echo "   ❌ Docker CLI not found"
    exit 1
fi
if docker version --format '{{.Server.Version}}' &>/dev/null; then
    echo "   ✅ Docker is available"
else
    echo "   ❌ Docker daemon not accessible"
    exit 1
fi

echo ""
echo "✅ k3d overlay verification complete"
echo ""
echo "ℹ️  To create a cluster, run:"
echo "   k3d cluster create dev"
