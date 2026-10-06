# Usage Examples

These examples use the project-file-first workflow: **discover → inspect → preview → write**.
`superposition.yml` (or `.superposition.yml`) is the shared, committed intent file.
`superposition.local.yml` is optional local-only enrichment. Generated `superposition.json`
is a compatibility and audit receipt, not the file a team edits for normal changes.

## Discover and inspect before choosing

```bash
# Browse recommended starts, overlays, and presets.
npx container-superposition list

# Narrow a discovery question, then inspect a candidate's fit and trade-offs.
npx container-superposition list --category messaging
npx container-superposition explain rabbitmq
```

Use a preset when a common starting point fits; it is optional shorthand. Use a
flat `overlays:` list when the team wants explicit control over every selection.

## Preview before writing

Use `plan` with a proposed selection before creating project files. `--verbose`
explains dependency resolution; `--diff` compares the proposal with existing
generated output.

```bash
npx container-superposition plan --stack compose --overlays dotnet,postgres,grafana
npx container-superposition plan --stack compose --overlays dotnet,postgres,grafana --verbose
npx container-superposition plan --stack compose --overlays dotnet,postgres,grafana --diff
```

`plan` previews an explicit proposed stack and overlay list. When changing an
existing project file, pass its intended selections again before writing with
`regen`.

## Declarative project configuration

Create and commit `superposition.yml` for shared intent:

```yaml
stack: compose
overlays:
    - dotnet
    - postgres
    - grafana
env:
    APP_ENV: development
customizations:
    envTemplate:
        POSTGRES_PASSWORD: postgres
```

Then write generated output without the questionnaire:

```bash
npx container-superposition init --no-interactive
```

Later, edit the same project file, preview the result, and replay it:

```bash
$EDITOR superposition.yml
npx container-superposition plan --stack compose --overlays dotnet,postgres,grafana --diff
npx container-superposition regen
```

See [Authoring `superposition.yml`](superposition-yml.md) for every supported
field, including parameters, mounts, ports, local config, and repeatable overlay
instances.

## Common project files

### .NET service with PostgreSQL

```yaml
# superposition.yml
stack: compose
overlays:
    - dotnet
    - postgres
```

```bash
npx container-superposition plan --stack compose --overlays dotnet,postgres
npx container-superposition init --no-interactive
```

This selects the compose base, .NET tooling, PostgreSQL, and the associated
client/environment setup.

### .NET API with observability

```yaml
# superposition.yml
stack: compose
overlays:
    - dotnet
    - postgres
    - otel-collector
    - jaeger
    - prometheus
    - grafana
```

```bash
npx container-superposition plan --stack compose --overlays dotnet,postgres,otel-collector,jaeger,prometheus,grafana --verbose
npx container-superposition init --no-interactive
```

### Minimal documentation site

```yaml
# superposition.yml
stack: plain
overlays:
    - mkdocs
outputPath: ./my-docs/.devcontainer
```

```bash
npx container-superposition plan --stack plain --overlays mkdocs
npx container-superposition init --no-interactive
```

### Messaging service

```yaml
# superposition.yml
stack: compose
overlays:
    - dotnet
    - rabbitmq
    - prometheus
    - grafana
```

```bash
npx container-superposition list --category messaging
npx container-superposition explain rabbitmq
npx container-superposition plan --stack compose --overlays dotnet,rabbitmq,prometheus,grafana --verbose
npx container-superposition init --no-interactive
```

## Presets are optional shorthand

A preset can seed a common setup, but the result is still shared project intent
that can be inspected and evolved with flat overlays.

```bash
npx container-superposition list --category preset
npx container-superposition explain web-api
npx container-superposition plan --stack compose --overlays nodejs,postgres
npx container-superposition init --stack compose --preset web-api --no-scaffold
```

`--no-scaffold` writes the project file only. Review the generated
`superposition.yml`, then run `plan` and `init --no-interactive` when ready to
write `.devcontainer/`.

## Customize safely

Keep shared configuration in `superposition.yml` and replay it:

```yaml
# superposition.yml
stack: compose
overlays:
    - nodejs
    - postgres
containerName: My Custom Name
env:
    MY_VAR: value
customizations:
    devcontainerPatch:
        forwardPorts:
            - 3000
            - 8080
```

```bash
npx container-superposition plan --stack compose --overlays nodejs,postgres --diff
npx container-superposition regen
```

Keep machine-specific mounts, editor extensions, shell changes, or port-conflict
overrides in untracked `superposition.local.yml`; it enriches generated output
without replacing the team file. See the [local-config section](superposition-yml.md#local-config-superpositionlocalyml).

## Generated output and overlay material

The generated `.devcontainer/` directory contains ordinary editable devcontainer
configuration. The tool preserves documented `custom/` escape hatches during
replay; put durable shared intent in the project file rather than relying on
ad-hoc generated-file edits.

### Maintainer context: overlay-provided files

Overlay authors can provide a `devcontainer.patch.json`, compose fragments,
`.env.example`, and additional configuration files. These are maintainer inputs,
not the normal project-authoring workflow:

```text
overlays/my-service/
├── overlay.yml
├── devcontainer.patch.json
├── docker-compose.yml
├── .env.example
└── config/
    └── app-settings.json
```

See [Creating overlays](creating-overlays.md) for maintainer requirements.

### Maintainer context: programmatic composition

The composer API accepts normalized selection data used by the tool internals.
Category fields below are **maintainer/API compatibility context**, not the
recommended user configuration shape; project files should use flat `overlays:`.

```javascript
import { composeDevContainer } from './tool/questionnaire/composer.js';

await composeDevContainer({
    stack: 'compose',
    language: ['dotnet'],
    database: 'postgres',
    observability: ['otel-collector', 'jaeger', 'prometheus', 'grafana'],
    outputPath: './.devcontainer',
});
```

## Legacy / migration only: manifest repositories

If a repository predates project files and only has `superposition.json`, migrate
it once. Do not hand-edit the manifest or use it as the ongoing team source of
truth.

```bash
# Inspect the legacy receipt path if needed, then create canonical shared intent.
npx container-superposition migrate --from-manifest ./superposition.json

# Preview the migrated selection before writing generated output.
npx container-superposition plan --stack compose --overlays nodejs,postgres
npx container-superposition regen
```

`regen --from-manifest` remains deprecated compatibility support. Prefer
`migrate`, commit the resulting project file, and use normal project-file replay.

## Help and reference

```bash
npm run init -- --help
npm run init -- list --help
npm run init -- plan --help
npm run init -- regen --help
```

- [Quick reference](quick-reference.md)
- [Authoring `superposition.yml`](superposition-yml.md)
- [Team workflow](team-workflow.md)
- [Overlay catalog](overlays.md)
