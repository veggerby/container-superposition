# Meta Overlay

Internal testing overlay that activates **all available overlays** at once. Used to verify that the full overlay catalogue can be composed without errors.

> **Not shown in the interactive questionnaire.** Use it directly in a `superposition.yml` or test script.

## Purpose

The `meta` overlay exists to make CI/integration testing straightforward: adding a single overlay ID pulls in every other overlay via `requires`, exercising the full composition pipeline in one pass.

```yaml
# superposition.yml
stack: compose
containerName: meta-test
overlays:
    - all
outputPath: .devcontainer
```

## Conflicts

Some overlays in `meta`'s `requires` list are mutually exclusive at runtime:

| Conflict                           | Details                                                 |
| ---------------------------------- | ------------------------------------------------------- |
| `docker-in-docker` ↔ `docker-sock` | Two different Docker access strategies — cannot coexist |

The composer will emit warnings for these conflicts. They are expected and do not block the build. The intent is to test patch composition, not to produce a runnable container.

## Adding New Overlays

No action needed. When a new overlay is added to the catalogue the `meta` overlay picks it up automatically at build time — the expansion is driven by the live overlay registry, not a list in this file.

## References

- [Overlay authoring guide](../../docs/creating-overlays.md)
- [All overlays](../../docs/overlays.md)
