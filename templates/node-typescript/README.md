# Node.js TypeScript Template

Full-featured Node.js development environment with TypeScript, testing, and modern tooling.

## What's Included

### Base Image
- **Microsoft DevContainer**: `base:trixie` (Debian Trixie)
- Minimal base image optimized for DevContainers

### Features (from containers.dev)
- **common-utils**: Zsh, Oh My Zsh, and common development utilities
- **Node.js**: LTS version with npm and Yarn support
- **Git**: Latest version with PPA support
- **Docker-in-Docker**: Build and run containers inside the devcontainer
- **jq-likes**: jq and yq for JSON/YAML processing
- **GitHub CLI**: gh command-line tool
- **Docker-outside-of-Docker**: Access host Docker daemon

### Pre-installed Global Tools
Via pnpm (installed in post-create):
- **TypeScript (tsc)**: TypeScript compiler
- **tsx**: Execute TypeScript files directly
- **tsup**: TypeScript bundler
- **Vitest**: Fast testing framework
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **Turbo**: Build system optimizer

### VS Code Extensions
- **ESLint**: Code linting
- **Prettier**: Code formatting
- **TypeScript**: Next-gen TypeScript support
- **Vitest Explorer**: Visual test runner
- **Docker**: Container management
- **Kubernetes**: Kubernetes support
- **YAML**: YAML language support
- **TOML**: TOML configuration support
- **Markdown**: Markdown linting and editing
- **GitHub Copilot & Copilot Chat**: AI-powered coding assistance
- **Code Spell Checker**: Catch typos
- **GitLens**: Git supercharged
- **EditorConfig**: Maintain consistent coding styles
- **GitHub Pull Request & Actions**: GitHub integration

### Ports
Pre-configured port forwarding with labels:
- `3000` - Application (silent auto-forward)
- `5173` - Vite Dev Server (silent auto-forward)
- `8080` - Alternative Application Port (silent auto-forward)

## Usage

### Copy to Your Project
```bash
cp -r templates/node-typescript/.devcontainer /path/to/your/project/
```

### Open in VS Code
1. Open your project in VS Code
2. Click "Reopen in Container" when prompted
3. Wait for the container to build (first time takes a few minutes)

### Start Developing
The container will:
- Install global development tools via pnpm (TypeScript, tsx, Vitest, ESLint, Prettier, Turbo)
- Configure pnpm with proper paths
- Set up Turbo telemetry disabled
- Configure VS Code with optimal settings
- Enable git safe directory

Run `npm install` or `pnpm install` to install project dependencies if you have a package.json.

## Customization

### Add More Extensions
Edit `.devcontainer/devcontainer.json`:
```json
{
  "customizations": {
    "vscode": {
      "extensions": [
        "your.extension.id"
      ]
    }
  }
}
```

### Add Features
Browse [containers.dev/features](https://containers.dev/features) and add to `devcontainer.json`:
```json
{
  "features": {
    "ghcr.io/devcontainers/features/aws-cli:1": {}
  }
}
```

### Modify Port Forwarding
```json
{
  "forwardPorts": [3000, 4000, 8080]
}
```

## Project Scaffolding

Use with the project-scaffolder feature:
```json
{
  "features": {
    "../../features/project-scaffolder": {
      "template": "express-typescript"
    }
  }
}
```

Then run `scaffold-project express-typescript` inside the container.

## Common Workflows

### Vite + React
```bash
pnpm create vite . --template react-ts
pnpm install
pnpm run dev
```

### Next.js
```bash
pnpx create-next-app@latest . --typescript --tailwind --app --eslint
pnpm install
pnpm run dev
```

### Express API with TypeScript
```bash
pnpm init
pnpm add express
pnpm add -D @types/express @types/node tsx
# Create src/index.ts
pnpm tsx src/index.ts
```

### Testing with Vitest
```bash
pnpm add -D vitest
# Create test files with .test.ts extension
pnpm vitest
```

## Troubleshooting

### Slow package install
Packages are managed by pnpm for faster installs. If issues persist, try:
```bash
pnpm store prune
rm -rf node_modules pnpm-lock.yaml
pnpm install
```

### Global tools not found
Check that pnpm bin directory is in PATH:
```bash
echo $PATH | grep pnpm
# Should include /home/vscode/.local/share/pnpm
```

### Port already in use
Check `forwardPorts` in `devcontainer.json` and adjust as needed.

### Extensions not loading
Rebuild the container: `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"
