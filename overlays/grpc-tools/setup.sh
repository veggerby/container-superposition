#!/bin/bash
# gRPC Tools setup script
# Installs buf CLI and grpcurl

set -e

echo "🔧 Setting up gRPC Tools..."

# Install buf CLI
echo "📦 Installing buf CLI..."
BUF_VERSION="${BUF_VERSION:-1.47.2}"

# Detect architecture
ARCH=$(uname -m)
case "$ARCH" in
    x86_64) BUF_ARCH="x86_64" ;;
    aarch64 | arm64) BUF_ARCH="aarch64" ;;
    *) echo "   ⚠️  Unsupported architecture: $ARCH, skipping buf installation" ; BUF_ARCH="" ;;
esac

if [ -n "$BUF_ARCH" ]; then
    BUF_URL="https://github.com/bufbuild/buf/releases/download/v${BUF_VERSION}/buf-Linux-${BUF_ARCH}"
    curl -sSL "$BUF_URL" -o /tmp/buf
    sudo install -m 755 /tmp/buf /usr/local/bin/buf
    rm -f /tmp/buf
    echo "   ✅ buf installed: $(buf --version)"
fi

# Install grpcurl
echo "📦 Installing grpcurl..."
GRPCURL_VERSION="${GRPCURL_VERSION:-1.9.2}"

GRPCURL_ARCH="$(uname -m)"
case "$GRPCURL_ARCH" in
    x86_64) GRPCURL_ARCH="x86_64" ;;
    aarch64 | arm64) GRPCURL_ARCH="arm64" ;;
    *) echo "   ⚠️  Unsupported architecture: $GRPCURL_ARCH, skipping grpcurl installation" ; GRPCURL_ARCH="" ;;
esac

if [ -n "$GRPCURL_ARCH" ]; then
    GRPCURL_URL="https://github.com/fullstorydev/grpcurl/releases/download/v${GRPCURL_VERSION}/grpcurl_${GRPCURL_VERSION}_linux_${GRPCURL_ARCH}.tar.gz"
    curl -sSL "$GRPCURL_URL" | sudo tar -xz -C /usr/local/bin grpcurl
    echo "   ✅ grpcurl installed: $(grpcurl --version 2>&1 | head -1)"
fi

echo ""
echo "✅ gRPC Tools setup complete"
echo ""
echo "💡 Quick start:"
echo "   protoc --version          # Protocol Buffers compiler"
echo "   buf --version             # Buf CLI (schema management)"
echo "   grpcurl --version         # gRPC curl"
echo ""
echo "📚 Resources:"
echo "   https://protobuf.dev/       # Protocol Buffers documentation"
echo "   https://buf.build/docs/     # Buf CLI documentation"
echo "   https://github.com/fullstorydev/grpcurl  # grpcurl documentation"
