#!/bin/bash
# MinIO setup script - installs MinIO client (mc) and creates default bucket

set -e

echo "🔧 Setting up MinIO client..."

# Install MinIO client (mc)
echo "📦 Installing MinIO client (mc)..."
if ! command -v mc &> /dev/null; then
    # Pin to a specific version for security and reproducibility
    MC_VERSION="RELEASE.2024-11-17T19-35-25Z"
    MC_URL="https://dl.min.io/client/mc/release/linux-amd64/archive/mc.${MC_VERSION}"
    MC_CHECKSUM="27e18faeabd9a0c8066e3b4aadb13a2c0ae4dac09a1e24defe34c99a11b59e26"
    
    echo "   Downloading MinIO client version ${MC_VERSION}..."
    wget -q "${MC_URL}" -O /tmp/mc
    
    # Verify checksum
    echo "   Verifying checksum..."
    echo "${MC_CHECKSUM}  /tmp/mc" | sha256sum -c - || {
        echo "   ❌ Checksum verification failed!"
        rm -f /tmp/mc
        exit 1
    }
    
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
