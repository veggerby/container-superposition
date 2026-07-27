# Versioned Private Catalogs

Versioned private catalogs let your platform team publish internal overlays and presets without forking `container-superposition`.

Use them when you want to:

- share organization-specific stacks across many repositories
- pin an exact catalog version for reproducible local and CI runs
- mix built-in overlays with private overlays or presets in one `superposition.yml`

## Before you start

- Commit `superposition.yml` as your shared source of truth.
- Treat external catalogs as trusted code input. They can add files, patches, and scripts to generated output.
- Keep credentials out of `superposition.yml`. Use SSH keys, Git credential helpers, CI secrets, or other ambient auth instead.

## Add a catalog to `superposition.yml`

Add a top-level `catalogs:` array. Each catalog needs:

- `id` — your label for the catalog
- `namespace` — the prefix used in overlay and preset IDs
- `source` — where the catalog comes from

### Git catalog

Use `git` when your catalog lives in a Git repository.

```yaml
stack: compose
catalogs:
    - id: acme-platform
      namespace: acme
      source:
          type: git
          url: ssh://git.example.com/platform/superposition-catalog.git
          ref: v1.4.2
          commit: 9f4c2d1
          subpath: catalog

overlays:
    - nodejs
    - acme/web-api
preset: acme/starter
```

Rules:

- `commit` is required.
- `ref` is optional metadata, but floating refs such as `main`, `master`, `latest`, `head`, and `trunk` are rejected.
- If the catalog is not at the repo root, use `subpath`.

### Archive catalog

Use `archive` when your catalog is published as a pinned tarball.

```yaml
catalogs:
    - id: acme-platform
      namespace: acme
      source:
          type: archive
          url: https://artifacts.example.com/superposition/acme-platform-1.4.2.tgz
          checksum: sha256:0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef
          subpath: catalog
```

Rules:

- `checksum` is required and must be `sha256:<64 hex>`.
- In normal use, archive URLs should be `https://`.
- If the extracted archive contains the catalog below its top level, use `subpath`.

### Path catalog

Use `path` for repo-local catalog development or when your repository already carries the catalog source.

```yaml
catalogs:
    - id: acme-platform
      namespace: acme
      source:
          type: path
          path: catalogs/acme
```

Rules:

- The path must be repo-relative.
- Absolute paths and paths outside the repository are rejected.
- `path` is best for local authoring and checked-in repo content, not for cross-repo remote distribution.

## Use overlays and presets from a catalog

Built-in IDs stay unqualified:

```yaml
overlays:
    - nodejs
    - postgres
```

External IDs must always be namespace-qualified:

```yaml
overlays:
    - nodejs
    - acme/web-api

preset: acme/starter
```

Do not write unqualified external IDs such as `web-api` or `starter`. Those fail validation.

After adding a catalog, discovery commands include its qualified IDs:

```bash
npx container-superposition list
npx container-superposition explain acme/web-api
npx container-superposition explain acme/starter
```

## Trust, pinning, and credentials

For shared remote catalogs:

- pin `git` catalogs to an exact commit
- pin `archive` catalogs with a checksum
- do not store usernames, passwords, or tokens in catalog URLs
- expect fetch or integrity failures to stop the command instead of falling back silently

Generated `.devcontainer/superposition.json` records the resolved catalog identities used for that write. This helps with replay and troubleshooting.

## Upgrade a catalog safely

1. Edit the catalog pin in `superposition.yml`.
2. If you want a write-free preview, run `plan` with the overlay IDs you expect to use.
3. Run `npx container-superposition regen`.
4. Run `npx container-superposition doctor --from-project`.

Example upgrade:

```yaml
catalogs:
    - id: acme-platform
      namespace: acme
      source:
          type: git
          url: ssh://git.example.com/platform/superposition-catalog.git
          ref: v1.5.0
          commit: a1b2c3d4
```

If the new catalog version removed or renamed an overlay or preset you still reference, the run fails clearly with an unknown qualified ID. Update the ID in `superposition.yml` or pin back to the previous catalog version.

## Common success checks

- `npx container-superposition list` shows your qualified overlay or preset IDs
- `npx container-superposition explain <namespace/id>` works
- `npx container-superposition regen` completes and rewrites `.devcontainer/superposition.json`
- `npx container-superposition doctor --from-project` reports no project-file errors

## See also

- [superposition.yml reference](superposition-yml.md)
- [Discovery and planning commands](discovery-commands.md)
- [Security considerations](security.md)
