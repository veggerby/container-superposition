# MkDocs 2 Overlay

MkDocs 2.x with Material theme — modern documentation generator.

## Features

- **MkDocs 2.x** — documentation generator (2.x release series)
- **Material for MkDocs** — polished, feature-rich theme (`mkdocs-material>=9.x`)
- **Common MkDocs plugins:**
    - `mkdocs-minify-plugin` — HTML/CSS/JS minification
    - `mkdocs-redirects` — Page redirect support
    - `pymdown-extensions` — Extended Markdown syntax
- **Python dependency** — Automatically includes the Python overlay (required)
- **VS Code Extensions:**
    - Markdown All in One
    - Markdown Lint
    - Markdown Mermaid
- **Port forwarding:** 8000 (MkDocs dev server, auto-opens in browser)

## How It Works

The overlay's `setup.sh` script installs MkDocs 2.x and its plugins via `pip`
into the workspace virtual environment (`.venv`) created by the Python overlay.
This gives precise version control over each package and avoids the limitations
of the older `ghcr.io/devcontainers-extra/features/mkdocs:2` feature used by
the legacy `mkdocs` overlay.

MkDocs is then available on the workspace `PATH` through the activated virtual
environment.

## Dependencies

- Requires: **python** overlay (automatically selected)
- Conflicts: **mkdocs** overlay — only one MkDocs variant can be active at a time

## Quick Start

### New Documentation Site

```bash
# Create new MkDocs project
mkdocs new .

# Start development server (opens at http://localhost:8000)
mkdocs serve
```

### Existing Site

```bash
# Start development server
mkdocs serve

# Build static site (output in site/)
mkdocs build
```

## MkDocs Configuration

### Basic `mkdocs.yml`

```yaml
site_name: My Documentation
theme:
    name: material
    palette:
        scheme: default
        primary: indigo
        accent: indigo
    features:
        - navigation.sections
        - navigation.expand
        - toc.integrate

nav:
    - Home: index.md
    - About: about.md

markdown_extensions:
    - pymdownx.highlight:
          anchor_linenums: true
    - pymdownx.superfences
    - pymdownx.tabbed:
          alternate_style: true
    - admonition
    - attr_list
```

### Common Plugins

```yaml
plugins:
    - search
    - minify:
          minify_html: true
    - redirects:
          redirect_maps:
              'old-page.md': 'new-page.md'
```

## Common Commands

### Development

```bash
# Start live-reloading dev server
mkdocs serve

# Serve on a different address/port
mkdocs serve --dev-addr 0.0.0.0:8001

# Build site without serving
mkdocs build

# Build with verbose output
mkdocs build --verbose

# Remove site/ before building
mkdocs build --clean
```

### Project Management

```bash
# Create a new docs project in the current directory
mkdocs new .

# Check for configuration errors
mkdocs build --strict
```

### Deployment

```bash
# Deploy to GitHub Pages
mkdocs gh-deploy

# Deploy with a custom message
mkdocs gh-deploy -m "docs: update for v2.1"
```

## Adding More Plugins

Install additional plugins inside the virtual environment:

```bash
pip install mkdocs-git-revision-date-localized-plugin
pip install mkdocs-awesome-pages-plugin
pip install mkdocs-macros-plugin
```

Or add them to your project's `requirements.txt` and rebuild the container.

## Use Cases

- **Project documentation** — rich developer docs alongside source code
- **API reference sites** — combine mkdocs with mkdocstrings for Python autodoc
- **Knowledge bases** — internal wikis with full-text search
- **Static documentation sites** — deploy to GitHub Pages, Netlify, Cloudflare Pages

**Integrates well with:**

- `pre-commit` — lint Markdown before commits
- `git-helpers` — Git workflow utilities
- `modern-cli-tools` — ripgrep for searching docs

## Troubleshooting

### `mkdocs: command not found`

The Python virtual environment may not be activated. Activate it manually:

```bash
source .venv/bin/activate
mkdocs --version
```

Or rebuild the container after ensuring the Python overlay is selected.

### Module not found after adding a plugin

Install the plugin inside the virtual environment and rebuild the container:

```bash
pip install mkdocs-<plugin-name>
```

### Port 8000 already in use

Change the port via `mkdocs serve --dev-addr 0.0.0.0:8001` or update
`devcontainer.json` `forwardPorts` and `portsAttributes` accordingly.

## References

- [MkDocs Documentation](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- [PyMdown Extensions](https://facelessuser.github.io/pymdown-extensions/)
- [MkDocs Plugins Catalog](https://github.com/mkdocs/catalog)

**Related Overlays:**

- `python` — required Python runtime
- `mkdocs` — legacy MkDocs 1.x overlay (conflicts with this overlay)
- `pre-commit` — lint Markdown before commits
- `pandoc` — convert Markdown to PDF
