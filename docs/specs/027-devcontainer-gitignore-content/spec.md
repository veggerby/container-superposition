# Feature Specification: devcontainerGitignore — Drop `!.gitignore` from Generated Content

**Spec ID**: `027-devcontainer-gitignore-content`
**Taxonomy**: `CLI-UX`
**Created**: 2026-06-04
**Author**: PM Agent
**Status**: Final
**Input**: Product request — when `devcontainerGitignore: true`, the generated
`outputPath/.gitignore` contains `*` and `!.gitignore`. The `!.gitignore` line causes
`.devcontainer/.gitignore` itself to be committed, which adds no value because the file is
entirely generated. Remove the `!.gitignore` line so only `*` is written.

---

## Problem Statement

`ensureOutputGitignore()` in `tool/questionnaire/composer.ts` currently writes:

```
*
!.gitignore
```

The intent was to let the `.gitignore` itself be committed so other users get the ignore rule
automatically. However, `.devcontainer/.gitignore` is a generated artifact — its content is
always determined by the `devcontainerGitignore` flag and has no project-specific information.
Committing it adds repository noise without benefit. The entire `.devcontainer/` directory
should be regenerated from `superposition.yml`, so tracking any file inside it is
counter-productive.

---

## Scope

### In scope

- Change generated `outputPath/.gitignore` content from `*\n!.gitignore\n` to `*\n`.
- Update the equality guard in `ensureOutputGitignore` to match the new content.
- Update test assertions in:
    - `tool/__tests__/composition.test.ts` (two assertions)
    - `tool/__tests__/local-config.test.ts` (one assertion)
- Update documentation references:
    - `docs/superposition-yml.md` — remove `!.gitignore` from the generated content example.
    - `docs/team-workflow.md` — remove `!.gitignore` from the generated content example.
    - `CHANGELOG.md` — add entry under `Unreleased → Changed`.

### Out of scope

- Any change to `mergeGitignoreFiles()` (project-root `.gitignore` behaviour).
- Any change to `.idea/.gitignore` generation.
- Any new config option or flag.
- Migration tooling for existing projects (the file is generated; `regen` overwrites it).

---

## Behavior Change

### Before

`outputPath/.gitignore` (e.g. `.devcontainer/.gitignore`) contains:

```
*
!.gitignore
```

### After

`outputPath/.gitignore` contains:

```
*
```

The file still ignores all generated artifacts inside `outputPath/`. Only the `!.gitignore`
self-exemption line is removed.

---

## Acceptance Criteria

| #     | Criterion                                                                                                            |
| ----- | -------------------------------------------------------------------------------------------------------------------- |
| AC-1  | `ensureOutputGitignore()` writes exactly `*\n` (no `!.gitignore` line).                                              |
| AC-2  | The idempotency guard compares against `*\n`; a pre-existing file with `*\n` is not rewritten.                       |
| AC-3  | A pre-existing file containing `*\n!.gitignore\n` IS rewritten to `*\n` (old content does not match guard).          |
| AC-4  | Existing test `'writes output .gitignore when devcontainerGitignore is enabled'` asserts `'*\n'`.                    |
| AC-5  | Existing test `'keeps template output .gitignore when devcontainerGitignore is disabled'` asserts `not.toBe('*\n')`. |
| AC-6  | `local-config.test.ts` test asserting generated gitignore content asserts `'*\n'`.                                   |
| AC-7  | `docs/superposition-yml.md` no longer shows `!.gitignore` in the generated content example.                          |
| AC-8  | `docs/team-workflow.md` no longer shows `!.gitignore` in the generated content example.                              |
| AC-9  | `CHANGELOG.md` records the change under `Unreleased → Changed`.                                                      |
| AC-10 | `npm run lint` and `npm test` pass.                                                                                  |

---

## What Must Remain Unchanged

- `devcontainerGitignore: false` behaviour — no `.gitignore` written inside `outputPath/`.
- `mergeGitignoreFiles()` — project-root `.gitignore` is unaffected.
- `.idea/.gitignore` generation — unaffected.
- The `fileRegistry.addFile('.gitignore')` call — still needed so `cleanupStaleFiles` tracks the file.

---

## Architecture Decision Impact

Aligned with existing authority. No ADR required. No new config schema fields.

---

## Routing

**PM → Developer** — product, UX, and technical path are all clear. No architecture or UX
handoff required.

---

## Implementation Notes

Changed `ensureOutputGitignore()` in `tool/questionnaire/composer.ts`: `content` constant from `'*\n!.gitignore\n'` → `'*\n'`. Idempotency guard unchanged structurally — still compares file content to `content`, so stale files with old value are rewritten (AC-3).

Updated test assertions:

- `tool/__tests__/composition.test.ts` — two assertions updated (AC-4, AC-5)
- `tool/__tests__/local-config.test.ts` — one assertion updated (AC-6)

Updated docs:

- `docs/superposition-yml.md` — removed `!.gitignore` from generated content example and adjusted description text (AC-7)
- `docs/team-workflow.md` — removed `!.gitignore` from generated content example (AC-8)

Added `CHANGELOG.md` entry under `Unreleased → Changed` (AC-9).

Validation: `npm run lint` ✓ · `npm test` 634 passed (AC-10).
