# Meta Overlay

Internal testing overlay that activates **all available overlays** at once. Used to verify that the full overlay catalogue can be composed without errors.

> **Not shown in the interactive questionnaire.** Use it directly in a `superposition.yml` or test script.

## Purpose

The `all` overlay exists to make CI/integration testing straightforward: selecting it expands to every non-preset, non-hidden overlay in the live registry, exercising the full composition pipeline in one pass.

```yaml
# superposition.yml
stack: compose
containerName: meta-test
overlays:
    - all
outputPath: .devcontainer
```

## How expansion works

There is no `requires` list in `overlays/all/overlay.yml`. Instead, the dependency resolver in
`resolveDependencies()` detects the special `all` overlay ID and replaces it with the full live
overlay registry (excluding hidden and preset overlays) at resolution time. This means:

- New overlays are automatically included the moment they are added to the catalogue — no manual
  update to this file is needed.
- The expansion is driven by the live registry, not a hard-coded list.

## Conflicts

Some overlays expanded from `all` are mutually exclusive at runtime:

| Conflict                           | Details                                                 |
| ---------------------------------- | ------------------------------------------------------- |
| `docker-in-docker` ↔ `docker-sock` | Two different Docker access strategies — cannot coexist |

The composer will emit warnings for these conflicts. They are expected and do not block the build. The intent is to test patch composition, not to produce a runnable container.

## References

- [Overlay authoring guide](../../docs/creating-overlays.md)
- [All overlays](../../docs/overlays.md)
