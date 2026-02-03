#!/bin/bash
set -e

TEMPLATE=${TEMPLATE:-"none"}
INCLUDE_TESTS=${INCLUDETESTS:-"true"}
INCLUDE_CI=${INCLUDECI:-"true"}

echo "Installing project scaffolder..."

# Create scaffolder script directory
mkdir -p /usr/local/bin/scaffolder

# Install scaffolder CLI
cat > /usr/local/bin/scaffold-project << 'EOF'
#!/bin/bash
set -e

TEMPLATE="$1"
PROJECT_DIR="${2:-.}"

scaffold_express_typescript() {
    echo "Scaffolding Express + TypeScript API..."
    cat > "$PROJECT_DIR/package.json" << 'PACKAGE'
{
  "name": "express-api",
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "tsx watch src/index.ts",
    "build": "tsc",
    "start": "node dist/index.js",
    "test": "vitest"
  },
  "dependencies": {
    "express": "^4.18.2"
  },
  "devDependencies": {
    "@types/express": "^4.17.21",
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "typescript": "^5.3.3",
    "vitest": "^1.0.4"
  }
}
PACKAGE

    mkdir -p "$PROJECT_DIR/src"
    cat > "$PROJECT_DIR/src/index.ts" << 'INDEX'
import express from 'express';

const app = express();
const port = process.env.PORT || 3000;

app.use(express.json());

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.listen(port, () => {
  console.log(`Server running on port ${port}`);
});
INDEX

    cat > "$PROJECT_DIR/tsconfig.json" << 'TSCONFIG'
{
  "compilerOptions": {
    "target": "ES2022",
    "module": "ES2022",
    "moduleResolution": "node",
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules"]
}
TSCONFIG

    echo "✅ Express + TypeScript scaffolded successfully!"
}

case "$TEMPLATE" in
    express-typescript)
        scaffold_express_typescript
        ;;
    *)
        echo "Available templates: express-typescript, nestjs-api, nextjs-app, react-vite"
        echo "Usage: scaffold-project <template> [project-dir]"
        ;;
esac
EOF

chmod +x /usr/local/bin/scaffold-project

echo "✅ Project scaffolder installed!"
echo "Run 'scaffold-project <template>' to create a new project"
