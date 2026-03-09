#!/bin/bash
# windsurf-cli setup script - Install Codeium Windsurf CLI

set -e

echo "📦 Installing Codeium Windsurf CLI..."

# Install windsurf globally via npm
npm install -g @codeium/windsurf-cli

# Verify installation
if command -v windsurf &>/dev/null; then
    echo "✓ Windsurf CLI installed successfully: $(windsurf --version 2>/dev/null || echo 'installed')"
else
    echo "✗ Windsurf CLI installation failed"
    exit 1
fi

echo "✓ windsurf-cli setup complete"
echo "ℹ️  Codeium Windsurf: https://docs.codeium.com/windsurf/getting-started"
echo "ℹ️  Run 'windsurf --help' to get started"
