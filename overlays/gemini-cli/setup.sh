#!/bin/bash
# gemini-cli setup script - Install Google Gemini CLI

set -e

# Source shared setup utilities (provides load_nvm)
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
load_nvm

echo "📦 Installing Google Gemini CLI..."

# Install @google/gemini-cli globally
npm install -g @google/gemini-cli

# Verify installation
if command -v gemini &>/dev/null; then
    echo "✓ Gemini CLI installed successfully: $(gemini --version 2>/dev/null || echo 'installed')"
else
    echo "✗ Gemini CLI installation failed"
    exit 1
fi

echo "✓ gemini-cli setup complete"
echo "ℹ️  Google Gemini CLI: https://github.com/google-gemini/gemini-cli"
echo "ℹ️  Run 'gemini --help' to get started"
