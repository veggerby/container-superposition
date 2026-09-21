# Filesystem Contract

This describes what the tool writes and which files are safe to edit.

## What Gets Written

```
your-project/
├── .devcontainer/               # Main devcontainer directory
│   ├── devcontainer.json        # Container configuration
│   ├── docker-compose.yml       # Services (compose stack only)
│   ├── .env.example             # Optional environment variable templates
│   ├── ports.json               # Port documentation and connection strings
│   ├── CODESPACES.md            # Codespaces setup guidance (--target codespaces only)
│   ├── GITPOD.md                # Gitpod setup guidance (--target gitpod only)
│   ├── DEVPOD.md                # DevPod setup guidance (--target devpod only)
│   ├── scripts/                 # Setup and verification scripts
│   │   ├── post-create.sh       # Runs once when container is created
│   │   └── post-start.sh        # Runs every time container starts
│   └── custom/                  # Your customizations (preserved across regen)
│       ├── devcontainer.patch.json
│       └── docker-compose.patch.yml
├── superposition.json           # Manifest file (enables regeneration)
├── superposition.local.yml      # Optional local config for managed repos (gitignored, not shared)
├── .container-superposition/    # Local amendment input/state for non-adopting repos (amend only)
├── .gitpod.yml                  # Gitpod workspace config (--target gitpod only)
├── devpod.yaml                  # DevPod workspace descriptor (--target devpod only)
└── .devcontainer.backup-*/      # Automatic backups (gitignored)
```

## Files You Should Customize

- `.devcontainer/.env` when `composeEnvFiles: true`, or repository-root `.env` when your project uses one
- `.devcontainer/custom/` (shared project patches and scripts)
- `superposition.local.yml` (local config for machine-specific generated-output enrichment in repositories already using shared Container Superposition config; keep gitignored)
- `.container-superposition/amendment.yml` (personal local amendment input for a non-adopting repository with an existing team devcontainer; keep local-only)

## Files Safe to Edit Directly

- `.devcontainer/custom/devcontainer.patch.json`
- `.devcontainer/custom/docker-compose.patch.yml`
- `.devcontainer/custom/environment.env`
- `.devcontainer/custom/scripts/*`

## Files Regenerated (Do Not Edit Directly)

- `.devcontainer/devcontainer.json`
- `.devcontainer/docker-compose.yml`
- `.devcontainer/scripts/*`

## Files You Should Commit

- `superposition.yml` or `.superposition.yml`
- `superposition.json`
- `.devcontainer/` only when your repository intentionally commits generated output
- `.devcontainer/custom/` (project-specific patches)
- `.devcontainer/.env.example` when `composeEnvFiles: true`

Do not commit `superposition.local.yml`, `.container-superposition/`, generated `superposition-local/devcontainer.json` amendment configs, or generated output containing local-only settings. Do not replace the team's `.devcontainer/devcontainer.json` or shared VS Code workspace settings to make an `amend` artifact the default; launch it with the printed Dev Container CLI `--config` command instead. Prefer
`devcontainerGitignore: true` for managed generated output; `amend` uses worktree-local `info/exclude` for its local-only paths when Git is available. If generated output was already tracked, untrack generated output manually:

```bash
git rm -r --cached -- .devcontainer
```

## Files in .gitignore

```
# Environment secrets (never commit)
.env
.devcontainer/.env

# Regeneration backups (local only)
.devcontainer.backup-*

# Local config (personal generated-output enrichment)
superposition.local.yml

# Local devcontainer amendment (usually written to .git/info/exclude by amend)
.container-superposition/
.devcontainer/superposition-local/devcontainer.json
```
