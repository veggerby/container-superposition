#!/bin/bash
# SQLite setup script - installs litecli for better CLI experience

set -e

echo "🔧 Setting up SQLite tools..."

# Install litecli via pipx (avoids --user conflicts inside virtualenvs)
if command -v pipx &> /dev/null; then
    echo "📦 Installing litecli via pipx..."
    pipx install litecli || echo "⚠️  litecli installation failed, continuing..."
elif command -v pip3 &> /dev/null; then
    echo "📦 Installing litecli via pip3..."
    pip3 install litecli 2>/dev/null || \
        pip3 install --break-system-packages litecli || \
        echo "⚠️  litecli installation failed, continuing..."
elif command -v pip &> /dev/null; then
    echo "📦 Installing litecli via pip..."
    pip install litecli 2>/dev/null || \
        pip install --break-system-packages litecli || \
        echo "⚠️  litecli installation failed, continuing..."
else
    echo "⚠️  Python/pip not found, skipping litecli installation"
    echo "   Install Python overlay for enhanced SQLite CLI (litecli)"
fi

echo "✅ SQLite setup complete"
