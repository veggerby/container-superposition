# Container Superposition tool

This directory contains the TypeScript CLI and composition implementation for
Container Superposition. The published CLI creates standard, editable
`.devcontainer/` output from a shared project file and built-in overlays.

## User workflow

The team-owned input is `superposition.yml` (or `.superposition.yml`). Use a
flat `overlays:` list for explicit selections. A preset is optional shorthand
for a common starting point; it does not replace the project-file model.
`superposition.json` is a generated compatibility and audit receipt, not the
file to edit for normal team changes.

Use the safe sequence before writing output:

```bash
# Discover and inspect read-only catalog information.
npm run init -- list
npm run init -- explain postgres

# Preview an explicit selection. --verbose explains resolution; --diff reviews
# its effect against existing generated output.
npm run init -- plan --stack compose --overlays nodejs,postgres
npm run init -- plan --stack compose --overlays nodejs,postgres --verbose
npm run init -- plan --stack compose --overlays nodejs,postgres --diff
```

Then commit the shared intent and generate from it:

```yaml
# superposition.yml
stack: compose
overlays:
    - nodejs
    - postgres
```

```bash
npm run init -- init --no-interactive
npm run init -- regen
```

For a manifest-only repository, `npm run init -- migrate` creates the canonical
project file. `regen --from-manifest` remains a deprecated compatibility path.

## Maintainer map

- `commands/` owns command-specific workflows such as discovery, preview,
  migration, adoption, and diagnostics.
- `cli/` owns shared command orchestration and presentation composition.
- `questionnaire/` owns normalized selection and deterministic composition.
- `schema/` owns project-file types and schema generation.
- `ux/` owns reusable terminal presentation.
- `__tests__/` contains command and rendering regressions.

Keep command entries thin: command-specific logic belongs in `commands/`, and
shared behavior belongs in the owning shared module. Do not edit `dist/`;
compile it with `npm run build`.

## Developing

```bash
npm install
npm run init -- --help
npm run lint
npm test
```

Run `task validate` before handoff. When changing a user-visible command or
workflow, add or update focused tests and Behave coverage as required by
[`AGENTS.md`](../AGENTS.md). Overlay and schema changes also require their
corresponding generated outputs; see the repository instructions.

## Overlay authoring

Overlays live in `../overlays/<id>/`. Each needs `overlay.yml` and its declared
output fragments. Follow `AGENTS.md` for bidirectional conflicts, compose
network rules, category/schema registration, and regeneration requirements.
User-facing project configuration belongs in `superposition.yml`; maintainer
metadata such as `serviceOrder` belongs in `overlay.yml` and is not part of the
end-user authoring workflow.

See the [documentation index](../docs/README.md),
[`superposition.yml` reference](../docs/superposition-yml.md), and
[overlay authoring guide](../docs/creating-overlays.md).
