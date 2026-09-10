# Plan

## Scope

- Spec: `docs/specs/056-vscode-extensions-field/spec.md`

## Ordered Steps

1. Add `vscodeExtensions` to shared, local, and global-default config types, parsing, persistence, and answer conversion.
2. Apply `vscodeExtensions` during composition by merging into `devcontainer.json -> customizations.vscode.extensions` before editor-profile filtering.
3. Extend generated schema definitions for project, local, and global-default config.
4. Update docs, spec index, and changelog.
5. Add focused unit and Behave coverage for shared/local/global surfaces and invalid values.
6. Run targeted tests, schema generation, BDD coverage, doctor/regen checks, and final validation gate as available.

## Affected Areas

- `tool/schema/types.ts` - answer and project-config field types.
- `tool/schema/project-config.ts` - parsing, local/global support, persistence, and answer mapping.
- `tool/questionnaire/composer.ts` - generated devcontainer merge behavior.
- `scripts/generate-schema.ts` and generated schema JSON files - schema support.
- `tool/__tests__/*` and `tests/behave/features/*` - regression and acceptance coverage.
- `docs/superposition-yml.md`, `docs/specs/README.md`, `CHANGELOG.md` - user-visible documentation and delivery artefacts.

## Validation Surface and Strategy

- Build/type/lint checks: `npm run lint` and final `task validate`.
- Unit/integration checks: focused Vitest files for project/local/global config and composition.
- BDD checks: focused `npm run test:bdd -- tests/behave/features/core-generation.feature` scenario covering shared plus local config generated output.
- Generated-output/schema checks: `npm run schema:generate`, `npm run init -- regen`, and `npm run init -- doctor` because project schema and generated output behavior change.
- Acceptance-criteria evidence plan: map AC1-AC5 to focused unit tests, Behave scenario, generated schema diffs, docs/changelog updates, and CLI checks.
- Review gate: `SELF_CHECK`, because the change is additive, narrow, and covered by local automated checks.
- Evidence provenance: source revision and command outputs captured in final response.
- Skipped or deferred checks: none planned; if `task validate:generated` is unavailable or too broad, run required minimum generated checks individually and record residual risk.

## Rollback / Containment

- Revert the spec folder, schema/type/parser/composer edits, tests, generated schema files, docs, and changelog entry. Existing raw customization-patch behavior remains unchanged.

## Open Questions

- None.

## Risks / Dependencies

- Global defaults are init-only. `initDefaults.vscodeExtensions` should seed fresh init project config only and must not make home-directory defaults replay authority.
- Local config remains local-only. Generated output may include local extensions, but shared `superposition.yml` must not be rewritten with local-only IDs.

## Implementation Notes

- Field name chosen: `vscodeExtensions`.
- Apply after raw customizations and before editor profile filtering so the first-class field remains additive while non-VS Code editor profiles still remove VS Code customizations.
