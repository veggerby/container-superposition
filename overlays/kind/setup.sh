#!/bin/bash
# Setup script for kind (Kubernetes in Docker)

set -e

echo "🔧 Setting up kind (Kubernetes in Docker)..."

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

detect_arch

# Install kind
KIND_VERSION="${KIND_VERSION:-v0.22.0}"
echo "📦 Installing kind ${KIND_VERSION}..."

install_binary \
    "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-${ARCH_AMD64_ARM64}" \
    "kind"

# Verify installation
if command -v kind &> /dev/null; then
    echo "✅ kind installed successfully"
    kind version
else
    echo "❌ kind installation failed"
    exit 1
fi

echo "✅ kind setup complete"
echo ""
echo "ℹ️  To create a cluster, run:"
echo "   kind create cluster --name dev"
