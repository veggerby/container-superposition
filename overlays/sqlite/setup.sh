#!/bin/bash
# SQLite setup script - installs litecli for better CLI experience

set -e

echo "🔧 Setting up SQLite tools..."

# Install litecli via pip if Python is available
if command -v pip &> /dev/null || command -v pip3 &> /dev/null; then
    echo "📦 Installing litecli..."
    if command -v pip3 &> /dev/null; then
        pip3 install --user litecli || echo "⚠️  litecli installation failed, continuing..."
    else
        pip install --user litecli || echo "⚠️  litecli installation failed, continuing..."
    fi
    
    # Add to PATH if not already there
    if [[ ":$PATH:" != *":$HOME/.local/bin:"* ]]; then
        echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.bashrc
        export PATH="$HOME/.local/bin:$PATH"
    fi
else
    echo "⚠️  Python/pip not found, skipping litecli installation"
    echo "   Install Python overlay for enhanced SQLite CLI (litecli)"
fi

echo "✅ SQLite setup complete"
