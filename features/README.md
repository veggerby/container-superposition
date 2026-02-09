# Custom Features

**Only** custom features that add value beyond what's available on [containers.dev](https://containers.dev/features).

## Philosophy

We **do not** replicate existing features. Use official features from containers.dev for:

- Git, Docker-in-Docker, common utilities
- Language runtimes (Node, Python, Go, etc.)
- Cloud CLIs (AWS, Azure, GCP)
- Common development tools

This directory contains **unique** features that solve specific problems not addressed by official features.

## Available Custom Features

### cross-distro-packages

**NEW**: Cross-distribution package manager with automatic distro detection.

- Supports apt (Debian/Ubuntu) and apk (Alpine)
- Single feature declaration for multi-distro compatibility
- Eliminates duplicated package installation logic
- Clean package manager cache cleanup

### project-scaffolder

Interactive project initialization for common frameworks and patterns.

- Express API, NestJS, Next.js scaffolding
- Test setup with Vitest/Jest
- CI/CD configuration templates
- Interactive CLI prompts

### team-conventions

Shared code quality and style enforcement for teams.

- Pre-configured ESLint, Prettier, commitlint
- Husky pre-commit hooks
- Team-specific linting rules
- Consistent formatting across projects

### local-secrets-manager

Safe local development secrets management (never committed to git).

- `.env.local` template generation
- Secret validation and loading
- Integration with VS Code settings
- Prevents accidental commits of secrets

## Using These Features

Add to your `devcontainer.json` alongside official features:

```json
{
    "features": {
        "ghcr.io/devcontainers/features/node:1": { "version": "20" },
        "ghcr.io/devcontainers/features/git:1": {},
        "./features/project-scaffolder": { "template": "express-typescript" },
        "./features/team-conventions": { "preset": "airbnb" }
    }
}
```

## Creating Custom Features

Only add features here that:

1. **Aren't available** on containers.dev
2. **Solve real problems** for multiple projects
3. **Are composable** - work with official features
4. **Are well-tested** and documented

Feature structure:

```
features/my-feature/
├── devcontainer-feature.json  # Metadata
├── install.sh                  # Installation script
└── README.md                   # Documentation
```
