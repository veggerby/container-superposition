#!/bin/bash
# Setup script for Tilt

set -e

echo "🔧 Setting up Tilt..."

# Install Tilt
echo "📦 Installing Tilt..."

curl -fsSL https://raw.githubusercontent.com/tilt-dev/tilt/master/scripts/install.sh | bash

# Verify installation
if command -v tilt &> /dev/null; then
    echo "✅ Tilt installed successfully"
    tilt version
else
    echo "❌ Tilt installation failed"
    exit 1
fi

echo "✅ Tilt setup complete"
echo ""
echo "ℹ️  To start Tilt, run:"
echo "   tilt up"
