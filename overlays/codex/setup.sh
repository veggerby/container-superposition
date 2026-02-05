#!/bin/bash
# Codex setup script - Install pnpm globally

set -e

echo "📦 Installing pnpm globally..."

# Install pnpm using npm
npm install -g pnpm

# Verify installation
if command -v pnpm &> /dev/null; then
    echo "✓ pnpm installed successfully: $(pnpm --version)"
else
    echo "✗ pnpm installation failed"
    exit 1
fi

# Create .codex directory if it doesn't exist
mkdir -p /home/vscode/.codex

echo "✓ Codex setup complete"
