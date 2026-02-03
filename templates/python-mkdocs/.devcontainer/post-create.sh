#!/bin/bash
set -e

echo "🚀 Running post-create setup for MkDocs Documentation environment..."

# Upgrade pip
pip install --upgrade pip

# Install MkDocs and common plugins
echo "📦 Installing MkDocs and plugins..."
pip install \
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
pip install \
    mkdocs-mermaid2-plugin \
    pygments

# If mkdocs.yml exists, validate
if [ -f "mkdocs.yml" ]; then
    echo "✅ Found mkdocs.yml"
    mkdocs --version
else
    echo "ℹ️  No mkdocs.yml found. Create a new MkDocs project with:"
    echo "  mkdocs new ."
fi

echo "✅ Post-create setup complete!"
echo ""
echo "🎯 Quick start commands:"
echo "  mkdocs serve           - Start development server with live reload"
echo "  mkdocs build           - Build static site"
echo "  mkdocs gh-deploy       - Deploy to GitHub Pages"
echo "  mkdocs new .           - Create new MkDocs project"
