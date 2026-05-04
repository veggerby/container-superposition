#!/bin/bash
# Verification script for Argo CD CLI overlay

set -e

echo "🔍 Verifying Argo CD CLI overlay..."

if command -v argocd >/dev/null 2>&1; then
    argocd version --client --short || argocd version --client
    echo "✅ Argo CD CLI is installed"
else
    echo "❌ Argo CD CLI is not installed"
    exit 1
fi
