# container-superposition

Composable devcontainer scaffolds that collapse into working environments.

## 🎯 Purpose

Container Superposition provides ready-to-copy devcontainer scaffolds that "collapse" into fully functional development environments. These templates leverage official [containers.dev](https://containers.dev) images and features while providing opinionated, solution-ready configurations for common development scenarios.

**Key Principles:**
- **Leverage, Don't Duplicate** - Use official images and features from containers.dev
- **Opinionated Templates** - Pre-configured for specific use cases
- **Copy-Paste Ready** - Works immediately, customize as needed
- **Composable** - Mix and match custom features with official ones

## 📁 Structure

```
container-superposition/
├── templates/          # Complete, solution-ready devcontainer setups
├── features/           # Custom features not available on containers.dev
├── tool/               # Guided initialization tool
└── scripts/            # CLI entry points
```

### `/templates` - Solution-Ready Scaffolds

Complete `.devcontainer` configurations that work out of the box. Each template includes:
- `devcontainer.json` - Uses official base images with curated features
- `Dockerfile` (when needed) - Only for unique customizations
- Scripts for project-specific setup and workflows
- README with usage instructions and customization guide

### `/tool` - Initialization Tool

A **humble "purpose picker"** that guides you through creating your first devcontainer:
- Interactive questionnaire (5–8 questions)
- Composes base templates with overlays
- Outputs plain, editable `.devcontainer/` folders
- Gets out of your way afterward

**Philosophy**: Generate once, edit forever. No framework lock-in.

Available templates:
- **node-typescript** - Node.js with TypeScript, testing, and modern tooling
- **dotnet-webapi** - C# ASP.NET Core Web API development
- **python-mkdocs** - Documentation with MkDocs and Material theme

### `/features` - Custom Building Blocks

**Only** custom features that add value beyond what's available on containers.dev:
- **project-scaffolder** - Interactive project initialization scripts
- **team-conventions** - Shared linting, formatting, commit standards
- **local-secrets-manager** - Safe local development secrets (never committed)

## 🚀 Quick Start

### Option 1: Use the Init Tool (Recommended)

The guided initialization tool helps you pick the right template and compose additional features with a beautiful, interactive experience:

```bash
# Clone the repository
git clone https://github.com/veggerby/container-superposition.git
cd container-superposition

# Install dependencies
npm install

# Run the interactive setup
npm run init
```

You'll be greeted with a color-coded, visually enhanced questionnaire featuring:
- 🎨 Beautiful boxed headers and summaries
- ⏳ Animated progress spinners
- ✅ Visual confirmation of selections
- 🎯 Clear configuration summary

**Non-interactive mode:**
```bash
npm run init -- --stack dotnet --postgres --docker
npm run init -- --stack node-typescript --playwright --cloud-tools azure-cli
npm run init -- --help  # Professional help text
```

See [tool/README.md](tool/README.md) for full documentation and [tool/docs/ux.md](tool/docs/ux.md) for visual examples.

### Option 2: Manual Copy (For Direct Control)

1. **Browse templates** in the `/templates` directory
2. **Copy a template** to your project:
   ```bash
   cp -r templates/node-typescript/.devcontainer /path/to/your/project/
   ```
3. **Open in VS Code** with the Dev Containers extension
4. **Reopen in Container** - your environment is ready!

## 🔧 Tool Architecture

The initialization tool follows the **thin picker** philosophy:

- **Questionnaire**: 5–8 questions to understand your needs
- **Composition**: Merges base templates with lightweight overlays
- **Output**: Plain `.devcontainer/` folder — fully editable, no lock-in
- **Overlays**: Add-ons for databases (Postgres, Redis), Playwright, cloud tools, etc.

**Key Design Decisions:**
- ✅ Generate once, edit forever (no "sync" or "update")
- ✅ Output is standard JSON — no proprietary formats
- ✅ Tool is optional — templates work standalone
- ✅ Cross-platform via Node.js/TypeScript

See [tool/README.md](tool/README.md) for architecture details.

## 🔧 Customization

### Using Official Features

All templates use official features from [containers.dev/features](https://containers.dev/features). Add more by editing `devcontainer.json`:

```json
{
  "features": {
    "ghcr.io/devcontainers/features/node:1": {},
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "ghcr.io/devcontainers/features/github-cli:1": {}
  }
}
```

### Adding Custom Features

Use our custom features for specialized needs:

```json
{
  "features": {
    "./features/project-scaffolder": {"template": "express-api"},
    "./features/team-conventions": {"preset": "airbnb"}
  }
}
```

### Mixing Templates

Start with one template and enhance it:
- Add features from containers.dev
- Include custom features from this repo
- Copy useful scripts from other templates

## 📦 Design Principles

- **Copy-Paste First** - Templates should work immediately without modification
- **Fast Builds** - Optimized Dockerfiles with layer caching
- **Composability** - Features can be mixed and matched
- **Minimal Bloat** - Only include what's needed
- **No Lock-In** - Standard devcontainer format, works anywhere

## 🏗️ Building Your Own Template

Create a custom template for your team or project:

1. **Start with an official base** from [containers.dev/images](https://containers.dev/images)
2. **Add official features** from [containers.dev/features](https://containers.dev/features)
3. **Include custom features** from this repo for specialized needs
4. **Add project scripts** for your specific workflow
5. **Test thoroughly** - build and verify all tools work
6. **Document** - explain what's included and why

Example `devcontainer.json` structure:
```json
{
  "name": "My Custom Template",
  "image": "mcr.microsoft.com/devcontainers/typescript-node:20",
  "features": {
    "ghcr.io/devcontainers/features/docker-in-docker:2": {},
    "./features/team-conventions": {}
  },
  "postCreateCommand": "npm install && npm run setup",
  "customizations": {
    "vscode": {
      "extensions": ["dbaeumer.vscode-eslint", "esbenp.prettier-vscode"]
    }
  }
}
```

## 📚 Learn More

- [VS Code Dev Containers Documentation](https://code.visualstudio.com/docs/devcontainers/containers)
- [Dev Container Specification](https://containers.dev/)
- [Docker Best Practices](https://docs.docker.com/develop/dev-best-practices/)

## 🤝 Contributing

Have a useful template or feature? Contributions welcome! Keep it:
- Minimal and focused
- Well-documented
- Fast to build
- Easy to understand

## 📄 License

MIT License - use freely in your projects.
