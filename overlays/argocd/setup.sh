#!/bin/bash
# Setup script for Argo CD CLI

set -e

echo "🔧 Setting up Argo CD CLI..."

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

detect_arch

ARGOCD_VERSION="${ARGOCD_VERSION:-v2.14.12}"
echo "📦 Installing argocd ${ARGOCD_VERSION}..."

install_binary \
    "https://github.com/argoproj/argo-cd/releases/download/${ARGOCD_VERSION}/argocd-linux-${CS_ARCH}" \
    "argocd"

if command -v argocd >/dev/null 2>&1; then
    echo "✅ Argo CD CLI installed successfully"
    argocd version --client --short || argocd version --client
else
    echo "❌ Argo CD CLI installation failed"
    exit 1
fi

echo "✅ Argo CD CLI setup complete"
