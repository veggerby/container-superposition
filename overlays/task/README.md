# Taskfile (task) Overlay

Adds [Task](https://taskfile.dev/) (`task`) to run project automation via `Taskfile.yml`.

## Features

- **Task CLI** — fast, modern task runner (`task`)
- **Taskfile workflows** — declarative task definitions with dependencies and variables
- **Architecture-aware install** — installs amd64 or arm64 binary automatically

## Quick Start

```bash
task --version
task --list
```

Create a basic `Taskfile.yml`:

```yaml
version: '3'

tasks:
    default:
        cmds:
            - task --list

    lint:
        cmds:
            - npm run lint

    test:
        cmds:
            - npm test
```

Run tasks:

```bash
task lint
task test
```

## Suggested Pairings

- `modern-cli-tools` — useful companion CLIs for day-to-day development
- `kubectl-helm` — pair task automation with Kubernetes workflows
