# Plain Template

Minimal devcontainer with Debian base image and essential tools.

## What's Included

- Debian base image
- Git
- Zsh + Oh My Zsh
- Basic utilities (curl, wget, vim, less)
- VS Code essentials (EditorConfig, Copilot)

## Usage

This template provides a clean starting point. Discover and inspect a language overlay with `npm run init -- list` and `npm run init -- explain nodejs`, then record shared intent:

```yaml
# superposition.yml
stack: plain
overlays:
    - nodejs
```

Preview before writing:

```bash
npm run init -- plan --stack plain --overlays nodejs
npm run init -- init --no-interactive
```

Note: Plain template supports single language overlay. For multiple languages, use the compose template.
