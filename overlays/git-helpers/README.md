# Git Helpers Overlay

Comprehensive Git tooling with GPG/SSH support, Git LFS, and GitHub CLI.

## What's Included

- **Git** - Latest version with enhanced configuration
- **Git LFS** - Large File Storage support
- **GitHub CLI (gh)** - GitHub command-line tool
- **SSH Agent Forwarding** - Mounts host SSH keys (read-only)
- **GPG Support** - Mounts host GPG keys for commit signing
- **VS Code Extensions**:
  - GitLens - Enhanced Git visualization
  - GitHub Pull Requests - PR management in VS Code
  - Git Graph - Interactive git graph visualization

## Configuration

### SSH Keys (Optional Mount)

To use your host SSH keys in the container, add this mount to your `devcontainer.json`:

```json
"mounts": [
  "source=${localEnv:HOME}${localEnv:USERPROFILE}/.ssh,target=/home/vscode/.ssh,type=bind,consistency=cached,readOnly=true"
]
```

This allows you to:
- Push/pull from Git repositories using SSH
- Use SSH agent forwarding
- Maintain existing SSH configurations

**Note**: Keys are mounted read-only for security. Generate new keys inside the container if needed.

### GPG Keys (Optional Mount)

To use your host GPG keys in the container, add this mount to your `devcontainer.json`:

```json
"mounts": [
  "source=${localEnv:HOME}${localEnv:USERPROFILE}/.gnupg,target=/home/vscode/.gnupg,type=bind,consistency=cached"
]
```

**Important**: Only add this mount if you have a `~/.gnupg` directory on your host machine. Otherwise, the container may fail to start.

### GPG Commit Signing

GPG commit signing is supported but requires manual setup:

1. Import your GPG keys into the container, or generate new ones:
   ```bash
   # Generate a new key
   gpg --full-generate-key
   
   # Or import from your host (copy your key ID first on host with: gpg --list-secret-keys)
   # On host: gpg --export-secret-keys YOUR_KEY_ID > key.gpg
   # In container: gpg --import key.gpg
   ```

2. Configure Git to use your signing key:
   ```bash
   git config --global user.signingkey YOUR_KEY_ID
   git config --global commit.gpgsign true
   git config --global tag.gpgsign true
   ```

**Note**: GPG keys are not automatically mounted to avoid container startup failures when `~/.gnupg` doesn't exist on the host.

### GitHub CLI Authentication

Authenticate with GitHub:

```bash
gh auth login
```

Follow the interactive prompts to authenticate via browser or token.

## Git LFS

Git LFS is pre-installed. To use it in your repository:

```bash
# Initialize in your repo
git lfs install

# Track large files (e.g., videos, datasets)
git lfs track "*.mp4"
git lfs track "*.zip"

# Commit the .gitattributes file
git add .gitattributes
git commit -m "Configure Git LFS"
```

## Useful Git Aliases

A sample `.gitconfig-devcontainer` is created with useful aliases:

- `git st` - Status
- `git co` - Checkout
- `git br` - Branch
- `git ci` - Commit
- `git unstage` - Unstage files
- `git last` - Show last commit
- `git visual` - Pretty graph visualization
- `git amend` - Amend last commit without editing message

Include it in your `.gitconfig`:

```ini
[include]
    path = ~/.gitconfig-devcontainer
```

## GitHub CLI Usage

```bash
# Create a pull request
gh pr create

# Check out a PR locally
gh pr checkout 123

# View repository issues
gh issue list

# Create a new repository
gh repo create
```

## Troubleshooting

### SSH Permissions

If you encounter SSH permission errors, the setup script automatically fixes permissions:
- `~/.ssh` directory: 700
- SSH key files: 600

### GPG Agent Issues

If GPG signing fails, ensure the GPG agent is running:

```bash
gpg-agent --daemon
```

### Git LFS Not Tracking Files

Verify LFS is initialized in your repository:

```bash
git lfs install
git lfs ls-files  # List tracked files
```

## Security Notes

- SSH keys are mounted **read-only** from your host
- GPG keys are mounted with restricted permissions (700/600)
- Never commit private keys to your repository
- Use SSH agent forwarding for secure remote access
