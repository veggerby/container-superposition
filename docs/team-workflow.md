# Team Collaboration Workflow

Container Superposition keeps team intent, local enrichment, and generated
artifacts separate:

- **`superposition.yml` (or `.superposition.yml`)** — canonical shared intent;
  commit and review it with the application code.
- **`superposition.local.yml`** — optional machine-local enrichment; keep it
  untracked.
- **`.devcontainer/`** — generated output. Teams choose whether to commit it,
  but must make that policy explicit.
- **`superposition.json`** — generated compatibility and audit receipt. It is
  not the steady-state team source of truth.

The safe team workflow is **discover → inspect → preview → write**:

1. `list` discovers overlays and presets.
2. `explain <id>` checks fit and trade-offs.
3. `plan`, `plan --verbose`, and `plan --diff` review the intended result.
4. `init` or `regen` writes the project file and generated output only after
   review.

## Repository layout

```text
my-project/
├── superposition.yml         # Committed: shared generation intent
├── superposition.local.yml   # Untracked: one developer's enrichment
├── superposition.json        # Generated compatibility/audit receipt
├── .gitignore
├── .devcontainer/            # Generated; commit policy is explicit
│   ├── devcontainer.json
│   ├── docker-compose.yml    # compose projects
│   └── custom/               # preserved project-specific escape hatches
└── src/
```

Generated output is standard editable devcontainer configuration. Do not treat
manual edits to it as durable replay authority: put shared changes in
`superposition.yml`, local changes in `superposition.local.yml`, or use the
preserved `custom/` mechanism where appropriate.

## Set up shared intent

### 1. Discover, inspect, and preview

Start with read-only commands before creating files:

```bash
npx container-superposition list
npx container-superposition explain postgres
npx container-superposition plan --stack compose --overlays nodejs,postgres,redis
npx container-superposition plan --stack compose --overlays nodejs,postgres,redis --verbose
npx container-superposition plan --stack compose --overlays nodejs,postgres,redis --diff
```

Presets are optional shortcuts for common jobs. Use `list --category preset` and
`explain <preset-id>` to evaluate one; the project file remains the shared
configuration model.

### 2. Create and commit the project file

Write explicit, reviewable team intent using flat `overlays:` entries:

```yaml
# superposition.yml
stack: compose
overlays:
    - dotnet
    - postgres
    - redis
    - prometheus
    - grafana
env:
    APP_ENV: development
devcontainerGitignore: true
```

Preview the explicit selection before writing generated output:

```bash
npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana
npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana --verbose
npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana --diff
npx container-superposition init --no-interactive
```

Commit the shared intent (and generated output only if that is your team policy):

```bash
git add superposition.yml .gitignore
git commit -m "Add shared devcontainer intent"
git push
```

`init` writes shared project intent and normally generates `.devcontainer/`.
Use `--no-scaffold` only when you deliberately want to create the project file
without output; preview and run `init --no-interactive` later to write it.

## Git policy and local configuration

Choose and document one generated-output policy:

- **Generated locally:** ignore `.devcontainer/`; every developer runs `regen`.
- **Committed output:** review generated diffs alongside `superposition.yml` and
  keep regeneration deterministic.

For local-only configuration, add this to the repository `.gitignore`:

```gitignore
superposition.local.yml
```

Prefer `devcontainerGitignore: true` in shared intent when generated output is
local-only. It creates an output-level ignore file. Git ignores do not untrack
existing files; to stop tracking the default generated directory, run the
manual command below after checking its effect:

```bash
git rm -r --cached -- .devcontainer
```

The tool does not mutate the Git index automatically.

Use `superposition.local.yml` for one developer's mounts, editor extensions,
shell configuration, environment values, or port-conflict overrides:

```yaml
# superposition.local.yml — do not commit
mounts:
    - source: ${HOME}/.cache/my-tool
      destination: /home/vscode/.cache/my-tool
      type: bind
      target: devcontainerMount
vscodeExtensions:
    - streetsidesoftware.code-spell-checker
```

After changing shared or local intent, preview the intended selection before replaying:

```bash
npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana --diff
npx container-superposition regen
```

## Onboard a team member

```bash
git clone https://github.com/your-org/my-project.git
cd my-project
npx container-superposition list
npx container-superposition explain postgres
npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana
npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana --verbose
npx container-superposition regen
code .
```

Then use **Dev Containers: Rebuild and Reopen in Container** in VS Code. The
first two commands are optional orientation when the chosen overlays are already
familiar; `plan` remains the review step before `regen` writes output.

## Update shared intent

Edit the committed project file; do not hand-edit `superposition.json`.

```yaml
# Add Jaeger to the existing flat selection.
overlays:
    - dotnet
    - postgres
    - redis
    - prometheus
    - grafana
    - jaeger
```

Then review and commit the source change:

```bash
npx container-superposition explain jaeger
npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana,jaeger --verbose
npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana,jaeger --diff
npx container-superposition regen
git add superposition.yml
git commit -m "Add Jaeger tracing to devcontainer"
git push
```

Team members pull the project file change, review it, and regenerate:

```bash
git pull
npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana,jaeger --diff
npx container-superposition regen
```

## CI validation

CI should validate the same shared project file that developers review. A
preview can run on pull requests; a generation smoke check can follow when the
runner supports the required environment.

```yaml
name: Validate DevContainer

on:
    pull_request:
        paths:
            - 'superposition.yml'
            - '.superposition.yml'
            - '.github/workflows/validate-devcontainer.yml'

jobs:
    validate:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-node@v4
              with:
                  node-version: '20'
            - name: Preview explicit selection
              run: npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana --diff
            - name: Regenerate and smoke test
              run: |
                  npx container-superposition regen
                  test -f .devcontainer/devcontainer.json
                  test -f .devcontainer/docker-compose.yml
```

Equivalent GitLab job:

```yaml
validate-devcontainer:
    image: node:20
    stage: test
    only:
        changes:
            - superposition.yml
            - .superposition.yml
            - .gitlab-ci.yml
    script:
        - npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana --diff
        - npx container-superposition regen
        - test -f .devcontainer/devcontainer.json
```

## Adopt an existing devcontainer

For a hand-authored `.devcontainer/`, inspect conversion first and then write
only after reviewing the result:

```bash
npx container-superposition adopt --dry-run
npx container-superposition adopt
npx container-superposition plan --stack compose --overlays nodejs,postgres
npx container-superposition plan --stack compose --overlays nodejs,postgres --diff
```

Standard `adopt` writes repository project intent, a compatibility manifest, and
preserved `custom/` patches for material it cannot model directly. The
`adopt --project-file` option is deprecated and a no-op; do not include it in
team automation. See the [Adopt Command guide](adopt.md).

## Legacy / migration only: manifest-first repositories

A repository that has only `superposition.json` should migrate once rather than
continue hand-editing or committing the manifest as authority:

```bash
# Convert the compatibility receipt to canonical project intent.
npx container-superposition migrate --from-manifest ./superposition.json

# Preview the migrated selection, then write generated output.
npx container-superposition plan --stack compose --overlays nodejs,postgres
npx container-superposition plan --stack compose --overlays nodejs,postgres --diff
npx container-superposition regen

git add superposition.yml .gitignore
git commit -m "Migrate devcontainer intent to project file"
```

`regen --from-manifest` is deprecated compatibility support. Use `migrate` to
make a project file, then return to normal project-file replay.

## Troubleshooting

### `regen` cannot find shared intent

Ensure the repository root contains exactly one canonical project file:
`superposition.yml` or `.superposition.yml`. If the repository has only a
legacy manifest, run `migrate` as shown above.

### Generated files are tracked unexpectedly

1. Confirm the team policy and `.gitignore` entries.
2. Enable `devcontainerGitignore: true` when output should remain local.
3. Use `git rm -r --cached -- .devcontainer` manually to untrack existing
   generated files; the tool never changes the Git index itself.

### Local customizations are missing

1. Confirm `superposition.local.yml` is in the repository root and untracked.
2. Check its YAML and supported fields in the
   [project-file reference](superposition-yml.md#local-config-superpositionlocalyml).
3. Run `plan --diff`, then `regen`.

### Port conflicts on one machine

Keep the team selection unchanged and set `portOffset` or local `ports:` in
untracked `superposition.local.yml`. Preview and regenerate:

```bash
npx container-superposition plan --stack compose --overlays dotnet,postgres,redis,prometheus,grafana --diff
npx container-superposition regen
```

## Monorepos

Each independently generated service should own its own project file. Flat
`overlays:` remains the explicit selection model in every service.

```text
monorepo/
├── service-a/
│   ├── superposition.yml
│   └── .devcontainer/
├── service-b/
│   ├── superposition.yml
│   └── .devcontainer/
└── .gitignore
```

```yaml
# service-a/superposition.yml
stack: compose
overlays:
    - nodejs
    - postgres
```

```yaml
# service-b/superposition.yml
stack: compose
overlays:
    - python
    - redis
    - rabbitmq
```

From each service directory, run `list`, `explain`, `plan`, and `regen` in that
order as needed. Do not assume project-file inheritance between service roots
unless a separate supported configuration model is documented.

## See also

- [Authoring `superposition.yml`](superposition-yml.md)
- [Adopt Command](adopt.md)
- [Quick Reference](quick-reference.md)
- [Overlay Documentation](overlays.md)
- [Custom Patches](custom-patches.md)
