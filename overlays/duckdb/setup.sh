#!/bin/bash
# Setup script for DuckDB

set -e

echo "🔧 Setting up DuckDB..."

# Detect architecture
ARCH=$(uname -m)
case $ARCH in
    x86_64)
        DUCKDB_ARCH="amd64"
        ;;
    aarch64|arm64)
        DUCKDB_ARCH="aarch64"
        ;;
    *)
        echo "❌ Unsupported architecture: $ARCH"
        exit 1
        ;;
esac

# Install DuckDB CLI
DUCKDB_VERSION="${DUCKDB_VERSION:-v1.0.0}"
echo "📦 Installing DuckDB CLI ${DUCKDB_VERSION}..."

wget -q "https://github.com/duckdb/duckdb/releases/download/${DUCKDB_VERSION}/duckdb_cli-linux-${DUCKDB_ARCH}.zip" -O /tmp/duckdb.zip
unzip -q /tmp/duckdb.zip -d /tmp/
chmod +x /tmp/duckdb
sudo mv /tmp/duckdb /usr/local/bin/duckdb
rm /tmp/duckdb.zip

# Verify installation
if command -v duckdb &> /dev/null; then
    echo "✅ DuckDB CLI installed successfully"
    duckdb --version
else
    echo "❌ DuckDB CLI installation failed"
    exit 1
fi

echo "✅ DuckDB setup complete"
echo ""
echo "ℹ️  To start DuckDB, run:"
echo "   duckdb mydata.db"
