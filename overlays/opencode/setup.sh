#!/bin/bash
# opencode setup script - Install opencode AI coding agent

set -e

echo "📦 Installing opencode AI coding agent..."

# Install opencode-ai globally
npm install -g opencode-ai

# Verify installation
if command -v opencode &>/dev/null; then
    echo "✓ opencode installed successfully: $(opencode --version 2>/dev/null || echo 'installed')"
else
    echo "✗ opencode installation failed"
    exit 1
fi

echo "✓ opencode setup complete"
echo "ℹ️  opencode: https://opencode.ai"
echo "ℹ️  Run 'opencode --help' to get started"
