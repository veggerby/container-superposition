#!/bin/bash
# claude-code setup script - Install Anthropic Claude Code CLI

set -e

# Source shared setup utilities (provides load_nvm)
# shellcheck source=setup-utils.sh
source "$(dirname "${BASH_SOURCE[0]}")/setup-utils.sh"
load_nvm

echo "📦 Installing Anthropic Claude Code CLI..."

# Install @anthropic-ai/claude-code globally
npm install -g @anthropic-ai/claude-code

# Verify installation
if command -v claude &>/dev/null; then
    echo "✓ Claude Code CLI installed successfully: $(claude --version 2>/dev/null || echo 'installed')"
else
    echo "✗ Claude Code CLI installation failed"
    exit 1
fi

echo "✓ claude-code setup complete"
echo "ℹ️  Anthropic Claude Code: https://docs.anthropic.com/en/docs/claude-code"
echo "ℹ️  Run 'claude --help' to get started"
