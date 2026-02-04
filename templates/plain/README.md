# Plain Template

Minimal devcontainer with Debian base image and essential tools.

## What's Included

- Debian base image
- Git
- Zsh + Oh My Zsh
- Basic utilities (curl, wget, vim, less)
- VS Code essentials (EditorConfig, Copilot)

## Usage

This template provides a clean starting point. Add language/framework overlays as needed:

```bash
npm run init -- --stack plain --overlay dotnet,nodejs
```
