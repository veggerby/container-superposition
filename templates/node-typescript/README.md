# Node.js TypeScript Template

Full-featured Node.js development environment with TypeScript, testing, and modern tooling.

## What's Included

### Base Image
- **Microsoft DevContainer**: `typescript-node:1-20-bookworm`
- Node.js 20 LTS
- TypeScript pre-installed
- Debian-based environment

### Features (from containers.dev)
- **Git**: Latest version with enhanced functionality
- **Docker-in-Docker**: Build and run containers inside the devcontainer
- **GitHub CLI**: Interact with GitHub from the terminal

### VS Code Extensions
- ESLint - Code linting
- Prettier - Code formatting
- Jest - Test runner integration
- Playwright - E2E testing
- Tailwind CSS - CSS intellisense
- Pretty TypeScript Errors - Better error messages
- Code Spell Checker - Catch typos

### Ports
Pre-configured port forwarding:
- `3000` - Common dev server port
- `5173` - Vite dev server
- `8080` - Alternative server port

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
- Install npm/pnpm/yarn globally
- Run `npm install` if package.json exists
- Setup git hooks if Husky is configured
- Configure VS Code with optimal settings

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

### Express API
```bash
npm init -y
npm install express
npm install -D @types/express typescript tsx
npx tsc --init
# Edit tsconfig.json and create src/index.ts
npm run dev
```

### Vite + React
```bash
npm create vite@latest . -- --template react-ts
npm install
npm run dev
```

### Next.js
```bash
npx create-next-app@latest . --typescript --tailwind --app --eslint
npm run dev
```

## Troubleshooting

### Slow npm install
The `.npmrc` file configures caching. If issues persist, try:
```bash
npm cache clean --force
rm -rf node_modules package-lock.json
npm install
```

### Port already in use
Check `forwardPorts` in `devcontainer.json` and adjust as needed.

### Extensions not loading
Rebuild the container: `Ctrl+Shift+P` → "Dev Containers: Rebuild Container"
