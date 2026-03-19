#!/bin/bash
# MinIO setup script - installs MinIO client (mc) and creates default bucket

set -e

echo "🔧 Setting up MinIO client..."

# Install MinIO client (mc)
echo "📦 Installing MinIO client (mc)..."
if ! command -v mc &> /dev/null; then
    MC_VERSION="${MC_VERSION:-RELEASE.2024-11-17T19-35-25Z}"
    ARCH=$(uname -m)
    case "$ARCH" in
        x86_64)  MC_ARCH="amd64" ;;
        aarch64|arm64) MC_ARCH="arm64" ;;
        *) echo "⚠️  Unsupported architecture: $ARCH"; exit 1 ;;
    esac
    MC_URL="https://dl.min.io/client/mc/release/linux-${MC_ARCH}/archive/mc.${MC_VERSION}"

    echo "   Downloading MinIO client version ${MC_VERSION} for ${MC_ARCH}..."
    curl -fsSL "${MC_URL}" -o /tmp/mc

    sudo install /tmp/mc /usr/local/bin/
    rm /tmp/mc
    echo "   ✅ MinIO client installed (${MC_VERSION})"
else
    echo "   ✅ MinIO client already installed"
fi

# Wait for MinIO to be ready
echo "⏳ Waiting for MinIO service..."
for i in {1..30}; do
    if curl -s http://minio:9000/minio/health/live &> /dev/null; then
        echo "   ✅ MinIO is ready"
        break
    fi
    sleep 2
done

# Configure mc alias
echo "🔗 Configuring MinIO client..."
mc alias set local http://minio:9000 minioadmin minioadmin || echo "⚠️  MinIO alias setup failed (may already exist)"

# Create default bucket if specified in .env
if [ -f ".devcontainer/.env" ] && grep -q "MINIO_DEFAULT_BUCKET=" .devcontainer/.env; then
    BUCKET_NAME=$(grep "MINIO_DEFAULT_BUCKET=" .devcontainer/.env | cut -d'=' -f2)
    if [ -n "$BUCKET_NAME" ]; then
        echo "📦 Creating default bucket: $BUCKET_NAME"
        mc mb local/$BUCKET_NAME --ignore-existing || echo "   ⚠️  Bucket may already exist"
    fi
fi

echo "✅ MinIO setup complete"
echo ""
echo "📝 MinIO Console: http://localhost:9001"
echo "   Username: minioadmin"
echo "   Password: minioadmin"
