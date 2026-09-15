---
spec: '055-prerelease-publish-worthy-change-gate'
title: 'Prerelease Publish-Worthy Change Gate'
status: 'Draft'
review_gate: 'Security-sensitive release automation change; independent maintainer review required before merge.'
owner: 'delivery-interrogator'
created: '2026-09-15'
updated: '2026-09-15'
related_adrs: []
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/023-pr-prerelease-gate/spec.md'
    - 'docs/specs/028-publish-summaries-and-pr-comments/spec.md'
source_revision: '4dceff2'
---

# Prerelease Publish-Worthy Change Gate

## Problem

The current release automation allows pull request activity to publish npm packages on the shared prerelease path. That is too permissive for a trusted publishing workflow: unmerged pull request code can update the package channel that maintainers and users read as the next staged build.

Maintainers need a safer release model where the shared `prerelease` channel represents code that has already merged to `main`, while still preserving a way to test PR-specific package output before merge when explicitly supported.

## Why now

Prerelease packages are release artifacts, not ordinary CI by-products. Publishing them from arbitrary PR events creates a security and trust gap because reviewers and users can see a prerelease package before the repository has accepted the change. The automation should make `@prerelease` mean "merged to `main` and awaiting the next full `latest` release", not "latest PR workflow that happened to publish".

## Desired behavior

- Merges to `main` are the only path that can update the shared npm `prerelease` dist-tag.
- PR package testing is available only through an explicit manual dispatch. It publishes the exact version `{base}-pr.{number}.{run_id}` directly with the mutable per-PR npm dist-tag `pr-{number}`; it is never triggered automatically and never updates `latest` or the shared `prerelease` channel.
- Main-branch changes are publish-worthy when they change npm package payload or the inputs that build/package that payload: `package.json`, `package-lock.json`, `.npmignore`, `tsconfig.json`, `scripts/**`, non-test `tool/**`, `templates/**`, `features/**`, `overlays/**`, `docs/**/*.md`, `README.md`, or `LICENSE`. Test-only, changelog-only, workflow-only, and other repository-maintenance changes are not publish-worthy unless the same push also changes a listed path.
- Full releases continue to publish only through the existing release/tag path and continue to update `latest` as before.
- The prior ready-PR prerelease model in `docs/specs/023-pr-prerelease-gate/spec.md` is intentionally superseded for shared prerelease publishing.
- The shared-tag and OIDC constraints in `docs/specs/028-publish-summaries-and-pr-comments/spec.md` remain authoritative except for this spec's explicit manual-only `pr-{number}` path.

## Acceptance Criteria

- [ ] **AC-055-01: Shared prerelease only from main** — The shared npm `prerelease` dist-tag is published or updated only by automation running against code already merged to `main`; no `pull_request` event can update that tag.
- [ ] **AC-055-02: PR events cannot publish shared release channels** — PR-triggered workflows do not publish to `latest`, do not publish to the shared `prerelease` tag, and do not write PR comments or workflow summaries that imply a PR run has produced the staged prerelease.
- [ ] **AC-055-03: PR-scoped testing remains explicitly separate and manual** — A maintainer can manually dispatch a publish for a selected PR; it publishes `{base}-pr.{number}.{run_id}` directly under the mutable `pr-{number}` npm dist-tag, and its install guidance is visibly PR-scoped and cannot be mistaken for `@prerelease` or `@latest`. No PR event automatically invokes this path.
- [ ] **AC-055-04: Publish-worthy main changes are gated** — Main-branch prerelease automation publishes only for changes classified as publish-worthy by documented repository rules, and skips non-publish-worthy main changes without failing the workflow.
- [ ] **AC-055-05: OIDC trusted publishing posture is preserved** — The solution uses trusted publishing/OIDC for npm publication, does not add a long-lived npm token or fallback registry secret, does not use `pull_request_target` for code that can publish packages, and does not broaden PR workflow permissions to compensate for the new gate.
- [ ] **AC-055-06: Final release behavior is unchanged** — Existing full release publication from GitHub releases / semver tags continues to publish the final package and associated release outputs as before, including `latest` semantics.
- [ ] **AC-055-07: Workflow regression coverage exists** — Tests or static workflow validation prove that PR events cannot update `prerelease`, that main-branch eligible changes can update `prerelease`, that final release gates remain intact, and that disallowed security posture changes such as `pull_request_target` or long-lived npm secrets are absent.
- [ ] **AC-055-08: Maintainer documentation is updated** — `docs/publishing.md` explains the new model: PRs do not publish the shared prerelease, `main` publishes staged prereleases for publish-worthy changes, PR-scoped npm publishing is manual and uses exact-version plus `pr-{number}` guidance, and full releases remain the only `latest` path.
- [ ] **AC-055-09: Changelog records the release-automation change** — `CHANGELOG.md` includes an `Unreleased` entry describing the shift from PR-published prereleases to main-branch staged prereleases.
- [ ] **AC-055-10: Obsolete prerelease guidance is removed or clearly superseded** — Workflow comments, tests, and docs no longer present ready-for-review PRs or the `publish-prerelease` label as a way to publish the shared prerelease channel.

## Non-goals

- Changing package runtime behavior or CLI commands.
- Changing the final release versioning scheme or `latest` publication contract.
- Cleaning up old npm prerelease versions or dist-tags that were published by earlier automation.
- Introducing a broad manual publishing system or emergency release process.
- Replacing GitHub Actions as the release automation platform.
- Designing a new non-OIDC npm credential path.
- Reopening the old model where ready-for-review PRs automatically update the shared prerelease channel.

## Implementation envelope

Owned areas for the eventual delivery are limited to release automation and its supporting evidence:

- `.github/workflows/publish.yml` and release-related GitHub Actions behavior.
- Static or automated tests that inspect release workflow shape and gate semantics.
- `docs/publishing.md` and any directly conflicting release-maintainer guidance.
- `CHANGELOG.md` under `Unreleased`.
- Spec/index synchronization under `docs/specs/`.

The change should not modify CLI runtime modules, overlay metadata, schema generation, generated devcontainer output, or `dist/` as part of this release-automation scope.

## Resolved Decisions

- **OPEN-055-01 resolved — manual PR-scoped npm publish.** A required PR-number input on `workflow_dispatch` selects the PR. The workflow resolves and checks out that PR's immutable head commit, retains the established exact-version shape `{base}-pr.{number}.{run_id}`, and publishes it in the primary OIDC-backed `npm publish` command with `--tag pr-{number}`. The mutable tag and all summary/install wording remain PR-specific. There is no automatic PR publish trigger, no follow-up `npm dist-tag add`, and no update to `prerelease` or `latest`. This explicitly narrows and supersedes spec 028's no-`pr-{number}` rule for this manual path only; spec 028's shared-tag and OIDC constraints remain in force elsewhere.
- **OPEN-055-02 resolved — package payload/build-input path rule.** The publish-worthy set is the path list in Desired behavior. It is derived from `package.json#files`, npm's always-included package metadata/readme/license files, `.npmignore`, the TypeScript build graph in `tsconfig.json`, and the repository's existing product-validation path filters. Negative test-path filters keep test-only changes from publishing. A native GitHub `push` path filter is preferred over labels or changelog heuristics because classification is deterministic from the merged diff, requires no new action/dependency, and naturally skips ineligible pushes without failure.

## Evidence / References

- User request: prerelease should only publish when merged into `main`; shared prerelease should be the staging release after merge and before full/latest release.
- User resolution for OPEN-055-01: add only a manual PR-scoped npm publish, use a mutable per-PR npm dist-tag such as `pr-741`, retain an exact `0.1.13-pr.<number>.<run_id>`-shaped version, and never invoke it automatically.
- `docs/specs/023-pr-prerelease-gate/spec.md` documents the now-undesired ready-PR prerelease model.
- `docs/specs/028-publish-summaries-and-pr-comments/spec.md` documents shared `prerelease` tag behavior and OIDC-only trusted publishing constraints.
- `.github/workflows/publish.yml` at source revision `4dceff2` currently contains PR-triggered `publish-prerelease` behavior.
- `tool/__tests__/publish-workflow.test.ts` at source revision `4dceff2` currently asserts the older PR prerelease gate and must be revised with the workflow.
- `package.json#files`, `.npmignore`, and `tsconfig.json` at source revision `4dceff2` define the package payload and compiled inputs used for the publish-worthy path rule; `.github/workflows/build-devcontainers.yml` and `validate-overlays.yml` provide repository precedent for main-branch path filtering.
- `docs/reference-coding-agent-framework.md` is absent from source revision `4dceff2`; architecture fit therefore uses the available `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, and canonical specs.

## Risks / Constraints

- Publishing from PR code has security implications because package publication is an external side effect.
- OIDC trusted publishing compatibility constrains dist-tag mutation and credential choices.
- The meaning of `@prerelease` must be unambiguous for maintainers and users: newest merged-to-main staged build, not newest PR build.
- Skipped non-publish-worthy changes should be observable without being noisy or red by default.
- Independent review is expected because this changes release automation and package-publication security boundaries.

## Stop / Resume State

- Canonical target resolved to `docs/specs/055-prerelease-publish-worthy-change-gate/spec.md`.
- OPEN-055-01 was resolved by the user; OPEN-055-02 was resolved from repository package/build evidence during planning.
- Planning is complete in `docs/specs/055-prerelease-publish-worthy-change-gate/plan.md` at source revision `4dceff2`.
- Stop state: `planning -> implementation`; implementation authority is sufficient, with `INDEPENDENT` review required before merge.
