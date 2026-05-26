#!/bin/bash
# pi setup script - Install Pi terminal coding agent

set -e

# Source shared setup utilities (provides load_nvm)
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
load_nvm

echo "📦 Installing Pi terminal coding agent..."

# Install @earendil-works/pi-coding-agent globally via npm
# (same package installed by curl -fsSL https://pi.dev/install.sh | sh)
npm install -g @earendil-works/pi-coding-agent

# Verify installation
if command -v pi &>/dev/null; then
    echo "✓ Pi installed successfully: $(pi --version 2>/dev/null || echo 'installed')"
else
    echo "✗ Pi installation failed"
    exit 1
fi

echo "✓ pi setup complete"
echo "ℹ️  Pi terminal coding agent: https://pi.dev"
echo "ℹ️  GitHub: https://github.com/earendil-works/pi"
echo "ℹ️  Run 'pi --help' to get started"
