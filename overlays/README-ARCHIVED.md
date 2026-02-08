# Overlay Metadata - ARCHIVED

**⚠️ This file is archived and no longer used.**

As of the per-overlay manifest refactoring, overlay metadata is now stored in individual `overlay.yml` files within each overlay directory.

## Migration

This central `index.yml` file (592 lines) has been split into:

- **46 individual overlay manifests** - `overlays/*/overlay.yml`
- **Registry files** - `overlays/.registry/base-images.yml` and `base-templates.yml`
- **Preset metadata** - Still in `overlays/index.yml` for now (contains only preset metadata, not full definitions)

## New Structure

Each overlay now has its own `overlay.yml` file:

```
overlays/
  nodejs/
    overlay.yml           # ← Overlay metadata
    devcontainer.patch.json
    setup.sh
    README.md
  postgres/
    overlay.yml           # ← Overlay metadata
    docker-compose.yml
    devcontainer.patch.json
    README.md
```

## Benefits

- ✅ **Cohesion**: Everything for an overlay in one place
- ✅ **No merge conflicts**: No central bottleneck file
- ✅ **Portability**: Overlays are self-contained
- ✅ **Easier maintenance**: Single edit point per overlay
- ✅ **Better discoverability**: `ls overlays/` shows what's available
- ✅ **Dynamic loading**: Automatic discovery of overlays

## Loader

The overlay loader (`tool/schema/overlay-loader.ts`) scans the `overlays/` directory and automatically builds an in-memory registry from all `overlay.yml` files.

## This File

This archived file is kept for reference but is no longer read by the system. To add or modify overlays, create or edit the `overlay.yml` file in the overlay's directory.

See:
- `.github/instructions/overlay-authoring.instructions.md` - Guide for creating overlays
- `.github/instructions/overlay-index.instructions.md` - Guide for overlay.yml manifests
- `scripts/migrate-to-manifests.ts` - Migration script used to create individual manifests
