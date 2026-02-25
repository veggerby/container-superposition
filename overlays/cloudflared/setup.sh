#!/bin/bash
# Cloudflared setup script
# Installs cloudflared from official repository

set -e

echo "🌐 Setting up Cloudflared..."

# Install cloudflared using official package
echo "📦 Installing cloudflared..."

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64) CF_ARCH="amd64" ;;
    aarch64 | arm64) CF_ARCH="arm64" ;;
    *) echo "   ⚠️  Unsupported architecture: $ARCH" ; CF_ARCH="amd64" ;;
esac

CF_URL="https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-${CF_ARCH}"
curl -sSL "$CF_URL" -o /tmp/cloudflared
sudo install -m 755 /tmp/cloudflared /usr/local/bin/cloudflared
rm -f /tmp/cloudflared

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
