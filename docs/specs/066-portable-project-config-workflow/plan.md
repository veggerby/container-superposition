# Portable Project Config Workflow Delivery

## Approach

1. Keep spec 057's self-contained prompt and skill unchanged as canonical sources. Add only Claude Code marketplace/plugin manifests pointing at those exact paths.
2. Document Codex's built-in GitHub skill installer and safe local-copy installation. No custom installer, dependency, copied instruction body, or new CLI command is needed.
3. Link the installation guide from README, docs index, and Pi inventory. Fold this extension into the existing Unreleased Added entry.
4. Test identity/path contracts, narrow export lists, default Claude component isolation, and standalone skill copying. Run mandatory validation and doctor.

## Review and scope

- Requirements self-checked before implementation and committed as `4ed0c76`.
- No new ADR: packaging existing instructions does not change CLI, generation, or authority boundaries.
- BDD justification: no command, generation, overlay, or authored-file behavior changes. Existing workflow coverage remains applicable; new Vitest tests cover distribution contracts, which Behave's CLI generation steps do not exercise.
- No generated-output trigger: no overlays, schemas, templates, or generated artifacts changed. Build and regeneration are not needed for these Git-distributed metadata/instruction assets.
- Rollback: remove the two Claude manifests and new guide/test, restore documentation links. Existing Pi manifest and instruction sources are unchanged.

## Validation

- `npx vitest run tool/__tests__/agent-packaging.test.ts`: PASS, 4 tests.
- `task validate`: PASS, formatting/type checks and 822 tests passed. The existing 20 opt-in integration tests are skipped unless `INTEGRATION=true`; no skips were added.
- `npm run init -- doctor`: PASS, Healthy, 21 healthy checks, no blocking findings or reproducibility errors; no files changed.
- `git diff --check`: PASS.
- Claude Code and Codex executables are unavailable. Native marketplace installation, Claude manifest validation, and interactive invocation were not run. Static tests check documented contracts and standalone source portability, not actual agent execution.

## Acceptance mapping

- AC-066-01: Claude manifests expose exactly one plugin, one prompt, and one skill; tested export lists and implicit default component locations.
- AC-066-02: guide includes exact GitHub skill directory and local `.agents/skills` destinations; standalone copy is tested.
- AC-066-03: manifests reference identical existing Pi paths; no instruction source changes or copies.
- AC-066-04: existing self-contained safety instructions are preserved byte-for-byte; no harness-specific tool dependency is introduced.
- AC-066-05: guide, README, docs index, Pi inventory, consolidated changelog, and packaging tests are delivered.
