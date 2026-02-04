# Usage Examples

Common usage patterns for the init tool.

## Interactive Mode

```bash
npm run init
```

Follow the prompts to select your stack, database, tools, and output location.

## Non-Interactive Examples

### .NET with PostgreSQL

```bash
npm run init -- --stack dotnet --postgres --output ./.devcontainer
```

Creates:
- .NET 10 base configuration
- PostgreSQL 16 service
- Database client tools
- Environment variables for connection

### Node.js with Full Stack

```bash
npm run init -- \
  --stack node-typescript \
  --playwright \
  --cloud-tools azure-cli,kubectl-helm
```

Creates:
- Node.js LTS with TypeScript
- Playwright with Chromium
- Azure CLI tools
- kubectl + Helm

### Fullstack with Everything

```bash
npm run init -- \
  --stack fullstack \
  --db postgres+redis \
  --playwright \
  --docker
```

Creates:
- Polyglot base (Node + Python)
- PostgreSQL and Redis services
- Playwright browser testing
- Docker-in-Docker enabled

### Minimal Python

```bash
npm run init -- --stack python-mkdocs --output ./my-docs/.devcontainer
```

Creates:
- Python 3 with MkDocs
- Documentation tools
- Minimal configuration

## Programmatic Usage

```javascript
import { composeDevContainer } from './tool/questionnaire/composer.js';

await composeDevContainer({
  stack: 'dotnet',
  needsDocker: true,
  database: 'postgres',
  playwright: false,
  cloudTools: [],
  outputPath: './.devcontainer',
});
```

## Output Structure

All examples produce:

```
.devcontainer/
├── devcontainer.json              # Merged configuration
├── scripts/
│   └── post_create.sh             # Setup scripts
├── docker-compose.postgres.yml    # If postgres selected
└── docker-compose.redis.yml       # If redis selected
```

## Customization After Generation

The output is plain JSON - edit directly:

```jsonc
// .devcontainer/devcontainer.json
{
  "name": "My Custom Name",  // Change this
  "features": {
    // Add/remove features
    "ghcr.io/devcontainers/features/go:1": {}
  },
  "forwardPorts": [3000, 8080],  // Adjust ports
  "remoteEnv": {
    "MY_VAR": "value"  // Add environment variables
  }
}
```

The tool gets you started—you customize from there.

## Help and Documentation

```bash
# Show all options
npm run init -- --help

# Show version
npm run init -- --version
```

## Common Patterns

### Development with Database

Most common pattern for backend services:

```bash
npm run init -- --stack dotnet --postgres --docker
```

### Frontend with Testing

Common for frontend applications:

```bash
npm run init -- --stack node-typescript --playwright
```

### Cloud-Native Development

For Kubernetes/cloud development:

```bash
npm run init -- --stack dotnet --db redis --cloud-tools kubectl-helm,azure-cli
```

### Documentation Sites

For documentation projects:

```bash
npm run init -- --stack python-mkdocs
```
