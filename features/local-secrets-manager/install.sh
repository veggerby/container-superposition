#!/bin/bash
set -e

AUTO_LOAD_ENV=${AUTOLOADENV:-"true"}
VALIDATE_SECRETS=${VALIDATESECRETS:-"true"}

echo "Installing local secrets manager..."

# Create secrets manager script
cat > /usr/local/bin/init-secrets << 'EOF'
#!/bin/bash
set -e

PROJECT_DIR="${1:-.}"

cd "$PROJECT_DIR"

echo "Initializing local secrets management..."

# Create .env.example template
cat > .env.example << 'ENVEXAMPLE'
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/mydb

# API Keys (DO NOT commit actual values)
API_KEY=your_api_key_here
SECRET_KEY=your_secret_key_here

# External Services
REDIS_URL=redis://localhost:6379
SMTP_HOST=localhost
SMTP_PORT=1025

# Application
NODE_ENV=development
PORT=3000
LOG_LEVEL=debug
ENVEXAMPLE

# Create .env.local (gitignored)
if [ ! -f .env.local ]; then
    cp .env.example .env.local
    echo "✅ Created .env.local from template"
else
    echo "⚠️  .env.local already exists, skipping"
fi

# Ensure .gitignore includes secrets files
if [ -f .gitignore ]; then
    if ! grep -q ".env.local" .gitignore; then
        echo "" >> .gitignore
        echo "# Local development secrets" >> .gitignore
        echo ".env.local" >> .gitignore
        echo ".env.*.local" >> .gitignore
        echo "secrets/" >> .gitignore
    fi
else
    cat > .gitignore << 'GITIGNORE'
# Local development secrets
.env.local
.env.*.local
secrets/

# Dependencies
node_modules/
GITIGNORE
fi

# Create scripts directory before writing validation script
mkdir -p scripts

# Create secrets validation script
cat > scripts/validate-secrets.sh << 'VALIDATE'
#!/bin/bash
set -e

if [ ! -f .env.local ]; then
    echo "❌ .env.local not found!"
    echo "Run 'init-secrets' to create it from .env.example"
    exit 1
fi

# Check for placeholder values
if grep -q "your_.*_here" .env.local; then
    echo "⚠️  Warning: .env.local contains placeholder values"
    echo "Update the following before running:"
    grep "your_.*_here" .env.local
    exit 1
fi

echo "✅ Secrets validation passed"
VALIDATE

chmod +x scripts/validate-secrets.sh

echo "✅ Local secrets management initialized!"
echo ""
echo "Next steps:"
echo "1. Edit .env.local with your actual secrets"
echo "2. Run 'scripts/validate-secrets.sh' to check configuration"
echo "3. Never commit .env.local to git!"
EOF

chmod +x /usr/local/bin/init-secrets

# Add environment loader to bashrc
cat >> /etc/bash.bashrc << 'BASHRC'

# Auto-load .env.local if present
# Detect workspace path (supports both /workspace and /workspaces/<repo>)
if [ -n "$VSCODE_WORKSPACE_FOLDER" ]; then
    WORKSPACE_PATH="$VSCODE_WORKSPACE_FOLDER"
elif [ -d "/workspaces" ]; then
    WORKSPACE_PATH=$(find /workspaces -mindepth 1 -maxdepth 1 -type d | head -n 1)
elif [ -d "/workspace" ]; then
    WORKSPACE_PATH="/workspace"
fi

if [ -n "$WORKSPACE_PATH" ] && [ -f "$WORKSPACE_PATH/.env.local" ]; then
    set -a
    source "$WORKSPACE_PATH/.env.local"
    set +a
fi
BASHRC

echo "✅ Local secrets manager installed!"
echo "Run 'init-secrets' in your project directory"
