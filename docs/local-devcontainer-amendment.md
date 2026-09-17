# Local Devcontainer Amendment

Use `cs amend` when a repository already has a team-owned devcontainer but the team has **not** adopted Container Superposition, and you need a personal local layer such as Pi state mounts, local environment values, shell aliases, or editor settings.

This is not `adopt` and it does not create shared `superposition.yml`, `.superposition.yml`, `superposition.json`, or `superposition.local.yml` authority.

## Ownership model

- Existing `.devcontainer/devcontainer.json` or `.devcontainer.json` = **team-owned base**.
- `.container-superposition/amendment.yml` = **your personal local input**.
- Generated `devcontainer.superposition-local.json` / `.devcontainer.superposition-local.json` and `.container-superposition/amendment/` = **local uncommitted amendment artifacts**.
- `adopt` = **team migration path** when the repository should become Container Superposition-managed.

The command never stages files, unstages files, commits files, or runs `git rm`. If a local amendment path is already tracked, it stops and prints manual `git rm --cached -- ...` guidance.

## Workflow

```bash
# Create local input, local receipt, ignore protection, and a no-op alternate config
npx container-superposition amend init

# Edit your personal layer
$EDITOR .container-superposition/amendment.yml

# Rebuild the alternate local config deterministically
npx container-superposition amend refresh

# Inspect ownership, drift, generated files, ignore protection, and launch command
npx container-superposition amend inspect
npx container-superposition amend inspect --json

# Remove generated local artifacts while keeping your input for later
npx container-superposition amend remove

# Remove generated artifacts, input, and the command-owned local exclude block
npx container-superposition amend remove --purge
```

Launch the amended configuration with the standard Dev Container CLI alternate-config option printed by `amend init`, `amend refresh`, and `amend inspect`:

```bash
devcontainer up --workspace-folder . --config .devcontainer/devcontainer.superposition-local.json
```

Ordinary VS Code **Reopen in Container** and Dev Containers auto-discovery still select the team-owned base devcontainer. That is intentional: this workflow does not replace `.devcontainer/devcontainer.json`, write `.vscode/settings.json`, or make your personal alternate config the repository default.

After the printed `devcontainer up --workspace-folder ... --config ...` command has started the amended container, use normal VS Code Dev Containers flows to enter it, such as **Attach to Running Container** or **Open Folder in Container** when supported by your VS Code/Dev Containers version. Do not commit the generated alternate config, replace the team's devcontainer, or change shared workspace settings just to make VS Code's default reopen action select your local amendment.

If you want the repository's ordinary VS Code reopen flow to use the amended setup by default, that is a team migration decision rather than an `amend` workflow. Use `adopt` when the team wants Container Superposition-managed shared intent; otherwise keep the amendment local-only and launch it with the printed Dev Container CLI command.

## Local input fields

`amendment.yml` reuses the same local enrichment field shapes as `superposition.local.yml` where they already exist:

```yaml
$schema: https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.local.schema.json
env:
    PI_HOME: ${localEnv:HOME}/.pi
mounts:
    - source=${localEnv:HOME}/.pi,target=/home/vscode/.pi,type=bind
shell:
    aliases:
        pi: 'cd /home/vscode/.pi'
    snippets:
        - export PI_MODE=local
vscodeExtensions:
    - GitHub.copilot
customizations:
    devcontainerPatch:
        customizations:
            vscode:
                settings:
                    pi.enabled: true
```

Compose-backed devcontainers may target compose environment or volumes:

```yaml
env:
    PI_CACHE:
        value: /pi-cache
        target: composeEnv
mounts:
    - value: pi-cache:/pi-cache
      target: composeVolume
customizations:
    dockerComposePatch:
        services:
            app:
                labels:
                    container-superposition.local: 'true'
```

## Supported bases

Initial support covers:

- exactly one default `.devcontainer/devcontainer.json` or `.devcontainer.json`, or a repository-contained `--base <path>`;
- strict JSON object devcontainer files (not JSONC/comments);
- image, Dockerfile/build, and compose-backed devcontainers;
- compose `dockerComposeFile` as a string or string array with repository-contained files.

The command stops before writes for ambiguous default bases, missing bases, unsupported compose references, bases outside the repository, tracked local paths, or repositories that already have shared Container Superposition authority.

## Git protection

In a Git worktree, `amend init` writes a labeled block to the worktree-local exclude file reported by:

```bash
git rev-parse --git-path info/exclude
```

That local exclude block covers `.container-superposition/` and the generated sibling alternate config. It avoids changing the team's root `.gitignore`. In a non-Git directory, the command can proceed but warns that no Git protection is available.
