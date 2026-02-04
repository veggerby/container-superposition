#!/bin/bash
# MkDocs setup script - Install MkDocs and dependencies

set -e

echo "📚 Setting up MkDocs environment..."

# Install MkDocs packages from overlay requirements
if [ -f ".devcontainer/requirements-overlay.txt" ]; then
    echo "📦 Installing MkDocs packages from requirements-overlay.txt..."
    pip install --user -r .devcontainer/requirements-overlay.txt
    echo "✓ MkDocs packages installed"
else
    # Fallback to manual install if requirements file missing
    echo "📦 Installing MkDocs with Material theme (fallback)..."
    pip install --user mkdocs mkdocs-material mkdocs-minify-plugin mkdocs-redirects pymdown-extensions
fi

# Upgrade pip, setuptools, and wheel
echo "⬆️  Upgrading pip, setuptools, and wheel..."
pip install --user --upgrade pip setuptools wheel

# Check if mkdocs.yml exists
if [ -f "mkdocs.yml" ]; then
    echo "✓ Found mkdocs.yml configuration"
    
    # Try to install additional dependencies from mkdocs.yml plugins
    if grep -q "requirements.txt" mkdocs.yml 2>/dev/null; then
        if [ -f "requirements.txt" ]; then
            echo "📦 Installing additional requirements from requirements.txt..."
            pip install --user -r requirements.txt
        fi
    fi
else
    echo "ℹ️  No mkdocs.yml found - you can create one with: mkdocs new ."
fi

echo "✓ MkDocs setup complete"
echo ""
echo "Quick start:"
echo "  mkdocs new .       # Create new site"
echo "  mkdocs serve       # Start dev server on :8000"
echo "  mkdocs build       # Build static site"
