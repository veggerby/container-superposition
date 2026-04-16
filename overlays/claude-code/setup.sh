#!/bin/bash
# claude-code setup script - Install Anthropic Claude Code CLI

set -e

echo "📦 Installing Anthropic Claude Code CLI..."

# Ensure required installer dependency exists
if ! command -v curl &>/dev/null; then
    echo "✗ curl is required to install Claude Code"
    exit 1
fi

# Install Claude Code using the native installer
curl -fsSL https://claude.ai/install.sh | bash

# Ensure common user binary paths are available in this shell session
export PATH="$HOME/.local/bin:$HOME/bin:$PATH"

# Verify installation
if command -v claude &>/dev/null; then
    echo "✓ Claude Code CLI installed successfully: $(claude --version 2>/dev/null || echo 'installed')"
else
    echo "✗ Claude Code CLI installation failed"
    exit 1
fi

echo "✓ claude-code setup complete"
echo "ℹ️  Claude Code docs: https://code.claude.com/docs/en/getting-started"
echo "ℹ️  Run 'claude --help' to get started"
