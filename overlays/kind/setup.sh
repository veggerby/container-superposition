#!/bin/bash
# Setup script for kind (Kubernetes in Docker)

set -e

echo "🔧 Setting up kind (Kubernetes in Docker)..."

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        KIND_ARCH="amd64"
        ;;
    aarch64|arm64)
        KIND_ARCH="arm64"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Install kind
KIND_VERSION="${KIND_VERSION:-v0.22.0}"
echo "📦 Installing kind ${KIND_VERSION}..."

curl -Lo /tmp/kind "https://kind.sigs.k8s.io/dl/${KIND_VERSION}/kind-linux-${KIND_ARCH}"
chmod +x /tmp/kind
sudo mv /tmp/kind /usr/local/bin/kind

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
