# Feature Specification: Publish Workflow Summaries and PR Comment Parity

**Spec ID**: `028-publish-summaries-and-pr-comments`
**Taxonomy**: `INFRA-BUILD`
**Created**: 2026-06-08
**Author**: PM Agent
**Status**: Implemented
**Input**: On publish, show install / npx commands in workflow output itself, not only prerelease PR comment. Keep PR comment behavior when a PR exists.

## Problem Statement

Current publish automation exposes runnable npm / npx commands only in prerelease PR comments. Final release publishes do not surface the same commands in workflow-rendered output, so maintainers must infer what to run or inspect package docs.

Maintainers want publish runs themselves to render exact install / `npx` commands, and they also want PR comments when there is an associated PR.

## Goals

- Render exact install and `npx` usage commands in GitHub Actions workflow output for successful final releases
- Render same kind of command summary in successful prerelease runs
- Preserve prerelease PR comment behavior for PR-triggered prerelease publishes
- Add final release PR comment behavior when a published release can be associated with a PR
- Keep publish versioning, npm tags, and release trigger semantics unchanged
- Add workflow regression coverage for summary/comment steps
- Add changelog entry under `Unreleased`

## Non-Goals

- Changing release or prerelease version formats
- Changing npm dist-tag behavior
- Commenting on issues not tied to PRs
- Adding manual publish workflows
- Changing package runtime behavior

## Proposed Behavior

### Workflow run summaries

After successful npm publish:

- `publish` writes a Markdown summary to `$GITHUB_STEP_SUMMARY`
- `publish-prerelease` writes a Markdown summary to `$GITHUB_STEP_SUMMARY`

Summary content must include:

- published version
- `npm install` command using exact version
- `npx container-superposition@<version> regen` command

Prerelease summary may also include PR dist-tag guidance if useful, but exact-version commands are required.

### PR comments

#### Prerelease job

Existing prerelease PR comment remains:

- heading remains `## 📦 Prerelease published to npm`
- existing bot comment is updated rather than duplicated
- comment continues to include install and `npx ... regen` commands

#### Final release job

After successful final release publish:

- workflow attempts to find PR associated with released commit/tag
- if associated PR found, create or update bot comment on that PR
- if no associated PR found, skip comment silently

Release PR comment should:

- use distinct heading, e.g. `## 🚀 Release published to npm`
- include published exact version
- include exact-version `npm install` and `npx ... regen` commands
- update existing matching bot comment rather than duplicate it

### Permissions

`publish` job may add comment-capable permission only as needed for release PR comments. Other permissions remain unchanged.

### Documentation

Update `docs/publishing.md` to state:

- successful publish runs render install / `npx` commands in workflow summary
- prerelease PRs still receive PR comments
- final release publishes comment on associated PR when one is found

## Technical Design

### Ownership

- `.github/workflows/publish.yml` owns publish summaries and PR comments
- `tool/__tests__/publish-workflow.test.ts` owns static workflow regression checks
- `docs/publishing.md` owns maintainer-facing explanation
- `CHANGELOG.md` owns user-visible note

### Suggested workflow slices

1. Add release summary step after successful final publish
2. Add prerelease summary step after successful prerelease publish
3. Add release PR comment step after final publish, using associated-PR lookup
4. Extend static tests for new summary/comment contracts
5. Update docs and changelog

## Acceptance Criteria

1. [x] `publish` writes rendered workflow summary containing exact-version `npm install` and `npx container-superposition@<version> regen`
2. [x] `publish-prerelease` writes rendered workflow summary containing exact-version `npm install` and `npx container-superposition@<version> regen`
3. [x] existing prerelease PR comment behavior remains in `publish-prerelease`
4. [x] `publish` attempts PR comment only after successful final publish
5. [x] final release PR comment is skipped without failure when no associated PR exists
6. [x] final release PR comment updates existing matching bot comment rather than duplicating it
7. [x] workflow regression tests cover summary steps and release comment step placement
8. [x] `docs/publishing.md` documents workflow summary + PR comment behavior
9. [x] `CHANGELOG.md` includes `Unreleased` entry for publish summary / PR comment behavior

## Architecture Decision Impact

Aligned with current repository architecture. Change stays inside release automation, docs, changelog, and workflow tests. No ADR needed.

## Routing Decision

PM → Developer

## Implementation Notes

Implemented 2026-06-08. Updated `.github/workflows/publish.yml` so both `publish` and `publish-prerelease` write runnable install / `npx ... regen` commands to `$GITHUB_STEP_SUMMARY`. Added final-release associated-PR comment behavior in `publish` using release-tag commit → associated PR lookup, while preserving prerelease PR comments. Extended `tool/__tests__/publish-workflow.test.ts` to assert summary/comment step placement and updated `docs/publishing.md` plus `CHANGELOG.md`.

Validation: `npm run lint`, `npm test -- tool/__tests__/publish-workflow.test.ts`.
