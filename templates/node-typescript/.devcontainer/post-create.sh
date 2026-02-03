#!/bin/bash
set -e

echo "🚀 Running post-create setup for Node.js TypeScript environment..."

# Copy .npmrc if it doesn't exist in home directory
if [ ! -f ~/.npmrc ] && [ -f .devcontainer/.npmrc ]; then
    echo "📝 Copying npm configuration..."
    cp .devcontainer/.npmrc ~/.npmrc
fi

# Install/update global package managers (user-level, won't affect project)
echo "📦 Installing/updating global package managers..."
npm install -g npm@latest 2>/dev/null || echo "  npm update skipped"
npm install -g pnpm 2>/dev/null || echo "  pnpm already installed"
npm install -g yarn 2>/dev/null || echo "  yarn already installed"

# Check for existing project (but don't modify it)
if [ -f "package.json" ]; then
    echo "✅ Found package.json"
    if [ -d "node_modules" ]; then
        echo "ℹ️  Dependencies already installed"
    else
        echo "ℹ️  Run 'npm install' to install dependencies when ready"
    fi
    
    # Setup git hooks if husky is configured (but don't install dependencies)
    if grep -q '"husky"' package.json 2>/dev/null; then
        if [ -d "node_modules/husky" ]; then
            echo "🪝 Setting up git hooks..."
            npx husky install 2>/dev/null || echo "  Run 'npm install' first to setup git hooks"
        else
            echo "ℹ️  Husky detected - git hooks will be setup after 'npm install'"
        fi
    fi
else
    echo "ℹ️  No package.json found. Create a new project with:"
    echo "  npm init"
    echo "  npm create vite@latest"
    echo "  npm create next-app@latest"
fi

echo ""
echo "✅ Post-create setup complete!"
echo ""
echo "🎯 Quick start commands:"
echo "  npm install      - Install dependencies"
echo "  npm run dev      - Start development server"
echo "  npm test         - Run tests"
echo "  npm run build    - Build for production"
echo "  npm run lint     - Lint code"
