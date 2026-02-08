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

# Get pnpm global bin directory
PNPM_HOME=$(pnpm config get global-bin-dir 2>/dev/null || echo "$HOME/.local/share/pnpm")

# Add pnpm global bin to PATH in shell configuration files
echo "📝 Configuring shell PATH..."

# Add to .bashrc if it exists and path not already there
if [ -f "$HOME/.bashrc" ]; then
    if ! grep -q "PNPM_HOME" "$HOME/.bashrc"; then
        cat >> "$HOME/.bashrc" << 'EOF'

# pnpm global bin directory (added by codex overlay)
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
EOF
        echo "✓ Added pnpm to .bashrc"
    fi
fi

# Add to .zshrc if it exists and path not already there
if [ -f "$HOME/.zshrc" ]; then
    if ! grep -q "PNPM_HOME" "$HOME/.zshrc"; then
        cat >> "$HOME/.zshrc" << 'EOF'

# pnpm global bin directory (added by codex overlay)
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"
EOF
        echo "✓ Added pnpm to .zshrc"
    fi
fi

# Export for current session
export PNPM_HOME="$HOME/.local/share/pnpm"
export PATH="$PNPM_HOME:$PATH"

# Create .codex directory if it doesn't exist
mkdir -p "$HOME/.codex"

echo "✓ Codex setup complete"
echo "ℹ️  Note: Restart your shell or run 'source ~/.bashrc' (or ~/.zshrc) to use pnpm"
