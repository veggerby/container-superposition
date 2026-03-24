# Filesystem Contract

This describes what the tool writes and which files are safe to edit.

## What Gets Written

```
your-project/
├── .devcontainer/               # Main devcontainer directory
│   ├── devcontainer.json        # Container configuration
│   ├── docker-compose.yml       # Services (compose stack only)
│   ├── .env.example             # Environment variable templates
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
├── .gitpod.yml                  # Gitpod workspace config (--target gitpod only)
├── devpod.yaml                  # DevPod workspace descriptor (--target devpod only)
└── .devcontainer.backup-*/      # Automatic backups (gitignored)
```

## Files You Should Customize

- `.devcontainer/.env` or `.env` (copied from `.env.example`)
- `.devcontainer/custom/` (your patches and scripts)

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

- `superposition.json`
- `.devcontainer/` (generated configuration)
- `.devcontainer/custom/` (project-specific patches)
- `.devcontainer/.env.example`

## Files in .gitignore

```
# Environment secrets (never commit)
.env
.devcontainer/.env

# Regeneration backups (local only)
.devcontainer.backup-*
```
