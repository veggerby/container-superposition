#!/bin/bash
# Pre-commit framework setup script

set -e

echo "🔍 Setting up pre-commit framework..."

# Install pre-commit — prefer pipx (avoids --user conflicts inside virtualenvs)
if command -v pipx &> /dev/null; then
    pipx install pre-commit
elif command -v pip3 &> /dev/null; then
    pip3 install pre-commit 2>/dev/null || pip3 install --break-system-packages pre-commit
elif command -v pip &> /dev/null; then
    pip install pre-commit 2>/dev/null || pip install --break-system-packages pre-commit
else
    echo "✗ No pip/pipx found — cannot install pre-commit"
    exit 1
fi

# pipx installs to ~/.local/bin
export PATH="$HOME/.local/bin:$PATH"

# Verify installation
if command -v pre-commit &> /dev/null; then
    echo "✓ pre-commit installed: $(pre-commit --version)"
else
    echo "✗ pre-commit installation failed"
    exit 1
fi

# Create sample .pre-commit-config.yaml if no config exists
if [ ! -f .pre-commit-config.yaml ] && [ ! -f .pre-commit-config.yml ] && [ ! -f .pre-commit-config.json ]; then
    cat > .pre-commit-config.yaml << 'EOF'
# Pre-commit configuration
# See https://pre-commit.com for more information
# Install: pre-commit install
# Run manually: pre-commit run --all-files

repos:
  # General file checks
  - repo: https://github.com/pre-commit/pre-commit-hooks
    rev: v4.5.0
    hooks:
      - id: trailing-whitespace
        args: [--markdown-linebreak-ext=md]
      - id: end-of-file-fixer
      - id: check-yaml
        args: [--safe]
      - id: check-json
      - id: check-toml
      - id: check-added-large-files
        args: [--maxkb=1000]
      - id: check-case-conflict
      - id: check-merge-conflict
      - id: detect-private-key
      - id: mixed-line-ending
        args: [--fix=lf]
      - id: check-executables-have-shebangs
      - id: check-shebang-scripts-are-executable

  # Markdown checks
  - repo: https://github.com/igorshubovych/markdownlint-cli
    rev: v0.39.0
    hooks:
      - id: markdownlint
        args: [--fix]

# Language-specific hooks (uncomment as needed):

# Python
#  - repo: https://github.com/psf/black
#    rev: 24.2.0
#    hooks:
#      - id: black
#
#  - repo: https://github.com/pycqa/isort
#    rev: 5.13.2
#    hooks:
#      - id: isort
#        args: [--profile, black]
#
#  - repo: https://github.com/pycqa/flake8
#    rev: 7.0.0
#    hooks:
#      - id: flake8

# JavaScript/TypeScript
#  - repo: https://github.com/pre-commit/mirrors-eslint
#    rev: v8.56.0
#    hooks:
#      - id: eslint
#        files: \.[jt]sx?$
#        types: [file]
#        additional_dependencies:
#          - eslint@8.56.0
#          - typescript@5.3.3
#
#  - repo: https://github.com/pre-commit/mirrors-prettier
#    rev: v3.1.0
#    hooks:
#      - id: prettier
#        types_or: [javascript, jsx, ts, tsx, json, yaml, markdown]

# Dockerfile
#  - repo: https://github.com/hadolint/hadolint
#    rev: v2.12.0
#    hooks:
#      - id: hadolint-docker

# Shell scripts
#  - repo: https://github.com/shellcheck-py/shellcheck-py
#    rev: v0.9.0.6
#    hooks:
#      - id: shellcheck
EOF
    echo "✓ Sample .pre-commit-config.yaml created"
fi

# Install pre-commit hooks in git repository
if [ -d .git ]; then
    pre-commit install
    echo "✓ Pre-commit hooks installed in repository"
else
    echo "⚠️  Not a git repository - skipping hook installation"
    echo "   Run 'pre-commit install' manually after git init"
fi

# Run pre-commit to install hook environments
pre-commit install-hooks 2>/dev/null || echo "⚠️  Will install hooks on first run"

echo "✓ Pre-commit setup complete"
echo ""
echo "💡 Usage:"
echo "  - Install hooks in repo: pre-commit install"
echo "  - Run on all files: pre-commit run --all-files"
echo "  - Run on changed files: pre-commit run"
echo "  - Update hooks: pre-commit autoupdate"
echo "  - Skip hooks on commit: git commit --no-verify"
