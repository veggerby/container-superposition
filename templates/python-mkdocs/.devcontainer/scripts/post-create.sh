#!/bin/bash
set -e

echo "🚀 Running post-create setup for MkDocs Documentation environment..."

# Upgrade pip (user-level)
echo "📦 Upgrading pip..."
pip install --upgrade pip

# Install MkDocs and common plugins (user-level, won't affect project)
echo "📦 Installing MkDocs and plugins globally..."
pip install --user \
    mkdocs \
    mkdocs-material \
    mkdocs-material-extensions \
    pymdown-extensions \
    mkdocs-minify-plugin \
    mkdocs-redirects \
    mkdocs-git-revision-date-localized-plugin \
    mkdocs-awesome-pages-plugin \
    mkdocs-macros-plugin

# Install diagram and code highlighting tools
pip install --user \
    mkdocs-mermaid2-plugin \
    pygments

# Check for existing MkDocs project (but don't modify it)
if [ -f "mkdocs.yml" ]; then
    echo "✅ Found mkdocs.yml"
    mkdocs --version
    echo "ℹ️  Run 'mkdocs serve' to start the development server"
elif [ -f "requirements.txt" ]; then
    echo "ℹ️  Found requirements.txt"
    echo "ℹ️  Run 'pip install -r requirements.txt' to install project dependencies"
    if grep -q 'mkdocs' requirements.txt 2>/dev/null; then
        echo "ℹ️  MkDocs found in requirements.txt"
    fi
else
    echo "ℹ️  No mkdocs.yml or requirements.txt found."
    echo "ℹ️  Create a new MkDocs project with:"
    echo "  mkdocs new ."
fi

echo ""
echo "✅ Post-create setup complete!"
echo ""
echo "🎯 Quick start commands:"
echo "  mkdocs new .           - Create new MkDocs project"
echo "  mkdocs serve           - Start development server with live reload"
echo "  mkdocs build           - Build static site"
echo "  mkdocs gh-deploy       - Deploy to GitHub Pages"
