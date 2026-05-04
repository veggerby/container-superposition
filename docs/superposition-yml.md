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

---

## Reference

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

#### `${VAR}` references

Values can reference variables from the root `.env` file using `${VAR}` or
`${VAR:-default}` syntax. These are resolved at generation time and written into the
appropriate output file.

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
4. Project `env` applied
5. Project `mounts` applied
6. `customizations.devcontainerPatch` merged (deepMerge, arrays deduplicated)
7. `customizations.dockerComposePatch` merged
8. Target-specific patches applied
9. Files written

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
