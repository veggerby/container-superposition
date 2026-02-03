#!/bin/bash
set -e

echo "🚀 Running post-create setup for Node.js TypeScript environment..."

# Install global tools
npm install -g npm@latest
npm install -g pnpm yarn

# If package.json exists, install dependencies
if [ -f "package.json" ]; then
    echo "📦 Installing dependencies..."
    npm install
else
    echo "ℹ️  No package.json found. Run 'npm init' to create a new project."
fi

# Setup git hooks if husky is installed
if [ -d "node_modules/husky" ]; then
    echo "🪝 Setting up git hooks..."
    npx husky install
fi

echo "✅ Post-create setup complete!"
echo ""
echo "🎯 Quick start commands:"
echo "  npm run dev      - Start development server"
echo "  npm test         - Run tests"
echo "  npm run build    - Build for production"
echo "  npm run lint     - Lint code"
