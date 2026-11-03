# Local Devcontainer Amendment

Use `cs amend` when a repository already has a team-owned devcontainer but the team has **not** adopted Container Superposition, and you need a personal local layer such as Pi state mounts, local environment values, shell aliases, or editor settings.

This is not `adopt` and it does not create shared `superposition.yml`, `.superposition.yml`, `superposition.json`, or `superposition.local.yml` authority.

## Ownership model

- Existing `.devcontainer/devcontainer.json` or `.devcontainer.json` = **team-owned base**.
- `.container-superposition/amendment.yml` = **your personal local input**.
- Generated `superposition-local/devcontainer.json` beside a `devcontainer.json` base, or `.container-superposition/amendment/devcontainer.json` for a root `.devcontainer.json` base, plus `.container-superposition/amendment/` support files = **local uncommitted amendment artifacts**.
- `adopt` = **team migration path** when the repository should become Container Superposition-managed.

The command never stages files, unstages files, commits files, or runs `git rm`. If a local amendment path is already tracked, it stops and prints manual `git rm --cached -- ...` guidance.

## Workflow

If this is an existing devcontainer that does not already provide `cs`, first add the published `ghcr.io/veggerby/container-superposition/container-superposition:1` Feature to the team-owned devcontainer and rebuild it. Feature installation only makes the command available; it does not inspect this workspace or apply an amendment.

```bash
# Create local input, local receipt, ignore protection, and a no-op alternate config
cs amend init

# Edit your personal layer
$EDITOR .container-superposition/amendment.yml

# Rebuild the alternate local config deterministically
cs amend refresh

# Inspect ownership, drift, generated files, ignore protection, and launch command
cs amend inspect
cs amend inspect --json

# Remove generated local artifacts while keeping your input for later
cs amend remove

# Remove generated artifacts and input; remove the local exclude block when safe
cs amend remove --purge
```

`amend remove --purge` leaves a Dev Container CLI-created sibling `devcontainer-lock.json` untouched. If that lock or user-managed content in `.container-superposition/` remains, the local exclude block stays in place so those files cannot be accidentally committed. Remove the remaining file manually if no longer needed; the exclude block can then be removed manually or by a later amendment purge.

`amend refresh` also migrates receipts created by older releases that named the alternate config `devcontainer.superposition-local.json`. The old artifact may already be absent; refresh writes the current `devcontainer.json` location and updates the local receipt.

Launch the amended configuration with the standard Dev Container CLI alternate-config option printed by `amend init`, `amend refresh`, and `amend inspect`:

```bash
devcontainer up --workspace-folder . --config .devcontainer/superposition-local/devcontainer.json
```

After `cs amend refresh`, rebuild the personal alternate configuration before using structural changes. Ordinary VS Code **Reopen in Container** and Dev Containers auto-discovery still select the team-owned base devcontainer. That is intentional: this workflow does not replace `.devcontainer/devcontainer.json`, write `.vscode/settings.json`, or make your personal alternate config the repository default.

After the printed `devcontainer up --workspace-folder ... --config ...` command has started the amended container, use normal VS Code Dev Containers flows to enter it, such as **Attach to Running Container** or **Open Folder in Container** when supported by your VS Code/Dev Containers version. Do not commit the generated alternate config, replace the team's devcontainer, or change shared workspace settings just to make VS Code's default reopen action select your local amendment.

If you want the repository's ordinary VS Code reopen flow to use the amended setup by default, that is a team migration decision rather than an `amend` workflow. Use `adopt` when the team wants Container Superposition-managed shared intent; otherwise keep the amendment local-only and launch it with the printed Dev Container CLI command.

## Local input fields

`amendment.yml` reuses the same local enrichment field shapes as `superposition.local.yml` where they already exist, but it is a distinct amendment vocabulary because it also supports local-only `catalogs`, `overlays`, and `parameters`. Do not point it at `superposition.local.schema.json`.

```yaml
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

# Optional personal overlay enrichment. This never changes team-owned files.
overlays:
    - aws-cli
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

## Personal overlay enrichment and compatibility

`overlays` is an opt-in local-only list. It can select built-in IDs or namespace-qualified IDs from an explicitly declared `catalogs` entry. Catalog declarations use the same immutable git/archive or repository-relative path rules as managed project catalogs; the amendment receipt records the resolved catalog identity alongside the resolved overlay selection. For example:

```yaml
catalogs:
    - id: personal-tools
      namespace: acme
      source:
          type: git
          url: https://example.invalid/acme/personal-tools.git
          commit: 0123456789abcdef0123456789abcdef01234567
overlays:
    - acme/personal-tools
```

`cs amend refresh` resolves its complete dependency set before writing the alternate configuration. It accepts a compatible selection only when every requested effect can be represented under amendment ownership; it never drops an overlay, dependency, feature, or parameter to make a selection appear to work.

Compatibility is evaluated against the discovered base shape, not a permanent overlay allowlist. Compatible patches, setup/verify scripts (with their sibling setup utility), `.env.example`, and regular overlay support files are materialized beneath the receipt-owned `.container-superposition/amendment/` subtree. Compatible compose fragments without relative file references are added only to the personal compose override; a service or volume collision with the team-owned compose files is rejected. Imports that cannot retain their managed meaning under the personal subtree, including `.env` imports, are rejected before any write rather than silently omitted. For example, compose-only overlays such as `postgres` are rejected on a plain base before any new alternate configuration is written. The error names the incompatible overlay and routes you to choose a compatible overlay, use a compose base, or adopt managed generation. Effects that cannot be relocated safely (including overlay `.gitignore` changes, symlinks, or a collision) are rejected rather than partially applied.

Successful receipts record requested and resolved overlays, the compatible base shape, and every owned artifact. `cs amend inspect --json` exposes that receipt, and `cs amend remove` deletes all receipt-owned outputs while leaving the team base untouched.

## Supported bases

Initial support covers:

- exactly one default `.devcontainer/devcontainer.json` or `.devcontainer.json`, or a repository-contained `--base <path>`;
- JSON object devcontainer files, including VS Code-style JSONC comments and trailing commas;
- image, Dockerfile/build, and compose-backed devcontainers;
- compose `dockerComposeFile` as a string or string array with repository-contained files;
- local Dev Container Feature source keys such as `./features/example` or `../shared-feature`, which remain relative to the team-owned base after the alternate config is generated.

The command stops before writes for ambiguous default bases, missing bases, unsupported compose references, bases outside the repository, tracked local paths, or repositories that already have shared Container Superposition authority.

## Git protection

In a Git worktree, `amend init` writes a labeled block to the worktree-local exclude file reported by:

```bash
git rev-parse --git-path info/exclude
```

That local exclude block covers `.container-superposition/`, the generated alternate config path, and its sibling Dev Container CLI lock file. It avoids changing the team's root `.gitignore`. In a non-Git directory, the command can proceed but warns that no Git protection is available.
