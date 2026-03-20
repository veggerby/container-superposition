#!/bin/bash
# Setup script for OpenAPI Tools

set -e

# Source shared setup utilities (provides load_nvm)
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
load_nvm

echo "🔧 Setting up OpenAPI Tools..."

# Install OpenAPI tools globally via npm
echo "📦 Installing OpenAPI tools..."

# Install swagger-cli (OpenAPI validation)
npm install -g @apidevtools/swagger-cli || echo "⚠️ swagger-cli already installed or failed"

# Install spectral (OpenAPI linting)
npm install -g @stoplight/spectral-cli || echo "⚠️ spectral already installed or failed"

# Install redocly CLI (documentation and bundling)
npm install -g @redocly/cli || echo "⚠️ redocly already installed or failed"

# Verify installations
echo ""
echo "✅ OpenAPI tools setup complete"
echo ""
echo "Installed tools:"

if command -v swagger-cli &> /dev/null; then
    echo "  ✓ swagger-cli (OpenAPI validation)"
    swagger-cli --version
fi

if command -v spectral &> /dev/null; then
    echo "  ✓ spectral (OpenAPI linting)"
    spectral --version
fi

if command -v redocly &> /dev/null; then
    echo "  ✓ redocly (documentation and bundling)"
    redocly --version
fi

echo ""
echo "ℹ️  Usage examples:"
echo "   swagger-cli validate openapi.yaml"
echo "   spectral lint openapi.yaml"
echo "   redocly lint openapi.yaml"
