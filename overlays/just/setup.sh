#!/bin/bash
# Just task runner setup script

set -e

echo "⚡ Setting up just task runner..."

# Install just from GitHub releases
JUST_VERSION="1.25.2"
ARCH=$(uname -m)

if [ "$ARCH" = "aarch64" ] || [ "$ARCH" = "arm64" ]; then
    ARCH="aarch64"
elif [ "$ARCH" = "x86_64" ]; then
    ARCH="x86_64"
else
    echo "⚠️  Unsupported architecture: $ARCH, falling back to x86_64"
    ARCH="x86_64"
fi

echo "📦 Downloading just v${JUST_VERSION} for ${ARCH}..."
curl -fsSL "https://github.com/casey/just/releases/download/${JUST_VERSION}/just-${JUST_VERSION}-${ARCH}-unknown-linux-musl.tar.gz" \
    -o /tmp/just.tar.gz

# Extract and install
tar -xzf /tmp/just.tar.gz -C /tmp
sudo mv /tmp/just /usr/local/bin/
sudo chmod +x /usr/local/bin/just
rm /tmp/just.tar.gz

# Verify installation
if command -v just &> /dev/null; then
    echo "✓ just installed: $(just --version)"
else
    echo "✗ just installation failed"
    exit 1
fi

# Create sample Justfile if it doesn't exist
if [ ! -f Justfile ]; then
    cat > Justfile << 'EOF'
# Justfile - Task runner configuration
# Run `just --list` to see all available tasks
# Run `just <task>` to execute a task

# Default task (runs when you type `just`)
default:
    @just --list

# Install project dependencies
install:
    @echo "📦 Installing dependencies..."
    npm install
    @echo "✓ Dependencies installed"

# Build the project
build:
    @echo "🔨 Building project..."
    npm run build
    @echo "✓ Build complete"

# Run tests
test:
    @echo "🧪 Running tests..."
    npm test

# Run tests in watch mode
test-watch:
    @echo "👀 Running tests in watch mode..."
    npm run test:watch

# Run linter
lint:
    @echo "🔍 Running linter..."
    npm run lint

# Fix linting issues
lint-fix:
    @echo "🔧 Fixing linting issues..."
    npm run lint -- --fix

# Format code
format:
    @echo "💅 Formatting code..."
    npm run format

# Clean build artifacts
clean:
    @echo "🧹 Cleaning build artifacts..."
    rm -rf dist/ build/ .cache/
    @echo "✓ Clean complete"

# Development server
dev:
    @echo "🚀 Starting development server..."
    npm run dev

# Production server
serve:
    @echo "🌐 Starting production server..."
    npm start

# Run all checks (lint, test, build)
check: lint test build
    @echo "✅ All checks passed"

# Git helpers
git-status:
    @echo "📊 Git status:"
    @git status

git-log:
    @echo "📜 Recent commits:"
    @git log --oneline -10

# Docker helpers
docker-up:
    @echo "🐳 Starting Docker containers..."
    docker-compose up -d

docker-down:
    @echo "🛑 Stopping Docker containers..."
    docker-compose down

docker-logs:
    @echo "📋 Docker logs:"
    docker-compose logs -f

# Database helpers (example)
db-migrate:
    @echo "🗄️  Running database migrations..."
    npm run db:migrate

db-seed:
    @echo "🌱 Seeding database..."
    npm run db:seed

db-reset: db-migrate db-seed
    @echo "✓ Database reset complete"

# Help / Documentation
help:
    @echo "Available tasks:"
    @just --list
    @echo ""
    @echo "Usage: just <task>"
    @echo "Example: just build"
EOF
    echo "✓ Sample Justfile created"
fi

# Set up bash completion (if available)
if [ -d /etc/bash_completion.d ]; then
    just --completions bash | sudo tee /etc/bash_completion.d/just > /dev/null
    echo "✓ Bash completion installed"
fi

# Set up zsh completion (if available)
if [ -d /usr/local/share/zsh/site-functions ]; then
    just --completions zsh | sudo tee /usr/local/share/zsh/site-functions/_just > /dev/null
    echo "✓ Zsh completion installed"
fi

echo "✓ Just setup complete"
echo ""
echo "💡 Usage:"
echo "  - List tasks: just --list or just"
echo "  - Run task: just <task-name>"
echo "  - Show task: just --show <task-name>"
echo "  - Edit Justfile: edit your project's Justfile"
