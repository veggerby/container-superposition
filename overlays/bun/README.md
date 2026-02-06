# Bun Overlay

Adds Bun runtime - an all-in-one JavaScript runtime, bundler, test runner, and package manager that's faster than Node.js.

## Features

- **Bun** - Latest version of the Bun runtime
- **Built-in bundler** - Fast bundling without webpack/vite
- **Built-in test runner** - Jest-compatible testing
- **Built-in package manager** - npm-compatible, faster installs
- **TypeScript support** - Native TypeScript execution
- **Node.js compatibility** - Runs most Node.js packages
- **VS Code Extensions:**
  - Bun for Visual Studio Code (oven.bun-vscode)
  - ESLint (dbaeumer.vscode-eslint)
  - Prettier (esbenp.prettier-vscode)

## How It Works

This overlay installs Bun via the official installation script. Bun is a drop-in replacement for Node.js with significantly faster startup times and module resolution. It includes Node.js LTS for compatibility with packages that require native Node.js APIs.

**Installation method:**
- Bun via official install script
- Node.js LTS for compatibility
- Installed to ~/.bun

## Common Commands

### Package Management

```bash
# Install dependencies (npm-compatible)
bun install

# Add package
bun add express

# Add dev dependency
bun add -d typescript

# Remove package
bun remove express

# Update all dependencies
bun update

# Global install
bun add -g typescript
```

### Running Scripts

```bash
# Run TypeScript/JavaScript directly
bun run index.ts
bun run server.js

# Run package.json script
bun run dev
bun run build
bun run test

# Run with watch mode
bun --watch run index.ts
```

### Building and Bundling

```bash
# Bundle application
bun build ./index.tsx --outdir ./dist

# Bundle with minification
bun build ./index.tsx --minify --outdir ./dist

# Bundle for production
bun build ./index.tsx --minify --sourcemap --outdir ./dist

# Create standalone executable
bun build ./cli.ts --compile --outfile mycli
```

### Testing

```bash
# Run tests (Jest-compatible)
bun test

# Run specific test file
bun test file.test.ts

# Watch mode
bun test --watch

# Coverage
bun test --coverage
```

### HTTP Server

```bash
# Create simple server (built-in)
bun run server.ts

# Example server.ts:
cat > server.ts << 'EOF'
const server = Bun.serve({
  port: 3000,
  fetch(request) {
    return new Response("Hello from Bun!");
  },
});

console.log(`Listening on http://localhost:${server.port}`);
EOF

bun run server.ts
```

## Use Cases

- **Modern web applications** - React, Vue, Svelte with faster builds
- **API servers** - High-performance REST/GraphQL APIs
- **CLI tools** - Fast command-line applications
- **Microservices** - Lightweight services with fast cold starts
- **Edge functions** - Serverless functions with quick startup
- **Full-stack apps** - Next.js, Remix with Bun runtime

**Integrates well with:**
- `postgres`, `redis`, `mysql` - Database drivers (pg, ioredis, mysql2)
- `docker-sock` - Docker SDK (dockerode)
- `prometheus` - Metrics collection (prom-client)

## Configuration

### bunfig.toml

Create `bunfig.toml` in project root:

```toml
[install]
# Configure package manager
production = false
optional = true
dev = true

# Registry
registry = "https://registry.npmjs.org"

[test]
# Test configuration
coverage = true
```

### tsconfig.json

Bun works with standard TypeScript configuration:

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "types": ["bun-types"]
  }
}
```

## Application Integration

### Web Server with Bun

```typescript
// server.ts
const server = Bun.serve({
  port: 3000,
  fetch(req) {
    const url = new URL(req.url);
    
    if (url.pathname === "/") {
      return new Response("Hello from Bun!");
    }
    
    if (url.pathname === "/json") {
      return Response.json({ message: "JSON response" });
    }
    
    return new Response("Not Found", { status: 404 });
  },
});

console.log(`Server running on http://localhost:${server.port}`);
```

**Run:**
```bash
bun run server.ts
# Access at http://localhost:3000
```

### React with Bun

```bash
# Create React app
bun create react myapp
cd myapp

# Install dependencies
bun install

# Run dev server
bun run dev
```

### PostgreSQL with Bun

```typescript
import postgres from 'postgres';

const sql = postgres('postgres://postgres:postgres@postgres/mydb');

const users = await sql`SELECT * FROM users`;
console.log(users);
```

## Performance Comparison

| Operation | Bun | Node.js | Speedup |
|-----------|-----|---------|---------|
| **Package install** | 5s | 25s | 5x faster |
| **Cold start** | 50ms | 200ms | 4x faster |
| **Bundling** | 2s | 10s | 5x faster |
| **Test execution** | 1s | 5s | 5x faster |

*Approximate benchmarks for typical projects*

## Troubleshooting

### Issue: Package compatibility

**Symptoms:**
- Package doesn't work with Bun
- Native module errors

**Solution:**
```bash
# Use Node.js for specific commands
node script.js

# Or install with npm
npm install problematic-package
```

### Issue: TypeScript types

**Symptoms:**
- Missing type definitions for Bun APIs

**Solution:**
```bash
# Install Bun types
bun add -d bun-types

# Add to tsconfig.json
{
  "compilerOptions": {
    "types": ["bun-types"]
  }
}
```

### Issue: Bun not in PATH

**Solution:**
```bash
# Add to shell profile
export BUN_INSTALL="$HOME/.bun"
export PATH="$BUN_INSTALL/bin:$PATH"

# Reload shell
source ~/.bashrc
```

## References

- [Official Bun Documentation](https://bun.sh/docs) - Complete Bun documentation
- [Bun API Reference](https://bun.sh/docs/api) - Built-in APIs
- [Bun vs Node.js](https://bun.sh/docs/runtime/nodejs-apis) - Compatibility guide
- [Bun Examples](https://github.com/oven-sh/bun/tree/main/examples) - Sample projects

**Related Overlays:**
- `postgres` - PostgreSQL with pg driver
- `redis` - Redis with ioredis
- `docker-sock` - Docker access
- `prometheus` - Metrics with prom-client

## Notes

- **Node.js Compatibility:** Bun aims for Node.js compatibility but some packages may not work
- **Native Modules:** Some native Node.js modules may require Node.js runtime
- **Ecosystem Maturity:** Bun is newer than Node.js; some tools may have limited support
- **Production Use:** Evaluate thoroughly before production deployment
