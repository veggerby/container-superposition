# Registry Files

This directory contains special metadata files that don't fit into individual overlay manifests.

## Files

- **base-images.yml** - Available base container images (Debian, Alpine, Ubuntu, etc.)
- **base-templates.yml** - Base devcontainer templates (plain, compose)

These files are loaded during initialization to provide choices for base images and templates.

## Note

Preset definitions are stored in `overlays/presets/*.yml`.
