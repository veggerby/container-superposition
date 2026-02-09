# Commitlint Overlay

Enforce conventional commit messages for automated releases and changelogs.

## What's Included

- **@commitlint/cli** - Commit message linter
- **@commitlint/config-conventional** - Conventional commits standard
- **commit-msg hook** - Automatic validation on commit
- **Sample configuration** - Ready-to-use commitlint.config.js

## Conventional Commits Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Type (required)

- `feat` - New feature
- `fix` - Bug fix
- `docs` - Documentation changes
- `style` - Code style (formatting, semicolons)
- `refactor` - Code refactoring
- `perf` - Performance improvements
- `test` - Adding/updating tests
- `build` - Build system changes
- `ci` - CI/CD changes
- `chore` - Maintenance tasks
- `revert` - Revert previous commit

### Scope (optional)

Component or module affected by the change:

```
feat(auth): add OAuth2 support
fix(api): handle null responses
```

### Subject (required)

Short description (≤100 chars):

- Use imperative mood ("add" not "added")
- No period at the end
- Lowercase (conventional commits standard)

### Body (optional)

Detailed explanation of the change:

```
feat(auth): add OAuth2 authentication

Implements OAuth2 flow with support for GitHub, Google, and custom
providers. Includes token refresh and automatic retry logic.
```

### Footer (optional)

Breaking changes or issue references:

```
feat(api): redesign authentication API

BREAKING CHANGE: Auth endpoints now require OAuth2 tokens instead of
API keys. Update client code to use new authentication flow.

Fixes #123
Closes #456
```

## Usage

### Committing with Validation

The commit-msg hook automatically validates:

```bash
git commit -m "feat: Add new feature"
# ✓ Passes validation

git commit -m "Added new feature"
# ✗ Fails - missing type
```

### Test Commit Messages

Before committing:

```bash
echo "feat(auth): add OAuth2" | commitlint
# ✓ Valid

echo "Added OAuth2" | commitlint
# ✗ Invalid
```

### Interactive Commits (Commitizen)

Install commitizen for guided commit creation:

```bash
npm install -g commitizen cz-conventional-changelog

# Configure
echo '{ "path": "cz-conventional-changelog" }' > .czrc

# Use instead of git commit
git cz
```

### Skip Validation

For exceptional cases:

```bash
git commit --no-verify -m "WIP: temporary commit"
```

## Configuration

### commitlint.config.js

The overlay creates a comprehensive configuration:

```javascript
module.exports = {
  extends: ['@commitlint/config-conventional'],
  rules: {
    'type-enum': [2, 'always', ['feat', 'fix', 'docs', ...]],
    'subject-case': [2, 'always', 'lower-case'],
    'subject-max-length': [2, 'always', 100],
  }
};
```

### Customizing Rules

Edit `commitlint.config.js`:

```javascript
module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        // Custom types
        'type-enum': [
            2,
            'always',
            [
                'feat',
                'fix',
                'docs',
                'custom-type', // Add your type
            ],
        ],

        // Allow longer subjects
        'subject-max-length': [2, 'always', 150],

        // Disable scope requirement
        'scope-empty': [0],
    },
};
```

### Scopes

Define allowed scopes:

```javascript
module.exports = {
    extends: ['@commitlint/config-conventional'],
    rules: {
        'scope-enum': [2, 'always', ['core', 'ui', 'api', 'auth', 'tests']],
    },
};
```

## Integration with Semantic Release

Commitlint works seamlessly with semantic-release:

1. Install semantic-release:

```bash
npm install --save-dev semantic-release
```

2. Configure `.releaserc.json`:

```json
{
    "branches": ["main"],
    "plugins": [
        "@semantic-release/commit-analyzer",
        "@semantic-release/release-notes-generator",
        "@semantic-release/changelog",
        "@semantic-release/npm",
        "@semantic-release/github"
    ]
}
```

3. Commits generate versions:
    - `feat:` → Minor version (1.0.0 → 1.1.0)
    - `fix:` → Patch version (1.0.0 → 1.0.1)
    - `BREAKING CHANGE:` → Major version (1.0.0 → 2.0.0)

## Integration with Pre-commit

Combine with pre-commit framework:

```yaml
# .pre-commit-config.yaml
repos:
    - repo: https://github.com/alessandrojcm/commitlint-pre-commit-hook
      rev: v9.11.0
      hooks:
          - id: commitlint
            stages: [commit-msg]
            additional_dependencies: ['@commitlint/config-conventional']
```

## Examples

### Good Commit Messages

```
feat(auth): add Google OAuth2 provider

fix(api): handle null responses in user endpoint
Fixes #123

docs: update installation guide

refactor(core): simplify error handling

perf(query): optimize database queries
Reduces query time by 50%

test(api): add integration tests for auth endpoints

build(deps): bump axios to v1.6.0

ci: add automated release workflow

chore: update .gitignore
```

### Bad Commit Messages

```
Added OAuth2
❌ Missing type

feat: added oauth2
❌ Wrong tense (should be "add")

Feat(Auth): add OAuth2
❌ Type should be lowercase, scope should be lowercase

feat(auth): add OAuth2.
❌ Subject should not end with period

feat(auth): added oauth2 support for google and github providers
❌ Subject too long, wrong tense
```

## Troubleshooting

### Hook Not Running

Ensure hook is executable:

```bash
chmod +x .git/hooks/commit-msg
```

Reinstall hook:

```bash
bash .devcontainer/commitlint-setup.sh
```

### Validation Fails

Check your message:

```bash
echo "your message" | commitlint
```

View rules:

```bash
commitlint --print-config
```

### Skip Validation (Emergency)

```bash
git commit --no-verify -m "emergency fix"
```

## Best Practices

1. **Write meaningful subjects** - Clear, concise descriptions
2. **Use imperative mood** - "Add feature" not "Added feature"
3. **Reference issues** - Include "Fixes #123" in footer
4. **Document breaking changes** - Use BREAKING CHANGE: prefix
5. **Keep scope consistent** - Define scopes in config
6. **Use body for context** - Explain the "why" not the "what"

## Team Guidelines

1. **Commit early and often** - Small, focused commits
2. **One change per commit** - Easier to review and revert
3. **Link to issues** - Traceability
4. **Review before merge** - Validate commit messages in PRs
5. **Automate releases** - Use semantic-release for changelog generation

## Additional Resources

- [Conventional Commits Specification](https://www.conventionalcommits.org/)
- [Commitlint Documentation](https://commitlint.js.org/)
- [Semantic Release](https://semantic-release.gitbook.io/)
- [Commitizen](https://github.com/commitizen/cz-cli)
