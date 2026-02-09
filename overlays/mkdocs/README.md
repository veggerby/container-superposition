# MkDocs Overlay

Material for MkDocs - professional documentation generator.

## Features

- **MkDocs** with Material theme (via official devcontainers-extra feature)
- **Common MkDocs plugins:**
    - mkdocs-material
    - mkdocs-minify-plugin
    - mkdocs-redirects
    - pymdown-extensions
- **Python dependency:** Automatically includes Python overlay (required)
- **VS Code Extensions:**
    - Markdown All in One
    - Markdown Lint
    - Markdown Mermaid
- **Port forwarding:** 8000 (MkDocs dev server, auto-opens in browser)

## Dependencies

This overlay requires the **Python** overlay, which is automatically selected through the dependency model.

## Customizing MkDocs Plugins

To add more MkDocs plugins, you can install them via pip in your project's container:

```bash
# In devcontainer terminal
pip install mkdocs-git-revision-date-localized-plugin
pip install mkdocs-awesome-pages-plugin
pip install mkdocs-macros-plugin
```

Or add them to your project's `requirements.txt`:

```plaintext
mkdocs-git-revision-date-localized-plugin>=1.2.0
mkdocs-awesome-pages-plugin>=2.9.0
mkdocs-macros-plugin>=1.0.0
```

**Rebuild container** after editing to install new plugins.

## Quick Start

### New Documentation Site

```bash
# Create new MkDocs project
mkdocs new .

# Start development server
mkdocs serve
# Opens at http://localhost:8000
```

### Existing Site

If you already have `mkdocs.yml`:

```bash
# Start development server
mkdocs serve

# Build static site
mkdocs build
```

## MkDocs Configuration

### Basic mkdocs.yml

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
    - pymdownx.highlight
    - pymdownx.superfences
    - pymdownx.tabbed
    - admonition
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

## Project Structure

```
my-docs/
├── .devcontainer/
│   └── devcontainer.json
├── mkdocs.yml          # Configuration
├── docs/               # Markdown files
│   ├── index.md
│   ├── about.md
│   └── images/
├── requirements.txt    # Optional: additional dependencies
└── site/               # Built site (git-ignored)
```

## Additional Dependencies

If you need extra Python packages for MkDocs plugins, you have two options:

### Option 1: Edit requirements-overlay.txt (Recommended)

Edit `.devcontainer/requirements-overlay.txt`:

```
mkdocs>=1.5.0
mkdocs-material>=9.0.0
mkdocs-git-revision-date-localized-plugin>=1.2.0
mkdocs-awesome-pages-plugin>=2.9.0
mkdocs-macros-plugin>=1.0.0
```

Rebuild the container to install.

### Option 2: Project requirements.txt

Create `requirements.txt` in your project root:

```
mkdocs-git-revision-date-localized-plugin
mkdocs-awesome-pages-plugin
mkdocs-macros-plugin
```

This is useful if you want to version control plugin dependencies separately.

## Common Workflows

### Documentation as Code

```yaml
# mkdocs.yml
plugins:
    - search
    - git-revision-date-localized:
          type: date
    - macros # Use variables and macros
```

### API Documentation

```yaml
markdown_extensions:
    - pymdownx.highlight:
          linenums: true
    - pymdownx.superfences:
          custom_fences:
              - name: mermaid
                class: mermaid
                format: !!python/name:pymdownx.superfences.fence_code_format
```

### Multi-language Docs

```yaml
plugins:
    - search:
          lang:
              - en
              - es
    - i18n:
          default_language: en
          languages:
              en: English
              es: Español
```

## Building and Deploying

### Build Static Site

```bash
mkdocs build
# Output in site/ directory
```

### Deploy to GitHub Pages

```bash
mkdocs gh-deploy
# Builds and pushes to gh-pages branch
```

### CI/CD Example (.github/workflows/docs.yml)

```yaml
name: Deploy Docs
on:
    push:
        branches: [main]

jobs:
    deploy:
        runs-on: ubuntu-latest
        steps:
            - uses: actions/checkout@v4
            - uses: actions/setup-python@v5
              with:
                  python-version: 3.12
            - run: pip install mkdocs mkdocs-material
            - run: mkdocs gh-deploy --force
```

## Material Theme Features

### Navigation

```yaml
theme:
    features:
        - navigation.instant # Instant loading
        - navigation.sections # Group pages
        - navigation.tabs # Top-level tabs
        - toc.integrate # Integrated ToC
```

### Search

```yaml
theme:
    features:
        - search.suggest
        - search.highlight
```

### Code Blocks

```yaml
markdown_extensions:
    - pymdownx.highlight:
          anchor_linenums: true
    - pymdownx.inlinehilite
    - pymdownx.snippets
    - pymdownx.superfences
```

## Best Practices

1. **Keep docs close to code** - Documentation in the same repo
2. **Use includes** - Reuse content with `--8<--` includes
3. **Add diagrams** - Use Mermaid for architecture diagrams
4. **Version docs** - Use mike for multiple versions
5. **Add search** - Always enable search plugin

## Troubleshooting

### Module not found after adding plugin

Rebuild the container:

- **VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### MkDocs command not found

Setup script may have failed. Run manually:

```bash
pip install --user mkdocs mkdocs-material
```

### Port 8000 already in use

Change the port in mkdocs.yml:

```yaml
dev_addr: '0.0.0.0:8001'
```

And update devcontainer.json forwardPorts.

## Related Overlays

- **python** - For docs with custom Python scripts
- **pre-commit** - Lint markdown before commits
- **modern CLI tools** - ripgrep for searching docs

## Resources

- [MkDocs Documentation](https://www.mkdocs.org/)
- [Material for MkDocs](https://squidfunk.github.io/mkdocs-material/)
- [PyMdown Extensions](https://facelessuser.github.io/pymdown-extensions/)
