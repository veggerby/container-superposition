# Presets Architecture

This document describes the design and architecture of the presets system (meta-overlays) in Container Superposition.

## Overview

Presets are **meta-overlays** that represent pre-configured combinations of overlays for common development scenarios. They provide:

- **Faster onboarding** - Complete stacks ready in seconds
- **Best practices** - Sensible defaults and proper service integration
- **Flexibility** - Full customization after preset selection
- **Education** - Learn from working examples

## Architecture

### Core Concepts

1. **Meta-Overlay**: A special type of overlay that selects other overlays rather than adding features directly
2. **User Choices**: Interactive prompts within a preset for customization (e.g., language selection)
3. **Glue Configuration**: Environment variables and configuration that wire services together
4. **Preset Expansion**: The process of converting a preset selection into concrete overlay selections

### Type System

```typescript
interface MetaOverlay {
    // Basic metadata (inherited from Overlay)
    id: string;
    name: string;
    description: string;
    type: 'meta';
    category: 'preset';

    // Preset-specific configuration
    selects: {
        // Always-included overlays
        required: string[];

        // Interactive user choices
        userChoice?: Record<string, PresetUserChoice>;
    };

    // Service integration configuration
    glueConfig?: PresetGlueConfig;
}

interface PresetUserChoice {
    id: string;
    prompt: string;
    options: string[];
    defaultOption?: string;
}

interface PresetGlueConfig {
    // Environment variables for service integration
    environment?: Record<string, string>;

    // Suggested port mappings
    portMappings?: Record<string, number>;

    // Usage guide for generated environment
    readme?: string;
}
```

### Preset File Structure

Presets are defined in `overlays/presets/` with YAML files:

```yaml
# overlays/presets/web-api.yml
id: web-api
name: Web API Stack
description: Full-stack web API with database, cache, and observability
type: meta
category: preset
supports: [compose]
tags: [preset, web, api, database]

selects:
    # Always included
    required:
        - postgres
        - redis
        - otel-collector
        - prometheus
        - grafana
        - loki

    # User chooses language
    userChoice:
        language:
            id: language
            prompt: 'Select your backend language'
            options: [dotnet, nodejs, python, go, java]
            defaultOption: nodejs

glueConfig:
    environment:
        DATABASE_URL: 'postgresql://postgres:postgres@postgres:5432/app'
        REDIS_URL: 'redis://redis:6379'
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4318'

    portMappings:
        api: 8000
        grafana: 3000

    readme: |
        # Web API Stack

        Your API service should expose port 8000.

        ## Services
        - Grafana: http://localhost:3000 (admin/admin)
        - PostgreSQL: localhost:5432
        - Redis: localhost:6379
```

### Composition Flow

The preset system integrates into the existing composition pipeline:

```txt
1. User selects preset (or chooses custom)
   ↓
2. Preset presents user choices (if any)
   ↓
3. Preset expands to overlay list
   ↓
4. Optional: User can customize overlay selection
   ↓
5. Dependency resolution runs
   ↓
6. Conflict detection runs
   ↓
7. Normal overlay composition
   ↓
8. Glue configuration applied
   ↓
9. Preset README generated
```

### Integration Points

#### 1. Questionnaire (scripts/init.ts)

```typescript
// 1. Preset selection
const mode = await select({
    message: 'How would you like to start?',
    choices: [
        { value: 'preset', name: 'Start from preset' },
        { value: 'custom', name: 'Custom configuration' },
    ],
});

if (mode === 'preset') {
    // 2. Load preset
    const preset = await loadPreset(presetId);

    // 3. Handle user choices
    for (const [key, choice] of Object.entries(preset.selects.userChoice)) {
        const answer = await select({
            message: choice.prompt,
            choices: choice.options,
            default: choice.defaultOption,
        });
        answers.presetChoices[key] = answer;
    }

    // 4. Expand preset to overlays
    const selectedOverlays = [...preset.selects.required, ...Object.values(answers.presetChoices)];

    // 5. Optional customization
    const customize = await confirm({
        message: 'Customize overlay selection?',
        default: false,
    });
}
```

#### 2. Composer (tool/questionnaire/composer.ts)

```typescript
// Apply glue configuration after all overlays
async function applyGlueConfig(glueConfig: PresetGlueConfig, envPath: string, outputPath: string) {
    // 1. Inject environment variables
    if (glueConfig.environment) {
        const envContent = [];
        envContent.push('# Preset Configuration');
        for (const [key, value] of Object.entries(glueConfig.environment)) {
            envContent.push(`${key}=${value}`);
        }
        await fs.promises.appendFile(envPath, envContent.join('\n'));
    }

    // 2. Log port mappings
    if (glueConfig.portMappings) {
        console.log('Suggested port mappings:');
        for (const [service, port] of Object.entries(glueConfig.portMappings)) {
            console.log(`  ${service}: ${port}`);
        }
    }

    // 3. Generate preset README
    if (glueConfig.readme) {
        await fs.promises.writeFile(path.join(outputPath, 'PRESET-README.md'), glueConfig.readme);
    }
}
```

#### 3. Manifest (superposition.json)

```json
{
    "version": "0.1.0",
    "generatedAt": "2026-02-08T10:00:00Z",
    "baseTemplate": "compose",

    "preset": "web-api",
    "presetChoices": {
        "language": "nodejs"
    },

    "overlays": ["nodejs", "postgres", "redis", "otel-collector", "prometheus", "grafana", "loki"]
}
```

## Preset Design Patterns

### 1. Full-Stack Preset

Includes frontend, backend, data, and observability layers:

```yaml
selects:
    required:
        - nodejs # Frontend
        - postgres # Database
        - redis # Cache
        - minio # Object storage
        - otel-collector # Observability
        - prometheus
        - grafana
        - loki

    userChoice:
        backend:
            prompt: 'Select backend language'
            options: [dotnet, python, go, java]
```

### 2. Microservices Preset

Focuses on service-to-service communication:

```yaml
selects:
    required:
        - otel-collector
        - jaeger
        - prometheus
        - grafana

    userChoice:
        language:
            options: [dotnet, nodejs, python, go, java]
        messaging:
            prompt: 'Select message broker'
            options: [rabbitmq, redpanda, nats]
```

### 3. Documentation Preset

Single-purpose, no user choices:

```yaml
selects:
    required:
        - mkdocs
        - pre-commit
        - modern-cli-tools

    # No user choices - fully pre-configured

glueConfig:
    readme: |
        # Documentation Site

        Run: mkdocs serve
        Build: mkdocs build
```

## Glue Configuration Design

### Purpose

Glue configuration solves the "integration gap" where users must:

1. Know service hostnames (e.g., `postgres` not `localhost`)
2. Configure connection strings
3. Set up environment variables
4. Understand port mappings

### Environment Variables

**Pattern**: Pre-configured connection strings using service names

```yaml
glueConfig:
    environment:
        # Database
        DATABASE_URL: 'postgresql://postgres:postgres@postgres:5432/app'
        POSTGRES_HOST: 'postgres'
        POSTGRES_PORT: '5432'

        # Cache
        REDIS_URL: 'redis://redis:6379'

        # Messaging
        RABBITMQ_URL: 'amqp://guest:guest@rabbitmq:5672'

        # Observability
        OTEL_EXPORTER_OTLP_ENDPOINT: 'http://otel-collector:4318'
        JAEGER_AGENT_HOST: 'jaeger'
```

**Implementation**: Appended to `.env.example` with clear section marker:

```bash
# Preset Configuration
DATABASE_URL=postgresql://postgres:postgres@postgres:5432/app
REDIS_URL=redis://redis:6379
```

### Port Mappings

**Pattern**: Informational suggestions for service exposure

```yaml
glueConfig:
    portMappings:
        api: 8000
        grafana: 3000
        jaeger: 16686
```

**Purpose**: Help users understand:

- Which ports their application should use
- Where to access web UIs
- How services are exposed to the host

### README Generation

**Pattern**: Quick-start guide for the generated environment

```yaml
glueConfig:
    readme: |
        # [Preset Name]

        ## Services
        - [Service 1]: [URL] ([credentials])
        - [Service 2]: [URL]

        ## Connection Strings
        See .env.example for pre-configured values.

        ## Quick Start
        1. [Step 1]
        2. [Step 2]

        ## Next Steps
        - [Suggestion 1]
        - [Suggestion 2]
```

**Output**: `PRESET-README.md` in project root alongside `superposition.json`

## Dependency Resolution

Presets participate in normal dependency resolution:

1. **Preset overlays expand** before dependency resolution
2. **Dependencies auto-added** for all preset overlays
3. **Conflicts detected** across all selected overlays
4. **User resolves conflicts** same as custom configuration

**Example:**

```yaml
# Preset selects grafana
selects:
  required:
    - grafana

# Grafana requires prometheus
# overlays/index.yml
- id: grafana
  requires: [prometheus]

# Result: Both grafana AND prometheus included
```

## Extensibility

### Adding New Presets

1. **Create YAML file** in `overlays/presets/`
2. **Register in** `overlays/index.yml`
3. **No code changes needed** (declarative system)

**Validation**:

- Schema defined in `tool/schema/types.ts`
- Tests in `tool/__tests__/presets.test.ts`

### Custom User Choices

User choices can select from any overlay in the same category:

```yaml
userChoice:
    language:
        prompt: 'Select language'
        options: [dotnet, nodejs, python, go, java, rust]

    database:
        prompt: 'Select database'
        options: [postgres, mysql, mongodb, sqlserver]

    messaging:
        prompt: 'Select message broker'
        options: [rabbitmq, redpanda, nats]
```

## Benefits

### For New Users

- **Lower barrier to entry** - Don't need to know all overlays
- **Proven configurations** - Working examples to learn from
- **Faster success** - Complete stack in seconds

### For Power Users

- **Starting points** - Customize presets rather than start from scratch
- **Consistency** - Team-wide standard configurations
- **Time savings** - Common patterns codified

### For Maintainers

- **Best practices** - Demonstrate proper overlay combinations
- **Reduced support** - Fewer "how do I configure X?" questions
- **Showcase features** - Highlight observability, glue config, etc.

## Limitations and Trade-offs

### Current Limitations

1. **CLI mode**: Presets not directly accessible via `--preset` flag (planned)
2. **Interactive only**: Requires TTY for user choices
3. **No validation**: Preset YAML files not schema-validated (yet)

### Design Trade-offs

1. **Flexibility vs Simplicity**: Presets add complexity but solve real onboarding problems
2. **Opinionated vs Flexible**: Presets are opinionated but remain fully customizable
3. **Maintenance burden**: More presets = more to maintain (balanced by declarative YAML)

## Future Enhancements

### CLI Preset Support

```bash
container-superposition --preset web-api --preset-choice language=nodejs
```

### More Presets

- **data-science**: Python, Jupyter, visualization
- **mobile-backend**: Auth, storage, push notifications
- **iot**: MQTT, time-series database, edge computing
- **ml-training**: GPU support, frameworks, experiment tracking

### Preset Marketplace

- Community-contributed presets
- Preset discovery and search
- Rating and versioning

## See Also

- [Presets User Guide](presets.md) - User-facing documentation
- [Overlay Index](../overlays/index.yml) - Preset registrations
- [Creating Overlays](creating-overlays.md) - How to create presets
- [Dependencies](dependencies.md) - Dependency resolution system
