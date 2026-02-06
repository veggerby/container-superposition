#!/bin/bash
# MinIO setup script - installs MinIO client (mc) and creates default bucket

set -e

echo "🔧 Setting up MinIO client..."

# Install MinIO client (mc)
echo "📦 Installing MinIO client (mc)..."
if ! command -v mc &> /dev/null; then
    wget -q https://dl.min.io/client/mc/release/linux-amd64/mc -O /tmp/mc
    sudo install /tmp/mc /usr/local/bin/
    rm /tmp/mc
    echo "   ✅ MinIO client installed"
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
