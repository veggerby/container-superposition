# Contributing to Container Superposition

## Adding a New Overlay

Overlays are small, composable configuration fragments that add specific capabilities.

### 1. Create the Overlay Directory

```bash
mkdir -p tool/overlays/my-feature
```

### 2. Create the Patch File

Create `tool/overlays/my-feature/devcontainer.patch.json`:

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json",
  "features": {
    "ghcr.io/devcontainers/features/some-tool:1": {
      "version": "latest"
    }
  },
  "forwardPorts": [8080],
  "remoteEnv": {
    "MY_TOOL_HOST": "localhost",
    "MY_TOOL_PORT": "8080"
  }
}
```

### 3. Add Docker Compose (Optional)

If your overlay needs a service, create `tool/overlays/my-feature/docker-compose.yml`:

```yaml
version: '3.8'

services:
  my-service:
    image: my-image:latest
    restart: unless-stopped
    ports:
      - "8080:8080"
    volumes:
      - my-data:/data

volumes:
  my-data:
```

### 4. Update the Questionnaire

Edit `scripts/init.ts` to add your overlay as an option:

```typescript
// In the questionnaire section
console.log('   - my-feature');

// In the overlay selection logic
if (answers.myFeature) {
  overlays.push('my-feature');
}
```

### 5. Update Types (if needed)

If adding a new category, update `tool/schema/types.ts`:

```typescript
export type MyCategory = 'option1' | 'option2';

export interface QuestionnaireAnswers {
  // ... existing fields
  myFeature?: boolean;
}
```

### 6. Document It

Add to `tool/overlays/README.md`:

```markdown
- **my-feature** - Description of what it does
```
Update architecture docs in `tool/docs/` if the overlay introduces new concepts.
### 7. Test

```bash
npm run init -- --stack dotnet --my-feature
```

## Adding a New Template

Templates are complete, solution-ready devcontainer configurations.

### 1. Create Template Structure

```bash
mkdir -p templates/my-stack/.devcontainer/scripts
```

### 2. Create devcontainer.json

```jsonc
{
  "name": "My Stack Development",
  "image": "mcr.microsoft.com/devcontainers/base:debian",
  "features": {
    // Add features from containers.dev
  },
  "customizations": {
    "vscode": {
      "extensions": [],
      "settings": {}
    }
  },
  "postCreateCommand": {
    "install-script": "bash ${containerWorkspaceFolder}/.devcontainer/scripts/post_create.sh"
  }
}
```

### 3. Add Setup Scripts

Create `templates/my-stack/.devcontainer/scripts/post_create.sh`:

```bash
#!/bin/bash
set -e

echo "Setting up my-stack environment..."
# Your setup steps here
```

### 4. Create Template README

Create `templates/my-stack/README.md`:

```markdown
# My Stack Template

## What's Included

- Base image and tools
- Pre-configured extensions
- Development scripts

## Usage

Copy to your project or use the init tool:
\`\`\`bash
npm run init -- --stack my-stack
\`\`\`
```

### 5. Update Main Questionnaire

Edit `scripts/init.ts`:

```typescript
console.log('   5) My Stack');

const stackMap: Record<string, Stack> = {
  // ... existing
  '5': 'my-stack',
};
```

### 6. Update Types

Edit `tool/schema/types.ts`:

```typescript
export type Stack = 'dotnet' | 'node-typescript' | 'python-mkdocs' | 'fullstack' | 'my-stack';
```

## Testing Your Changes

### Run Smoke Tests

```bash
npm test
```

### Test Interactive Mode

```bash
npm run init
```

### Test Non-Interactive Mode

```bash
npm run init -- --stack my-stack --postgres
```

### Verify Output

Check that `.devcontainer/devcontainer.json` is valid JSON and contains expected features.

## Guidelines

### Keep It Humble

- **DON'T** add features that require the tool to maintain
- **DON'T** create proprietary schemas or DSLs
- **DO** output plain, editable configurations
- **DO** compose from official containers.dev features when possible

### Overlays Should Be Minimal

- Each overlay should do **one thing**
- Patch files should be < 50 lines
- Use official features, not custom Dockerfiles
- Document environment variables clearly

### Templates Should Be Complete

- Should work immediately after copying
- Include all necessary scripts
- Document customization points
- Keep base images official and maintained

## Release Checklist

Before releasing a new version:

1. [ ] Run `npm test` successfully
2. [ ] Test all templates with init tool
3. [ ] Verify all overlays compose correctly
4. [ ] Update version in package.json
5. [ ] Update CHANGELOG.md
6. [ ] Tag release in git
7. [ ] Publish to npm (if applicable)

## Questions?

Open an issue or discussion on GitHub!
