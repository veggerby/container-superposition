# MkDocs 2 Overlay

MkDocs 2.0 pre-release from [encode/mkdocs](https://github.com/encode/mkdocs) — a smart, simple website design tool by Tom Christie.

> **Pre-release notice:** MkDocs 2.0 is installed from the `encode/mkdocs` git repository. There is no PyPI release yet. This is a complete rewrite of the original MkDocs project — it is **not** backward-compatible with MkDocs 1.x.

## Features

- **MkDocs 2.0** — complete rewrite with modern architecture
- **TOML configuration** — uses `mkdocs.toml` instead of `mkdocs.yml`
- **Built-in theming** — custom theme system (does not use Material for MkDocs)
- **GitHub Flavored Markdown** — native GFM support
- **pymdown-extensions** — extended Markdown syntax included
- **Python dependency** — automatically includes the Python overlay (required)
- **VS Code Extensions:**
    - Markdown All in One
    - Markdown Lint
    - Markdown Mermaid
- **Port forwarding:** 8000 (MkDocs dev server, auto-opens in browser)

## How It Works

The overlay's `setup.sh` script installs MkDocs 2.0 directly from the
[encode/mkdocs](https://github.com/encode/mkdocs) GitHub repository via
`pip install git+https://github.com/encode/mkdocs.git` into the workspace
virtual environment (`.venv`) created by the Python overlay.

## Dependencies

- Requires: **python** overlay (automatically selected)
- Conflicts: **mkdocs** overlay — only one MkDocs variant can be active at a time

## Quick Start

### New Documentation Site

```bash
# Create a README.md and start the dev server
echo "# My Docs" > README.md
mkdocs serve
# Opens at http://localhost:8000
```

### Build Static Site

```bash
mkdocs build
```

## Configuration

MkDocs 2.0 uses `mkdocs.toml` (not the 1.x `mkdocs.yml`):

```toml
[mkdocs]
nav = [
    {path = "README.md", title = "Introduction"},
    {path = "guide.md", title = "Guide"},
    {path = "CREDITS.md", title = "Credits"},
]

[loaders]
theme = "pkg://mkdocs/default"
docs = "dir://docs"

[context]
title = "Documentation"
favicon = "📘"
```

### Page Structure

Use either `README.md` or `index.md` for the homepage. Place additional pages in a `docs/` directory:

```
my-project/
├── mkdocs.toml
├── README.md
├── docs/
│   ├── guide.md
│   └── reference.md
└── site/           # Built output (git-ignored)
```

## Key Differences from MkDocs 1.x

| Feature        | MkDocs 1.x (`mkdocs` overlay) | MkDocs 2.0 (`mkdocs2` overlay) |
| -------------- | ----------------------------- | ------------------------------ |
| Config file    | `mkdocs.yml`                  | `mkdocs.toml`                  |
| Theme          | Material for MkDocs           | Built-in themes                |
| Plugin system  | `mkdocs-plugins` ecosystem    | New architecture               |
| Install source | PyPI / devcontainer feature   | `encode/mkdocs` git repo       |
| Markdown       | Standard + extensions         | GitHub Flavored Markdown       |
| Status         | Stable (1.6.1)                | Pre-release (2.0)              |

## Common Commands

```bash
# Start live-reloading dev server
mkdocs serve

# Build static site
mkdocs build

# Serve on a different port
mkdocs serve --dev-addr 0.0.0.0:8001
```

## Troubleshooting

### `mkdocs: command not found`

The Python virtual environment may not be activated. Activate it manually:

```bash
source .venv/bin/activate
mkdocs --version
```

### Port 8000 already in use

Use a different port: `mkdocs serve --dev-addr 0.0.0.0:8001`

## References

- [encode/mkdocs on GitHub](https://github.com/encode/mkdocs)
- [MkDocs 2.0 writing guide](https://github.com/encode/mkdocs/blob/main/docs/writing.md)
- [MkDocs 2.0 navigation docs](https://github.com/encode/mkdocs/blob/main/docs/navigation.md)
- [MkDocs 2.0 styling docs](https://github.com/encode/mkdocs/blob/main/docs/styling.md)

**Related Overlays:**

- `python` — required Python runtime
- `mkdocs` — legacy MkDocs 1.x overlay (conflicts with this overlay)
- `pandoc` — convert Markdown to PDF
