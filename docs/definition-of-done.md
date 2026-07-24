# Definition of Done

## Required checks

### Core validation

- Run `task validate` before handoff or considering a change complete; this mandatory flow runs `lint:fix` before `lint` and includes `npm test`.
- Use direct npm commands only as the underlying source-of-truth implementation; CI remains npm-based.
- Run targeted tests for changed areas at minimum.
- Run `npm run build` when validating compiled CLI behavior or before publish/release work.

### Workflow gates

- Feature work starts from a reviewed spec under `docs/specs/` before implementation begins.
- User-visible changes are recorded under `CHANGELOG.md` in `[Unreleased]`.
- If overlays changed, run `task validate:generated` or at minimum `npm run docs:generate` and commit the updated generated overlay reference docs.
- If overlays or project-config schema types changed, run `task validate:generated` or at minimum `npm run schema:generate` and commit updated schema outputs.
- If user-visible behavior changed in overlays, generation, generated output, or command/workflow flows such as `init`, `regen`, `plan`, `explain`, `list`, `doctor`, `adopt`, or `migrate`, add or update relevant Behave scenarios and run `task test:bdd` during iteration before handoff.
- If no Behave scenario changed for a user-visible behavior change in those areas, document why existing BDD coverage is still sufficient.
- If user-visible or tooling changes affect generated output, run `task validate:generated` or at minimum `npm run init -- regen` from project root.
- Before merge, run `task validate:generated` when generated-output triggers apply, or at minimum `npm run init -- doctor`; no `Reproducibility` errors are allowed.

---

## Code quality

- No lint errors or type errors.
- No debug code, commented-out dead code, or temporary scaffolding left behind.
- Changes follow documented ownership boundaries in `docs/foundation.md`, ADRs, and project instructions.
- ESM imports use `.js` extensions.
- Generated artifacts (`dist/`, generated docs, generated schema) are updated via source changes and regeneration, not manual edits.

## Tests

- New pure logic gets focused unit coverage.
- Command or workflow changes preserve command-level regression coverage where appropriate.
- User-visible command/workflow behavior changes in covered flows also preserve or extend BDD coverage, not just unit-level regression tests.
- Edge cases and failure paths are covered where relevant.
- No unjustified skipped tests are introduced.

## Documentation

- Documentation is updated when behavior, setup, workflows, architecture boundaries, or contributor expectations change.
- Markdown is the default documentation format.
- Mermaid is preferred for diagrams added to Markdown documentation.
- README, docs index, and workflow artifacts stay synchronized when new canonical docs are introduced.

## Architecture and workflow artifacts

- No ADR or foundation rules are silently violated.
- Cross-cutting architectural decisions get a new or updated ADR.
- Spec status and spec index stay synchronized.
- QA-owned workflow markers remain intact until QA resolves them.

## Review expectations by change type

### Overlay changes

- Follow overlay manifest rules from `AGENTS.md`.
- Keep conflict declarations bidirectional.
- Ensure compose overlays keep inline `devnet` logical network declarations and never rely on `external: true`; generated output should own the final project-specific `networks.devnet.name`.
- Regenerate overlay docs and schema outputs when required.

### Command or tooling changes

- Preserve source-vs-compiled path resolution behavior where needed.
- Validate both focused tests and broader CLI regressions when behavior spans multiple commands.
- Keep public command contracts, workflow docs, and guidance aligned, including the mandatory `task validate` / `task validate:generated` contributor flow and the focused `task test:bdd` iteration path.
- Treat Behave coverage as part of Definition of Done for user-visible workflow changes, not an optional follow-up.

### Docs and workflow changes

- Preserve valuable existing content instead of blindly overwriting it.
- Call out any manual migration or normalization that remains risky or incomplete.

---

## Human review checklist

A change is not done until reviewers can confirm:

- the right validation commands were run
- the relevant workflow docs were updated
- Behave coverage was added/updated for user-visible workflow changes, or an explicit justification was given for why existing BDD coverage already covers the change
- no generated file was hand-edited in violation of repo rules
- architecture authority (`docs/foundation.md` plus ADRs) still matches the implementation
