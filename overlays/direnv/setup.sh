#!/bin/bash
# direnv setup script

set -e

echo "🔐 Setting up direnv..."

# Install direnv from package manager
sudo apt-get update -qq
sudo apt-get install -y direnv

# Verify installation
if command -v direnv &> /dev/null; then
    echo "✓ direnv installed: $(direnv version)"
else
    echo "✗ direnv installation failed"
    exit 1
fi

# Add direnv hook to bash profile
if [ -f /home/vscode/.bashrc ]; then
    if ! grep -q "direnv hook bash" /home/vscode/.bashrc; then
        echo 'eval "$(direnv hook bash)"' >> /home/vscode/.bashrc
        echo "✓ direnv hook added to .bashrc"
    fi
fi

# Add direnv hook to zsh profile if zsh is installed
if command -v zsh &> /dev/null && [ -f /home/vscode/.zshrc ]; then
    if ! grep -q "direnv hook zsh" /home/vscode/.zshrc; then
        echo 'eval "$(direnv hook zsh)"' >> /home/vscode/.zshrc
        echo "✓ direnv hook added to .zshrc"
    fi
fi

# Create sample .envrc if it doesn't exist
if [ ! -f .envrc ]; then
    cat > .envrc << 'EOF'
# .envrc - Directory-specific environment variables
# Run `direnv allow` to activate this file

# Load .env file if it exists
dotenv_if_exists .env

# Example: Set project-specific variables
export PROJECT_NAME="my-project"
export ENVIRONMENT="development"

# Example: Add local bin to PATH
PATH_add ./bin
PATH_add ./scripts

# Example: Set Node.js version (requires nvm)
# use node 20

# Example: Activate Python virtual environment
# layout python python3.12

# Example: Load secrets from file
# dotenv_if_exists .env.local

# Example: Set database URL
# export DATABASE_URL="postgresql://localhost:5432/mydb"

# Example: Set API endpoints
# export API_BASE_URL="http://localhost:3000"

# Example: Configure logging
# export LOG_LEVEL="debug"

# Log message when environment is loaded
log_status "✓ Environment loaded for $PROJECT_NAME"
EOF
    echo "✓ Sample .envrc created"
    
    # Note: Auto-allowing .envrc in devcontainer context
    # WARNING: .envrc can execute arbitrary code. Review before allowing in production.
    echo "⚠️  Auto-allowing .envrc for devcontainer (review contents before use)"
    direnv allow .envrc 2>/dev/null || true
    echo "✓ .envrc pre-allowed (run 'direnv deny' to disable)"
fi

# Create sample .env file if it doesn't exist
if [ ! -f .env ] && [ ! -f .env.example ]; then
    cat > .env.example << 'EOF'
# .env.example - Example environment variables
# Copy to .env and customize for your local environment

# Application settings
NODE_ENV=development
PORT=3000

# Database
DATABASE_URL=postgresql://localhost:5432/mydb
DATABASE_POOL_SIZE=10

# Authentication
JWT_SECRET=change-me-in-production
SESSION_SECRET=change-me-too

# API Keys (never commit real keys)
API_KEY=your-api-key-here
THIRD_PARTY_API_KEY=another-key

# Feature Flags
ENABLE_BETA_FEATURES=false
ENABLE_DEBUG_MODE=true

# External Services
REDIS_URL=redis://localhost:6379
ELASTICSEARCH_URL=http://localhost:9200

# Logging
LOG_LEVEL=info
LOG_FORMAT=json
EOF
    echo "✓ Sample .env.example created"
fi

# Create .gitignore entries for environment files
if [ -f .gitignore ]; then
    if ! grep -q ".envrc" .gitignore; then
        echo "" >> .gitignore
        echo "# Direnv" >> .gitignore
        echo ".envrc.local" >> .gitignore
        echo ".env" >> .gitignore
        echo ".env.local" >> .gitignore
        echo "✓ Added direnv entries to .gitignore"
    fi
fi

echo "✓ direnv setup complete"
echo ""
echo "💡 Usage:"
echo "  - Edit .envrc to set environment variables"
echo "  - Run 'direnv allow' to activate changes"
echo "  - Variables are automatically loaded when entering directory"
echo "  - Use 'direnv deny' to disable"
echo "  - Check status: 'direnv status'"
