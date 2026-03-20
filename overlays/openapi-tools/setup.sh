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

# Wrap each install in run_spinner to suppress noisy deprecation warnings
run_spinner "swagger-cli"  npm install -g @apidevtools/swagger-cli
run_spinner "spectral"     npm install -g @stoplight/spectral-cli
run_spinner "redocly"      npm install -g @redocly/cli

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
