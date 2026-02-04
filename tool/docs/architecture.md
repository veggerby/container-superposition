# Architecture

The init tool is a **thin "purpose picker"** that composes devcontainer configurations from base templates and overlays.

## Design Principles

### Generate Once, Edit Forever

The tool creates standard `.devcontainer/` folders that users own completely. There is no "sync" or "update" mechanism—once generated, the configuration is independent of the tool.

### Stateless Composition

No configuration tracking, version control, or state management. Each invocation is independent and produces deterministic output based on the provided options.

### Plain JSON Output

All output is standard `devcontainer.json` format compatible with VS Code Dev Containers and GitHub Codespaces. No proprietary schemas or custom DSLs.

### Optional Tooling

Templates in `templates/` work standalone. The init tool is a convenience wrapper, not a requirement.

## Directory Structure

```
tool/
├── docs/              # Architecture and design documentation
├── overlays/          # Composable feature add-ons
│   ├── postgres/      # PostgreSQL overlay
│   ├── redis/         # Redis overlay
│   ├── playwright/    # Browser automation
│   ├── azure-cli/     # Azure tools
│   └── kubectl-helm/  # Kubernetes tools
├── questionnaire/     # Composition logic
│   └── composer.ts    # Deep merge engine
└── schema/            # Type definitions
    ├── types.ts       # TypeScript interfaces
    └── config.schema.json  # JSON schema

scripts/
├── init.ts           # CLI entry point
├── test.sh           # Smoke tests
└── example.js        # Programmatic usage
```

## Composition Algorithm

### Input Processing

1. **Parse arguments** - Commander processes CLI flags or triggers interactive questionnaire
2. **Validate answers** - Ensure stack exists and options are compatible
3. **Select overlays** - Based on database, playwright, cloud tools choices

### Template Composition

1. **Load base template** from `templates/<stack>/.devcontainer/`
2. **Apply overlays** sequentially using deep merge
3. **Copy additional files** (scripts, etc.) from base template
4. **Write merged configuration** to output path
5. **Copy Docker Compose files** for services

### Deep Merge Logic

```typescript
function deepMerge(base, overlay) {
  for each key in overlay:
    if key exists in base and both are objects:
      if both are arrays:
        concatenate and deduplicate
      else:
        recursively merge
    else:
      use overlay value
  return merged
}
```

Special handling:
- **Arrays**: Concatenate and deduplicate (ports, packages)
- **apt-get packages**: Merge space-separated lists
- **Features**: Deep merge feature configs
- **Environment variables**: Merge key-value pairs

## Workflow

```
User Input
    ↓
CLI Parser (Commander)
    ↓
Interactive or Non-Interactive Mode
    ↓
QuestionnaireAnswers
    ↓
Composer Engine
    ├── Load base template
    ├── Select overlays
    ├── Deep merge configs
    ├── Copy template files
    └── Write output
    ↓
.devcontainer/ folder
```

## Overlay System

Each overlay is a minimal JSON patch plus optional service definition:

```
overlay-name/
├── devcontainer.patch.json   # Partial config to merge
└── docker-compose.yml         # Optional service
```

Overlays can add:
- Features
- Environment variables
- Port forwards
- Services (via Docker Compose)
- Package installations

## Technology Choices

### Node.js/TypeScript

- Cross-platform (Windows, Mac, Linux)
- Native JSON handling
- Easy npm/npx distribution
- Type safety during development

### CLI Libraries

- **chalk** - Terminal colors for better UX
- **boxen** - Visual hierarchy with borders
- **ora** - Progress feedback
- **commander** - Robust argument parsing

### No Framework

Deliberate choice to avoid:
- Complex build pipelines
- Runtime dependencies in output
- Learning curve for contributors
- Version coupling

## Extension Points

### Adding Overlays

1. Create `tool/overlays/<name>/`
2. Add `devcontainer.patch.json`
3. Optional: Add `docker-compose.yml`
4. Update questionnaire in `scripts/init.ts`

### Adding Templates

1. Create `templates/<name>/.devcontainer/`
2. Add standard devcontainer.json
3. Add scripts and supporting files
4. Update types in `tool/schema/types.ts`
5. Add questionnaire option

## Constraints

### What We Don't Do

- ❌ No "update" command (would require state tracking)
- ❌ No custom DSL (just standard JSON)
- ❌ No required preprocessing (templates work directly)
- ❌ No version coupling (output is independent)
- ❌ No cloud services (purely local operation)

### Why These Constraints

These limitations keep the tool **humble** and prevent it from becoming a platform that users must learn, debug, and maintain. The tool is training wheels, not a framework.

## Success Metrics

The tool succeeds when:
1. Users create their first devcontainer easily
2. Users edit output directly without the tool
3. Users don't need the tool after initial setup
4. Templates work independently of the tool

## Trade-offs

### Advantages

- Low barrier to entry
- No vendor lock-in
- Composable and extensible
- Easy to understand
- Minimal maintenance burden

### Limitations

- No automatic updates of existing configs
- Limited validation of composed output
- Manual effort to keep overlays compatible
- No rollback mechanism

These limitations are **intentional** to prevent tool creep.
