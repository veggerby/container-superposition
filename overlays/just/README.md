# Just Task Runner Overlay

Simple, fast, and powerful task runner using `just` (Rust-based).

## What's Included

- **just** - Command runner (v1.25.2)
- **Sample Justfile** - Ready-to-use task definitions
- **Shell completion** - Tab completion for bash/zsh
- **Common tasks** - Build, test, lint, dev server patterns

## Why Just?

- **Simple syntax** - Easier than Makefiles
- **Fast** - Rust-based, minimal overhead
- **Cross-platform** - Works on Linux, macOS, Windows
- **No dependencies** - Single binary
- **Great UX** - Clear errors, helpful messages
- **Popular** - 18k+ GitHub stars, widely adopted

## Quick Start

List available tasks:

```bash
just --list
# or simply
just
```

Run a task:

```bash
just build
just test
just dev
```

## Justfile Syntax

### Basic Task

```just
# Simple task
hello:
    echo "Hello, world!"
```

### Task with Arguments

```just
# Task with parameters
greet name:
    echo "Hello, {{name}}!"

# Usage: just greet "Alice"
```

### Task Dependencies

```just
# Task that depends on others
deploy: build test
    ./deploy.sh
```

### Variables

```just
# Set variables
version := "1.0.0"

show-version:
    echo "Version: {{version}}"
```

### Conditional Execution

```just
# Run only if condition is true
test:
    #!/usr/bin/env bash
    if [ -f package.json ]; then
        npm test
    fi
```

### Environment Variables

```just
# Export environment variable
export DATABASE_URL := "postgres://localhost/db"

migrate:
    ./migrate.sh
```

## Sample Justfile Tasks

The generated Justfile includes:

### Development Tasks

- `install` - Install dependencies
- `build` - Build the project
- `dev` - Start development server
- `serve` - Start production server
- `clean` - Remove build artifacts

### Quality Tasks

- `test` - Run tests
- `test-watch` - Run tests in watch mode
- `lint` - Run linter
- `lint-fix` - Fix linting issues
- `format` - Format code
- `check` - Run all checks (lint + test + build)

### Git Tasks

- `git-status` - Show git status
- `git-log` - Show recent commits

### Docker Tasks

- `docker-up` - Start containers
- `docker-down` - Stop containers
- `docker-logs` - View logs

### Database Tasks

- `db-migrate` - Run migrations
- `db-seed` - Seed database
- `db-reset` - Reset database

## Advanced Features

### Private Tasks

Prefix with underscore:

```just
# Won't show in --list
_internal:
    echo "Internal task"

public: _internal
    echo "Public task"
```

### Default Recipe

```just
# Runs when you type `just`
default:
    @just --list
```

### Recipe Parameters with Defaults

```just
# Parameter with default value
deploy env="staging":
    ./deploy.sh {{env}}

# Usage:
# just deploy           -> uses "staging"
# just deploy prod      -> uses "prod"
```

### Multi-line Commands

```just
complex:
    #!/usr/bin/env bash
    set -euxo pipefail
    echo "Starting complex task"
    for i in {1..5}; do
        echo "Step $i"
    done
```

### Command Evaluation

```just
# Backticks execute commands
now := `date +%Y-%m-%d`

backup:
    cp data.db "data-{{now}}.db"
```

### Conditional Recipes

```just
# Different behavior per OS
install-deps:
    #!/usr/bin/env bash
    if [[ "$OSTYPE" == "linux-gnu"* ]]; then
        apt-get install -y nodejs
    elif [[ "$OSTYPE" == "darwin"* ]]; then
        brew install node
    fi
```

### .env File Support

```just
# Load .env file
set dotenv-load

# Now all .env variables are available
show-db:
    echo $DATABASE_URL
```

## Common Patterns

### Node.js Project

```just
install:
    npm install

dev:
    npm run dev

build:
    npm run build

test:
    npm test

lint:
    npm run lint

format:
    npm run format
```

### Python Project

```just
install:
    pip install -r requirements.txt

test:
    pytest

lint:
    pylint src/

format:
    black src/

run:
    python -m src.main
```

### Docker Project

```just
build:
    docker build -t myapp .

run:
    docker run -p 8080:8080 myapp

up:
    docker-compose up -d

down:
    docker-compose down

logs:
    docker-compose logs -f
```

## Tips and Tricks

### Suppress Command Echo

Use `@` prefix:

```just
# Shows command and output
loud:
    echo "I'm loud!"

# Shows only output
quiet:
    @echo "I'm quiet!"
```

### Ignore Errors

Use `-` prefix:

```just
# Continue even if command fails
cleanup:
    -rm -rf temp/
    -docker stop container || true
```

### List Recipes

```bash
just --list        # List all recipes
just --list --unsorted  # List in file order
just --show <recipe>    # Show recipe definition
```

### Dry Run

```bash
just --dry-run build   # Show what would run
```

### Working Directory

```bash
just --working-directory /path/to/dir build
```

### Choose Recipe Interactively

```bash
just --choose   # Interactive selection
```

## Customization

### Set Options

```just
# Set shell
set shell := ["bash", "-c"]

# Set working directory
set working-directory := "./src"

# Enable .env loading
set dotenv-load
```

### Aliases

```just
alias b := build
alias t := test
alias d := dev

# Now you can use: just b, just t, just d
```

## Debugging

### Verbose Output

```bash
just --verbose build
```

### Show Recipe

```bash
just --show build
```

### Evaluate Justfile

```bash
just --evaluate
```

## Integration with Pre-commit

Add to `.pre-commit-config.yaml`:

```yaml
repos:
    - repo: local
      hooks:
          - id: just-lint
            name: Run just lint
            entry: just lint
            language: system
            pass_filenames: false
```

## Best Practices

1. **Use @echo for user feedback** - Make tasks informative
2. **Group related tasks** - Keep Justfile organized
3. **Document tasks** - Add comments above recipes
4. **Use dependencies** - Compose tasks from smaller tasks
5. **Set default task** - Make `just` without args useful
6. **Keep tasks simple** - Complex logic belongs in scripts
7. **Use variables** - DRY principle
8. **Test on clean state** - Ensure tasks work from scratch

## Migration from Make

| Make                 | Just                    |
| -------------------- | ----------------------- |
| `target: dependency` | `recipe: dependency`    |
| `$(var)`             | `{{var}}`               |
| `@command`           | `@command`              |
| `.PHONY: target`     | (not needed)            |
| `export VAR=value`   | `export VAR := "value"` |

## Troubleshooting

### Command Not Found

Ensure just is in PATH:

```bash
which just
# Should output: /usr/local/bin/just
```

### Justfile Syntax Error

Use `just --evaluate` to check syntax.

### Recipe Not Found

```bash
just --list   # Verify recipe exists
```

### Working Directory Issues

Use absolute paths or `set working-directory`.

## Additional Resources

- [Just Documentation](https://just.systems/)
- [Just GitHub Repository](https://github.com/casey/just)
- [Just Examples](https://github.com/casey/just#recipes)
- [Justfile Cheatsheet](https://cheatography.com/linux-china/cheat-sheets/justfile/)
