#!/bin/bash
# amp setup script - Install Sourcegraph Amp CLI

set -e

# Source shared setup utilities (provides load_nvm)
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
load_nvm

echo "📦 Installing Sourcegraph Amp CLI..."

# Install @sourcegraph/amp globally
npm install -g @sourcegraph/amp

# Verify installation
if command -v amp &>/dev/null; then
    echo "✓ Amp CLI installed successfully: $(amp --version 2>/dev/null || echo 'installed')"
else
    echo "✗ Amp CLI installation failed"
    exit 1
fi

echo "✓ amp setup complete"
echo "ℹ️  Sourcegraph Amp: https://sourcegraph.com/amp"
echo "ℹ️  Run 'amp --help' to get started"
