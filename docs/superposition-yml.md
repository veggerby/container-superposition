# Authoring `superposition.yml`

`superposition.yml` (or `.superposition.yml`) is the **canonical input** for all
container-superposition generation and regeneration flows. Commit it to your repository to
guarantee reproducible devcontainer builds across your team and CI.

## Overview

- `init` always writes `superposition.yml` as its primary output.
- `regen` reads only the project file — `superposition.json` is an output-only receipt.
- `doctor` validates the project file against the last-generated manifest and reports drift.
- Repos without a project file should run `cs migrate` once to create one from their manifest.

## File discovery

The tool searches the repository root for `superposition.yml` then `.superposition.yml`. If both
exist, it fails with an error — keep only one.

## Local config: `superposition.local.yml`

Use `superposition.local.yml` for machine-specific mounts, env, shell aliases, or editor
customizations that should not be committed to shared config.

Place `superposition.local.yml` in the repository root, beside `superposition.yml` or
`.superposition.yml`. Supported top-level fields are `$schema`, `env`, `mounts`, `shell`, and
`customizations`.

```yaml
$schema: https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.local.schema.json

mounts:
    - source: ${HOME}/.codex
      destination: /home/vscode/.codex
      type: bind
      target: devcontainerMount
```

Local config applies after shared project config, so local map/scalar values override shared values
for generated output only. Local arrays append using existing merge behavior.

Git safety:

- Keep `superposition.local.yml` out of Git. The tool auto-adds it to root `.gitignore` when local
  config is present; if that write fails, add `superposition.local.yml` manually.
- Prefer `devcontainerGitignore: true` in shared project config when using local config.
- Ignored files already tracked by Git remain tracked. To untrack generated output for the default
  path, run:

```bash
git rm -r --cached -- .devcontainer
```

`.superposition.local.yml` is unsupported and ignored. Rename it to `superposition.local.yml` in
repository root to use local config.

---

## Reference

### `$schema`

```yaml
$schema: https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.schema.json
```

Optional but recommended. Points editors (VS Code, JetBrains, etc.) to the JSON Schema
for this file, enabling auto-complete and inline validation. The `init` and `regen`
commands write this line automatically. The URL above always resolves to the latest
schema on the `main` branch. A versioned copy is also attached to each
[GitHub release](https://github.com/veggerby/container-superposition/releases).

---

### `stack`

```yaml
stack: plain # or compose
```

| Value     | Description                                         |
| --------- | --------------------------------------------------- |
| `plain`   | Single-image devcontainer (no Docker Compose)       |
| `compose` | Multi-service devcontainer backed by Docker Compose |

Required. Always set this explicitly.

---

### `baseImage`

```yaml
baseImage: bookworm # default
```

| Value      | Image                                              |
| ---------- | -------------------------------------------------- |
| `bookworm` | `mcr.microsoft.com/devcontainers/base:bookworm` ⭐ |
| `trixie`   | `mcr.microsoft.com/devcontainers/base:trixie`      |
| `alpine`   | `mcr.microsoft.com/devcontainers/base:alpine`      |
| `ubuntu`   | `mcr.microsoft.com/devcontainers/base:ubuntu`      |
| `custom`   | Uses `customImage` — see below                     |

---

### `customImage`

```yaml
baseImage: custom
customImage: ghcr.io/myorg/my-base:latest
```

Only valid when `baseImage: custom`. Specifies the exact Docker image to use as the base.

---

### `containerName`

```yaml
containerName: My Project
```

Sets the `name` field in `devcontainer.json`. Used by VS Code to label the container.

---

### `overlays`

```yaml
overlays:
    - nodejs
    - postgres
    - grafana
    - docker-sock
```

Flat list of overlay IDs to include. This is the **preferred** way to declare overlays.
Dependency resolution runs automatically: if you select `grafana`, `prometheus` is added
because it is declared as `requires`.

See `docs/overlays.md` for the full overlay catalogue.

---

### `preset`

```yaml
preset: web-api
presetChoices:
    language: nodejs
    database: postgres
```

Expands a preset (meta-overlay) into a fixed set of overlays. Use `cs list --presets` to
browse available presets. `presetChoices` passes parameter values to the preset.

---

### `env`

Declare runtime environment variables once. The generation pipeline routes them to the correct
devcontainer artifact based on `stack`.

```yaml
env:
    # String shorthand — target is auto-detected
    APP_NAME: my-app

    # Long form — explicit routing target
    DB_URL:
        value: postgres://postgres:${POSTGRES_PASSWORD}@postgres:5432/app
        target: auto # default: plain→remoteEnv, compose→docker-compose environment
    DEBUG:
        value: 'true'
        target: remoteEnv # always devcontainer.json remoteEnv
    API_SECRET:
        value: ${API_SECRET}
        target: composeEnv # always docker-compose devcontainer environment (compose only)
```

#### Routing table

| `target`         | `stack: plain`                | `stack: compose`                                       |
| ---------------- | ----------------------------- | ------------------------------------------------------ |
| `auto` (default) | `devcontainer.json remoteEnv` | `docker-compose.yml services.devcontainer.environment` |
| `remoteEnv`      | `devcontainer.json remoteEnv` | `devcontainer.json remoteEnv`                          |
| `composeEnv`     | ❌ Error                      | `docker-compose.yml services.devcontainer.environment` |

#### `${VAR}` and `{{cs.KEY}}` in env: values

Two syntaxes are supported in `env:` values. They are resolved at different times:

| Tier            | Syntax                       | Resolved by            | When             | Safe for secrets?                        |
| --------------- | ---------------------------- | ---------------------- | ---------------- | ---------------------------------------- |
| Generation-time | `{{cs.KEY}}`                 | This tool              | `regen` / `init` | No — value baked into generated file     |
| Runtime         | `${VAR}` / `${VAR:-default}` | Docker Compose / shell | Container start  | Yes — value stays in `.env` (gitignored) |

- **`{{cs.KEY}}`** references a project parameter from `parameters:`. The resolved value is
  written verbatim into the generated output (`devcontainer.json`, `docker-compose.yml`,
  `.devcontainer/.env`). **Never use `{{cs.KEY}}` for secrets.**
- **`${VAR:-default}`** is a Docker Compose expression. For `stack: plain` it is resolved at
  generation time using the root `.env`, then the inline default. For `stack: compose` it is
  passed through verbatim to `docker-compose.yml`; Docker Compose resolves it at container
  start using `.devcontainer/.env`.

Decision tree:

```
Is the value the same for everyone on the team?
  Yes → {{cs.KEY}} in env: value  (resolved at regen, baked in)
  No  → ${VAR:-safe_default} in env: value  (each dev sets it in .env)

Is the value a secret?
  Yes → NEVER use {{cs.KEY}}; always ${VAR:-default}
  No  → either syntax is acceptable
```

Example — build a `DATABASE_URL` from parameters (non-secret values):

```yaml
parameters:
    POSTGRES_DB: myapp
    POSTGRES_USER: myapp
    POSTGRES_PORT: 5432

env:
    DATABASE_URL: 'postgresql://{{cs.POSTGRES_USER}}@postgres:{{cs.POSTGRES_PORT}}/{{cs.POSTGRES_DB}}'
```

After `cs regen`, `devcontainer.json remoteEnv.DATABASE_URL` equals
`"postgresql://myapp@postgres:5432/myapp"`. No `{{cs.*}}` tokens appear in generated output.

Example — secure pattern (password stays in `.env`):

```yaml
parameters:
    POSTGRES_DB: myapp
    POSTGRES_USER: myapp
    POSTGRES_PASSWORD: '${POSTGRES_PASSWORD:-changeme}'
    POSTGRES_PORT: 5432

env:
    DATABASE_URL: 'postgresql://{{cs.POSTGRES_USER}}:${POSTGRES_PASSWORD:-changeme}@postgres:{{cs.POSTGRES_PORT}}/{{cs.POSTGRES_DB}}'
```

The password reference `${POSTGRES_PASSWORD:-changeme}` bypasses the parameter token — it
stays unresolved by the tool and is handled by Docker Compose at runtime.

---

### `ports`

Declare project-level ports once. Behavior depends on `stack`.

#### `stack: plain` — container port expressions

Write a container port number or `${VAR:-default}` expression. Do **not** use `HOST:CONTAINER`
format — the tool rejects it with an error. The tool **resolves** `${VAR}` at generation time
using `superposition.yml env` first, then the root `.env`, then the inline default.

Because a single `env` entry also drives `remoteEnv`, you get a single source of truth: change
the value once and both `forwardPorts` and the container's runtime environment stay in sync.

```yaml
stack: plain
env:
    API_PORT: '9001' # sets both remoteEnv.API_PORT and resolves the port expression below
ports:
    - ${API_PORT:-8080} # resolves to 9001
    - value: ${WEB_PORT:-5173}
      label: Web dev server
      onAutoForward: openBrowser
```

Generated `devcontainer.json` (excerpt):

```json
{
    "forwardPorts": [9001, 5173],
    "portsAttributes": {
        "5173": { "label": "Web dev server", "onAutoForward": "openBrowser" }
    }
}
```

#### `stack: compose` — verbatim port bindings

Write a full `HOST:CONTAINER` binding. Do **not** write a bare port expression — the tool
rejects it with an error. The binding is written **verbatim** to `docker-compose.yml`;
`${VAR}` is never expanded by the tool (Compose reads `.env` at container startup instead).

For `devcontainer.json forwardPorts` and `portsAttributes`, the tool extracts the container
port from the rightmost segment as a best-effort hint.

```yaml
stack: compose
ports:
    - ${API_PORT:-8080}:8080 # written verbatim; Compose expands ${API_PORT} at startup
    - value: ${WEB_DEV_PORT:-5173}:5173
      label: Web dev server
      onAutoForward: openBrowser
```

Generated `docker-compose.yml` (excerpt):

```yaml
services:
    devcontainer:
        ports:
            - ${API_PORT:-8080}:8080 # verbatim
            - ${WEB_DEV_PORT:-5173}:5173
```

Generated `devcontainer.json` (excerpt):

```json
{
    "forwardPorts": [8080, 5173],
    "portsAttributes": {
        "5173": { "label": "Web dev server", "onAutoForward": "openBrowser" }
    }
}
```

`portsAttributes` is always keyed by the **container port** (the port VS Code forwards), never
the host port.

Supported metadata keys on object entries:

- `label` (string)
- `onAutoForward` (`notify` | `openBrowser` | `openPreview` | `silent` | `ignore`)

> `ports` are **not** shifted by `portOffset`.

---

### `mounts`

Declare filesystem mounts once. All mounts default to `devcontainer.json mounts[]` (`target: auto`).
Use `composeVolume` to route explicitly to docker-compose volumes on a compose stack.

```yaml
mounts:
    # String shorthand (escape hatch)
    - 'source=${localWorkspaceFolder}/../libs,target=/workspace/libs,type=bind,readonly'

    # Structured list form (preferred)
    - source: ${HOME}/.codex
      destination: /home/vscode/.codex
      cached: true
      # target: auto (default)

    # Explicit target override
    - source: certs
      destination: /certs
      type: volume
      target: devcontainerMount

    # Compose-only target
    - source: ./logs
      destination: /workspace/logs
      target: composeVolume

    # Raw-value fallback for advanced/custom cases
    - value: './custom-src:/custom-dest:ro'
      target: composeVolume
```

#### Routing table

| `target`            | `stack: plain`               | `stack: compose`                                     |
| ------------------- | ---------------------------- | ---------------------------------------------------- |
| `auto` (default)    | `devcontainer.json mounts[]` | `devcontainer.json mounts[]`                         |
| `devcontainerMount` | `devcontainer.json mounts[]` | `devcontainer.json mounts[]`                         |
| `composeVolume`     | ❌ Error                     | `docker-compose.yml services.devcontainer.volumes[]` |

Use `devcontainerMount` when you want the same explicit `devcontainer.json mounts[]` routing regardless of stack.
Use `composeVolume` when you explicitly want compose volume routing.

Mounts declared here are applied **before** `customizations.devcontainerPatch` and
`customizations.dockerComposePatch`, so patch overrides are respected.

#### Mount spec formats

Structured entries are rendered into the correct target syntax automatically. You can still use
raw strings (or `value`) when needed:

```yaml
mounts:
    # devcontainer.json style (works with auto/devcontainerMount on any stack)
    - 'source=${localWorkspaceFolder}/../shared,target=/workspace/shared,type=bind'

    # Docker Compose short syntax (use with composeVolume on a compose stack)
    - value: './local-data:/workspace/data'
      target: composeVolume

    # Docker named volume (devcontainer style)
    - 'source=my-cache,target=/root/.cache,type=volume'
```

---

### `shell`

Declarative shell profile customizations. This is intended for aliases and shell snippets.

Use top-level `env` for environment variables (`export`-style values), not `shell`.
`shell` is for interactive shell UX (aliases, completions, snippets).

```yaml
shell:
    aliases:
        k: kubectl
        kgp: kubectl get pods
    snippets:
        - source /etc/profile
        # Shell-specific commands must be guarded — shell-init.sh is sourced by
        # both ~/.bashrc and ~/.zshrc, so unguarded bash-only syntax causes errors
        # in zsh and vice versa.  Use $BASH_VERSION / $ZSH_VERSION to guard:
        - '[ -n "$BASH_VERSION" ] && complete -C ''/usr/local/bin/aws_completer'' aws'
```

Generation behavior:

- Writes `.devcontainer/scripts/shell-init.sh` with aliases/snippets
- Adds a postCreate hook that idempotently manages a marked block in:
    - `~/.bashrc`
    - `~/.zshrc`
- The managed block sources the generated `shell-init.sh`

> **Note:** `shell-init.sh` is sourced by **both** `~/.bashrc` and `~/.zshrc`.
> Keep `snippets` shell-agnostic, or guard shell-specific commands with
> `$BASH_VERSION` / `$ZSH_VERSION` checks (see example above).

---

### `customizations`

Inline patches applied during generation. These are the same patches that can be placed in
`.devcontainer/custom/` — `superposition.yml` lets you keep them in the project file instead.

```yaml
customizations:
    devcontainerPatch:
        features:
            ghcr.io/devcontainers-extra/features/apt-get-packages:1:
                packages: jq curl
        customizations:
            vscode:
                extensions:
                    - eamodio.gitlens

    dockerComposePatch:
        services:
            devcontainer:
                extra_hosts:
                    - 'host.docker.internal:host-gateway'

    envTemplate:
        POSTGRES_PASSWORD: postgres
        MY_API_KEY: changeme

    scripts:
        postCreate:
            - npm install
            - npx prisma migrate dev
        postStart:
            - pg_isready -h postgres || true

    files:
        - path: config/app.yml
          content: |
              database:
                host: postgres
                port: 5432
```

#### Application order

1. Base template loaded
2. Overlays applied in order
3. Port offsets applied
4. Project `ports` applied (without `portOffset`)
5. Project `env` applied
6. Project `mounts` applied
7. `customizations.devcontainerPatch` merged (deepMerge, arrays deduplicated)
8. `customizations.dockerComposePatch` merged
9. Target-specific patches applied
10. Files written

---

### `portOffset`

```yaml
portOffset: 100
```

Shifts all overlay-declared host ports by the given integer. Useful when running multiple
instances of the same stack on one machine (e.g. feature branches in parallel).

---

### `outputPath`

```yaml
outputPath: ./.devcontainer
```

Where to write the generated devcontainer files. Default: `./.devcontainer`.

---

### `target`

```yaml
target: codespaces # local | codespaces | gitpod | devpod
```

Selects a deployment-target profile that applies environment-specific patches.

See [deployment-targets.md](deployment-targets.md) for details.

---

### `minimal`

```yaml
minimal: true
```

When `true`, overlays marked with `minimal: true` in their `overlay.yml` are excluded. Useful
for CI environments where extra tooling is unnecessary.

---

### `editor`

```yaml
editor: vscode # vscode | jetbrains | none
```

Selects the editor customization profile:

| Value       | Effect                                                                       |
| ----------- | ---------------------------------------------------------------------------- |
| `vscode`    | Include VS Code extensions and settings from all selected overlays (default) |
| `jetbrains` | Remove VS Code customizations; add `customizations.jetbrains` block          |
| `none`      | Remove VS Code customizations entirely                                       |

---

### `devcontainerGitignore`

```yaml
devcontainerGitignore: true
```

When `true`, generation writes `outputPath/.gitignore` with wildcard rules that ignore all
generated devcontainer artifacts (while keeping `.gitignore` itself tracked):

```gitignore
*
!.gitignore
```

Use this when `superposition.yml` is the canonical source and you do not want generated files
committed to Git.

---

### `parameters`

```yaml
parameters:
    POSTGRES_VERSION: '16'
    POSTGRES_PORT: '5433'
    REDIS_PASSWORD: mysecret
```

Overlay parameter values. Keys correspond to parameter names declared in `overlay.yml`
`parameters:` sections. Values are substituted for `{{cs.KEY}}` tokens throughout generated
files.

#### Ad-hoc (project-only) parameters

You can define parameters in `parameters:` that are not declared by any overlay. These are
resolved normally and available for `{{cs.KEY}}` substitution in `env:` values and overlay
file content. They are called **project-only parameters**.

```yaml
parameters:
    POSTGRES_DB: myapp # declared by postgres overlay
    API_PORT: 8088 # project-only — not declared by any overlay
    WEB_DEV_PORT: 5173 # project-only

env:
    VITE_API_URL: 'http://localhost:{{cs.API_PORT}}'
    API_PORT: '{{cs.API_PORT}}'
```

During `regen`, the tool reports project-only parameters separately from overlay parameters:

```
   ⚙️  Overlay parameters:
      POSTGRES_DB=myapp
   ⚙️  Project-only parameters (not declared by any selected overlay):
      API_PORT=8088
      WEB_DEV_PORT=5173
```

`doctor` notes them as an informational warning (`project-only-parameters`). If a key is
intentional, no action is needed. If it is a typo or left over from a removed overlay,
remove it from `parameters:`.

**Project-only parameters are not treated as sensitive.** Values appear in console output and
generated files in plain text. For any value that should not be committed to source control,
use `${VAR:-default}` runtime syntax in `env:` directly instead of `{{cs.KEY}}`.

> **`ports:` note**: Port bindings use `${VAR:-default}` runtime syntax, not `{{cs.KEY}}`.
> Use `{{cs.API_PORT}}` in `env:` values; use `${API_PORT:-8080}:8080` in `ports:` entries.

---

## Parameter tokens (`{{cs.KEY}}`)

Parameter tokens let you reference resolved overlay parameter values in `env:` values and
overlay file content at generation time.

### Syntax

```
{{cs.KEY}}
```

`KEY` must match `[A-Z0-9_]+`. Lowercase keys and dotted paths are not supported.

### Supported fields

| Field                                            | Supported | Notes                              |
| ------------------------------------------------ | --------- | ---------------------------------- |
| `env:` values (string shorthand)                 | ✅        | Resolved at `regen` / `init`       |
| `env:` long-form `.value`                        | ✅        | Resolved at `regen` / `init`       |
| Overlay file content (patches, compose, scripts) | ✅        | Resolved at `regen` / `init`       |
| `customizations.envTemplate` values              | ✅        | Resolved at `regen` / `init`       |
| `env:` key (left side)                           | ❌        | Keys are literal identifiers       |
| `env:` `.target`                                 | ❌        | Enum value, not a template         |
| `ports:` expressions                             | ❌        | Use `${VAR}` runtime syntax        |
| `stack:`, `baseImage:`, `containerName:`         | ❌        | Scalar config, no substitution     |
| `parameters:` values                             | ❌        | Parameters ARE the resolved source |

### Pass-through guarantee

The `{{cs.KEY}}` engine ONLY replaces `{{cs.*}}` tokens. All other expressions pass
through untouched:

| Expression                | Touched? | Resolved by                         |
| ------------------------- | -------- | ----------------------------------- |
| `{{cs.KEY}}`              | ✅ Yes   | Tool at generation time             |
| `${VAR}`                  | No       | Docker Compose / shell at runtime   |
| `${VAR:-default}`         | No       | Docker Compose / shell at runtime   |
| `${containerEnv:KEY}`     | No       | VS Code devcontainer at attach time |
| `${localWorkspaceFolder}` | No       | VS Code devcontainer at attach time |
| `${{ }}` (GitHub Actions) | No       | GitHub Actions runner               |
| `$FOO` (bare shell)       | No       | Shell at runtime                    |

### Rationale for `cs.` prefix

The `cs.` namespace prefix is owned by this tool. The `{{` `}}` delimiters are unique
in the set of files the tool generates and do not collide with Docker Compose, shell,
VS Code, or GitHub Actions expression syntaxes.

---

## Complete example

```yaml
stack: compose
baseImage: bookworm
containerName: My Web API

overlays:
    - nodejs
    - postgres
    - redis
    - grafana

env:
    APP_ENV: development
    NODE_ENV: development
    DATABASE_URL:
        value: 'postgres://postgres:${POSTGRES_PASSWORD:-postgres}@postgres:5432/app'
        target: composeEnv

mounts:
    # Bind-mount shared workspace tools (plain and compose auto-routing)
    - 'source=${localWorkspaceFolder}/../tools,target=/workspace/tools,type=bind,readonly'
    # Always inject local SSL certificates into devcontainer.json
    - value: 'source=${localWorkspaceFolder}/.certs,target=/usr/local/share/ca-certificates,type=bind,readonly'
      target: devcontainerMount

portOffset: 0
ports:
    - ${API_PORT:-8080}:8080
    - ${WEB_DEV_PORT:-5173}:5173

target: local

customizations:
    envTemplate:
        POSTGRES_PASSWORD: postgres
        REDIS_PASSWORD: ''
    devcontainerPatch:
        features:
            ghcr.io/devcontainers-extra/features/apt-get-packages:1:
                packages: jq httpie
    scripts:
        postCreate:
            - npm install
        postStart:
            - pg_isready -h postgres -U postgres || true

parameters:
    POSTGRES_VERSION: '16'
    REDIS_PORT: '6379'
```

---

## Legacy fields (deprecated)

These category arrays are accepted for backward compatibility but `overlays:` is preferred:

```yaml
# Deprecated — use overlays: [nodejs, python] instead
language:
    - nodejs
    - python

# Deprecated — use overlays: [postgres, redis] instead
database:
    - postgres
    - redis

# Deprecated — use overlays: [playwright] instead
playwright: true

# Deprecated — use overlays: [azure-cli] instead
cloudTools:
    - azure-cli

# Deprecated — use overlays: [docker-in-docker] instead
devTools:
    - docker-in-docker

# Deprecated — use overlays: [prometheus] instead
observability:
    - prometheus
```

---

## See also

- [Overlays catalogue](overlays.md)
- [Custom patches](custom-patches.md)
- [Deployment targets](deployment-targets.md)
- [Presets](presets.md)
- [Merge strategy](merge-strategy.md)
- [Workflows and regen](workflows.md)
