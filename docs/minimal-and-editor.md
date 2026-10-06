# Minimal Mode and Editor Profiles

Container Superposition stores these choices in the team-owned `superposition.yml`. Use flat
`overlays:` to select capabilities, preview that selection, then write or replay the project
file.

> `plan` previews the selected stack and overlays. It does not accept `minimal`, `editor`, or
> `target` input, so review those project-file settings before writing.

## Minimal mode

Set `minimal: true` to omit overlays whose `overlay.yml` declares `minimal: true`:

```yaml
# superposition.yml
stack: plain
minimal: true
overlays:
    - nodejs
    - modern-cli-tools
    - git-helpers
    - codex
```

Preview the explicit selection, then generate:

```bash
npx container-superposition plan --stack plain --overlays nodejs,modern-cli-tools,git-helpers,codex
npx container-superposition init --no-interactive
```

The preview shows the requested overlays. During generation, minimal mode excludes optional
overlays such as `modern-cli-tools`, `git-helpers`, and `codex`; essential language and service
overlays remain included.

### When to use it

Use `minimal: true` for CI, resource-constrained workspaces, tutorials, or any environment that
needs only essential capabilities. For example, a lean Codespaces setup can keep its target and
minimal setting in shared intent:

```yaml
# superposition.yml
stack: compose
target: codespaces
minimal: true
overlays:
    - python
    - postgres
    - docker-in-docker
```

```bash
npx container-superposition plan --stack compose --overlays python,postgres,docker-in-docker
npx container-superposition init --no-interactive
```

`plan` does not preview `target: codespaces` or minimal-mode exclusions; review those fields in
the project file before `init` writes target-specific artifacts.

### Marking an overlay as optional

Overlay authors can mark an overlay as optional in its metadata:

```yaml
# overlays/modern-cli-tools/overlay.yml
id: modern-cli-tools
name: Modern CLI Tools
description: Enhanced command-line tools
category: dev
minimal: true
```

## Editor profiles

Set `editor` in `superposition.yml` to choose generated editor customizations:

```yaml
# superposition.yml
stack: plain
editor: none # vscode (default) | jetbrains | none
overlays:
    - python
```

```bash
npx container-superposition plan --stack plain --overlays python
npx container-superposition init --no-interactive
```

### Available profiles

#### `vscode` (default)

Includes VS Code extensions and settings contributed by selected overlays.

#### `none`

Removes editor customizations. It is useful for CI, server, terminal-only, or other non-editor
workflows.

#### `jetbrains`

Generates JetBrains IDE project artifacts and selects an IDE backend in `devcontainer.json`. VS
Code customizations are removed. The backend is selected from the primary language overlay:

| Language overlay          | JetBrains IDE                     |
| ------------------------- | --------------------------------- |
| `nodejs` / `bun`          | `WebStorm`                        |
| `python` / `mkdocs`       | `PyCharm`                         |
| `go`                      | `GoLand`                          |
| `dotnet`                  | `Rider`                           |
| `java`                    | `IntelliJIdea`                    |
| `rust`                    | `RustRover`                       |
| none / multiple / unknown | `IntelliJIdea` (generic fallback) |

JetBrains generation creates matching run configurations in the project-root `.idea/` directory.
Existing `.idea/` files are never overwritten. Switching later to `editor: vscode` does not
remove that directory because it may contain user-created configuration.

## Combining minimal mode and editor settings

Keep all shared generation choices together in the project file:

```yaml
# superposition.yml
stack: compose
minimal: true
editor: none
overlays:
    - nodejs
    - postgres
```

```bash
npx container-superposition plan --stack compose --overlays nodejs,postgres
npx container-superposition init --no-interactive
```

To change an existing setup, edit `superposition.yml`, preview the resulting stack and flat
overlay list, then replay it:

```bash
npx container-superposition plan --stack compose --overlays nodejs,postgres
npx container-superposition plan --stack compose --overlays nodejs,postgres --diff
npx container-superposition regen
```

`regen` reads the canonical project file. The generated
`.devcontainer/superposition.json` is a compatibility/audit receipt, not the steady-state source
of settings.

## Examples

### Full local development

```yaml
# superposition.yml
stack: compose
editor: vscode
overlays:
    - python
    - postgres
    - docker-sock
    - git-helpers
    - modern-cli-tools
    - pre-commit
    - prometheus
    - grafana
```

```bash
npx container-superposition plan --stack compose --overlays python,postgres,docker-sock,git-helpers,modern-cli-tools,pre-commit,prometheus,grafana
npx container-superposition init --no-interactive
```

### Lean JetBrains workspace

```yaml
# superposition.yml
stack: compose
minimal: true
editor: jetbrains
overlays:
    - nodejs
    - postgres
```

```bash
npx container-superposition plan --stack compose --overlays nodejs,postgres
npx container-superposition init --no-interactive
```

## See also

- [CLI Reference](../README.md#cli-usage)
- [Project-file reference](superposition-yml.md)
- [Deployment Targets](deployment-targets.md)
