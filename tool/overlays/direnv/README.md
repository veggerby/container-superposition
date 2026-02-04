# direnv Overlay

Automatic environment variable management for project-specific configurations.

## What's Included

- **direnv** - Per-directory environment variable loader
- **Shell integration** - Auto-hook for bash/zsh
- **Sample .envrc** - Ready-to-use configuration
- **Sample .env.example** - Environment variable template

## What is direnv?

direnv automatically loads/unloads environment variables when you enter/leave a directory. Perfect for:

- Project-specific configurations
- API keys and secrets
- Database URLs
- Feature flags
- Development vs. production settings

## Quick Start

1. **Edit .envrc** in your project root:
   ```bash
   export DATABASE_URL="postgresql://localhost:5432/mydb"
   export API_KEY="dev-key-123"
   ```

2. **Allow the configuration**:
   ```bash
   direnv allow
   ```

3. **Variables are automatically loaded** when you `cd` into the directory:
   ```bash
   cd /workspace
   # direnv: loading .envrc
   # ✓ Environment loaded
   
   echo $DATABASE_URL
   # postgresql://localhost:5432/mydb
   ```

4. **Variables are unloaded** when you leave:
   ```bash
   cd /tmp
   # direnv: unloading
   
   echo $DATABASE_URL
   # (empty)
   ```

## .envrc Syntax

### Basic Variables

```bash
export PROJECT_NAME="my-project"
export NODE_ENV="development"
export DEBUG="true"
```

### Load .env File

```bash
# Load .env if it exists
dotenv_if_exists .env

# Load multiple files
dotenv_if_exists .env
dotenv_if_exists .env.local
```

### Modify PATH

```bash
# Add directories to PATH
PATH_add ./bin
PATH_add ./node_modules/.bin
PATH_add /usr/local/custom/bin
```

### Conditional Logic

```bash
# Environment-specific variables
if [ "$USER" = "alice" ]; then
    export LOG_LEVEL="debug"
else
    export LOG_LEVEL="info"
fi
```

### Load Programming Language Versions

```bash
# Node.js (requires nvm)
use node 20.11.0

# Python (creates/activates venv)
layout python python3.12

# Ruby (requires rbenv/rvm)
use ruby 3.3.0
```

### Source Other Files

```bash
# Load shared configuration
source_env ../shared/.envrc

# Load if exists
source_env_if_exists ./config/local.envrc
```

### Functions and Helpers

```bash
# Log messages
log_status "Environment loaded"
log_error "Something went wrong"

# Watch files for changes
watch_file config/settings.yml
```

## Common Patterns

### Node.js Project

```bash
# .envrc
use node 20

PATH_add ./node_modules/.bin
export NODE_ENV=development
export PORT=3000

dotenv_if_exists .env
```

### Python Project

```bash
# .envrc
layout python python3.12

export PYTHONPATH="$PWD/src"
export FLASK_ENV=development
export DATABASE_URL="sqlite:///dev.db"

dotenv_if_exists .env
```

### Go Project

```bash
# .envrc
export GOPATH="$PWD/.go"
export GOBIN="$PWD/bin"

PATH_add ./bin
PATH_add "$GOPATH/bin"
```

### Multi-Service Project

```bash
# .envrc
export COMPOSE_PROJECT_NAME="myapp"

# Service URLs
export API_URL="http://localhost:3000"
export WEB_URL="http://localhost:8080"
export DB_URL="postgresql://localhost:5432/mydb"

# Load environment-specific config
dotenv_if_exists .env.${NODE_ENV:-development}
```

### Monorepo

```bash
# Root .envrc
export WORKSPACE_ROOT="$PWD"
export NODE_ENV=development

# Shared variables
export DATABASE_URL="postgresql://localhost:5432/shared"

# Child directories can extend:
# source_env_if_exists $WORKSPACE_ROOT/.envrc
```

## Advanced Features

### Private .envrc

For personal/local configurations:

```bash
# .envrc
dotenv_if_exists .env

# Load personal settings (gitignored)
source_env_if_exists .envrc.local
```

Create `.envrc.local` (add to `.gitignore`):
```bash
export PERSONAL_API_KEY="my-secret-key"
export DEBUG_MODE="true"
```

### Watch Files

Reload when files change:

```bash
# .envrc
watch_file config/database.yml
watch_file .env.local

# Parse and export YAML/JSON
export DATABASE_HOST=$(yq .host config/database.yml)
```

### Lazy Loading

Defer expensive operations:

```bash
# Only load when variable is accessed
export_function() {
    export EXPENSIVE_VALUE=$(some-slow-command)
}

# Or use lazy loading helper
has nvm && use node
```

### Layout Functions

Built-in helpers for common setups:

```bash
# Python virtualenv
layout python python3.12

# Anaconda
layout anaconda myenv

# Node.js
layout node

# Go workspace
layout go
```

### Custom Functions

```bash
# Define reusable function
setup_aws() {
    export AWS_PROFILE="dev"
    export AWS_REGION="us-west-2"
}

setup_aws
```

## Security Best Practices

### Never Commit Secrets

**.envrc** - Commit to version control (no secrets):
```bash
# Safe to commit
export PROJECT_NAME="myapp"
export NODE_ENV="development"

# Load secrets from gitignored file
dotenv_if_exists .env
```

**.env** - Do NOT commit (add to `.gitignore`):
```bash
# Secrets - never commit
API_KEY="sk_live_abc123"
DATABASE_PASSWORD="super-secret"
```

### Use .env.example

Provide template without secrets:

```bash
# .env.example (committed)
API_KEY=your-api-key-here
DATABASE_PASSWORD=your-password-here
```

Users copy and fill in:
```bash
cp .env.example .env
# Edit .env with real values
```

### Validate .envrc Changes

direnv requires explicit permission:

```bash
# After editing .envrc
direnv allow .

# Deny if suspicious
direnv deny .
```

### Separate Environments

```bash
# .envrc
case "${ENVIRONMENT:-dev}" in
    production)
        dotenv_if_exists .env.production
        ;;
    staging)
        dotenv_if_exists .env.staging
        ;;
    *)
        dotenv_if_exists .env.development
        ;;
esac
```

## Commands

### Allow/Deny

```bash
direnv allow          # Allow .envrc in current dir
direnv allow /path    # Allow specific .envrc
direnv deny           # Deny .envrc in current dir
```

### Status

```bash
direnv status         # Show configuration status
direnv reload         # Force reload environment
```

### Debugging

```bash
direnv exec . env     # Show all exported variables
direnv exec . bash    # Start shell with environment
```

## Troubleshooting

### .envrc Not Loading

1. Check if direnv is hooked:
   ```bash
   echo $DIRENV_DIR
   # Should show current directory
   ```

2. Reload shell configuration:
   ```bash
   source ~/.bashrc
   ```

3. Allow .envrc explicitly:
   ```bash
   direnv allow
   ```

### Variables Not Exported

Ensure you use `export`:
```bash
# ✗ Won't work outside .envrc
MY_VAR="value"

# ✓ Correctly exported
export MY_VAR="value"
```

### Performance Issues

Disable logging:
```bash
# In .envrc or environment
export DIRENV_LOG_FORMAT=""
```

Cache expensive operations:
```bash
# .envrc
CACHE_FILE=".direnv/cache"
if [ ! -f "$CACHE_FILE" ]; then
    echo "Computing expensive value..."
    expensive-command > "$CACHE_FILE"
fi
export VALUE=$(cat "$CACHE_FILE")
```

### Conflicts with Other Tools

Load direnv last in shell config:
```bash
# .bashrc
eval "$(rbenv init -)"
eval "$(nvm use)"
eval "$(direnv hook bash)"  # Last
```

## Integration

### VS Code

Settings are automatically loaded. Reload window if needed:
- `Cmd/Ctrl + Shift + P` → "Developer: Reload Window"

### Git

Prevent committing secrets:
```bash
# .gitignore
.env
.env.local
.envrc.local
.direnv/
```

### Docker Compose

```bash
# .envrc
export COMPOSE_PROJECT_NAME="${PROJECT_NAME}"
dotenv_if_exists .env
```

Variables are available to `docker-compose.yml`:
```yaml
services:
  app:
    environment:
      - DATABASE_URL=${DATABASE_URL}
```

### CI/CD

Set variables in CI instead of loading .envrc:
```yaml
# .github/workflows/test.yml
env:
  NODE_ENV: test
  DATABASE_URL: postgresql://localhost/test
```

## Best Practices

1. **Commit .envrc** - Share project configuration
2. **Gitignore .env** - Keep secrets local
3. **Use .env.example** - Document required variables
4. **Validate on allow** - Review changes before allowing
5. **Keep it simple** - Complex logic belongs in scripts
6. **Use dotenv** - Separate code from configuration
7. **Namespace variables** - Prefix project-specific vars
8. **Document purpose** - Comment each variable

## Additional Resources

- [direnv Documentation](https://direnv.net/)
- [direnv Wiki](https://github.com/direnv/direnv/wiki)
- [Common Patterns](https://github.com/direnv/direnv/wiki/Python)
- [Security Guide](https://github.com/direnv/direnv/wiki/Security)
