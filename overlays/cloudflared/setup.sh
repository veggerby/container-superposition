#!/bin/bash
# Cloudflared setup script
# Installs cloudflared from official repository

set -e

echo "🌐 Setting up Cloudflared..."

# Install cloudflared using official package
echo "📦 Installing cloudflared..."

# Pin to a specific version for reproducibility and security
# Check https://github.com/cloudflare/cloudflared/releases for newer versions
CF_VERSION="${CLOUDFLARED_VERSION:-2025.2.1}"

# Source shared setup utilities
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"

detect_arch amd64

install_binary \
    "https://github.com/cloudflare/cloudflared/releases/download/${CF_VERSION}/cloudflared-linux-${CS_ARCH}" \
    "cloudflared" "755"

# Verify installation
if command -v cloudflared &> /dev/null; then
    echo "   ✅ cloudflared installed: $(cloudflared --version)"
else
    echo "   ❌ cloudflared installation failed"
    exit 1
fi

echo ""
echo "✅ Cloudflared setup complete"
echo ""
echo "💡 Quick start (no account required):"
echo "   cloudflared tunnel --url http://localhost:3000"
echo ""
echo "💡 Named tunnel (persistent URL, requires Cloudflare account):"
echo "   cloudflared login"
echo "   cloudflared tunnel create my-tunnel"
echo "   cloudflared tunnel route dns my-tunnel myapp.example.com"
echo "   cloudflared tunnel run my-tunnel"
echo ""
echo "📚 Documentation: https://developers.cloudflare.com/cloudflare-one/connections/connect-networks/"
