# Container Superposition Dev Container Feature

Install the real [`cs`](https://www.npmjs.com/package/container-superposition) command in an existing devcontainer without converting the repository to Container Superposition ownership.

```json
{
    "features": {
        "ghcr.io/veggerby/container-superposition/container-superposition:1": {
            "version": "latest"
        }
    }
}
```

`version` accepts an exact npm semantic version (for example, `0.1.13`) or a simple npm dist-tag (for example, `latest` or `prerelease`). The Feature depends on the official Node Feature, installs `container-superposition@version` globally, and verifies `cs --version`.

## Deliberate lifecycle boundary

Feature installation only installs and verifies `cs`. It does **not** inspect the workspace, select overlays, run `cs regen`, run `cs amend refresh`, rebuild, reopen, or launch a devcontainer.

After adding or changing the Feature, rebuild the devcontainer once to make `cs` available. Then choose one ownership route:

- **Adopting repository:** record shared overlay intent in `superposition.yml` or `.superposition.yml`, run `cs regen`, then rebuild the devcontainer for structural changes.
- **Non-adopting repository:** keep the team-owned base unchanged. Create and edit the personal `.container-superposition/amendment.yml`, run `cs amend refresh`, then rebuild or launch the printed personal alternate config.

The Feature does not make every catalog overlay compatible with every existing devcontainer. Overlay selection remains opt-in and compatibility diagnostics must be resolved before a generated configuration is used.

See [Local Devcontainer Amendment](../../docs/local-devcontainer-amendment.md) and [Workflows](../../docs/workflows.md) for the ownership and lifecycle details.
