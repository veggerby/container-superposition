# Pre-commit Framework Overlay

Automated code quality gates with the pre-commit framework.

## What's Included

- **pre-commit framework** - Git hook scripts for identifying issues
- **Sample configuration** - Ready-to-use `.pre-commit-config.yaml`
- **Common hooks** - Language-agnostic file checks
- **Language-specific hooks** - Commented examples for Python, JavaScript, Shell

## Quick Start

The overlay automatically:

1. Installs the pre-commit framework
2. Creates a sample `.pre-commit-config.yaml` (if not present)
3. Installs pre-commit hooks in your Git repository

## Configuration

### Sample Configuration

A comprehensive `.pre-commit-config.yaml` is created with:

**General Hooks** (enabled by default):

- `trailing-whitespace` - Remove trailing whitespace
- `end-of-file-fixer` - Ensure files end with newline
- `check-yaml` - Validate YAML syntax
- `check-json` - Validate JSON syntax
- `check-toml` - Validate TOML syntax
- `check-added-large-files` - Prevent large files (>1MB)
- `check-case-conflict` - Prevent case-insensitive conflicts
- `check-merge-conflict` - Detect merge conflict markers
- `detect-private-key` - Prevent committing private keys
- `mixed-line-ending` - Normalize line endings to LF
- `markdownlint` - Markdown linting with auto-fix

**Language-Specific Hooks** (commented out - uncomment as needed):

- Python: black, isort, flake8
- JavaScript/TypeScript: ESLint, Prettier
- Dockerfile: hadolint
- Shell: shellcheck

### Customizing Configuration

Edit `.pre-commit-config.yaml` to:

- Add/remove hooks
- Configure hook arguments
- Update hook versions

Example - Enable Python hooks:

```yaml
repos:
    - repo: https://github.com/psf/black
      rev: 24.2.0
      hooks:
          - id: black
```

## Usage

### Install Hooks

If not auto-installed during setup:

```bash
pre-commit install
```

### Run Manually

```bash
# Run on all files
pre-commit run --all-files

# Run on staged files only
pre-commit run

# Run specific hook
pre-commit run trailing-whitespace

# Run on specific files
pre-commit run --files path/to/file.py
```

### Update Hooks

Update hook versions to latest:

```bash
pre-commit autoupdate
```

### Skip Hooks

Skip hooks for a specific commit:

```bash
git commit --no-verify
# or
git commit -n
```

Skip specific hook:

```yaml
# In .pre-commit-config.yaml
- id: trailing-whitespace
  skip: true # Temporarily skip this hook
```

## Common Hooks

### File Safety Hooks

- **check-added-large-files**: Prevents commits of files >1MB
- **detect-private-key**: Scans for private keys/secrets
- **check-case-conflict**: Prevents case-sensitivity issues

### File Format Hooks

- **trailing-whitespace**: Removes trailing spaces
- **end-of-file-fixer**: Ensures newline at end of file
- **mixed-line-ending**: Normalizes to LF (Unix style)

### Syntax Validation

- **check-yaml**: Validates YAML files (safe mode)
- **check-json**: Validates JSON syntax
- **check-toml**: Validates TOML syntax

### Merge Safety

- **check-merge-conflict**: Detects `<<<<<<` markers
- **check-executables-have-shebangs**: Ensures scripts have `#!/...`

## Integration with CI/CD

Run pre-commit in CI pipelines:

```yaml
# GitHub Actions example
- name: Run pre-commit
  uses: pre-commit/action@v3.0.0
```

Or manually:

```bash
# In CI script
pre-commit run --all-files
```

## Language-Specific Examples

### Python Project

Uncomment in `.pre-commit-config.yaml`:

```yaml
- repo: https://github.com/psf/black
  rev: 24.2.0
  hooks:
      - id: black

- repo: https://github.com/pycqa/isort
  rev: 5.13.2
  hooks:
      - id: isort
        args: [--profile, black]
```

### JavaScript/TypeScript Project

Uncomment in `.pre-commit-config.yaml`:

```yaml
- repo: https://github.com/pre-commit/mirrors-prettier
  rev: v3.1.0
  hooks:
      - id: prettier
        types_or: [javascript, jsx, ts, tsx, json, yaml, markdown]
```

### Shell Scripts

Uncomment in `.pre-commit-config.yaml`:

```yaml
- repo: https://github.com/shellcheck-py/shellcheck-py
  rev: v0.9.0.6
  hooks:
      - id: shellcheck
```

## Troubleshooting

### Hooks Not Running

Ensure hooks are installed:

```bash
pre-commit install
```

### Hook Failures

Run with verbose output:

```bash
pre-commit run --all-files --verbose
```

### Clearing Hook Cache

Remove cached hook environments:

```bash
pre-commit clean
pre-commit install-hooks
```

### Updating Hook Versions

```bash
pre-commit autoupdate
```

## Best Practices

1. **Run before first commit**: `pre-commit run --all-files`
2. **Update regularly**: `pre-commit autoupdate` monthly
3. **Team consistency**: Commit `.pre-commit-config.yaml` to version control
4. **CI validation**: Run pre-commit in CI to enforce on PRs
5. **Skip sparingly**: Use `--no-verify` only when necessary

## Performance Tips

- Use `files` regex to limit hook scope
- Enable `fail_fast: true` to stop on first failure
- Use `stages: [commit]` to run only on commit (not push)

Example:

```yaml
repos:
    - repo: https://github.com/pre-commit/pre-commit-hooks
      rev: v4.5.0
      hooks:
          - id: trailing-whitespace
            files: \.(py|js|ts)$ # Only Python and JS files
```

## Additional Resources

- [Pre-commit Documentation](https://pre-commit.com)
- [Supported Hooks](https://pre-commit.com/hooks.html)
- [Creating Custom Hooks](https://pre-commit.com/#new-hooks)
