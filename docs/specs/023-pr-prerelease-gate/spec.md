# Feature Specification: PR Prerelease Deployment Gate

**Spec ID**: `023-pr-prerelease-gate`
**Taxonomy**: `INFRA-BUILD`
**Created**: 2026-06-03
**Author**: PM Agent
**Status**: Final
**Input**: Add a capability to only run pre-release deployments on PRs if there is a label added to control this on the PR OR if the PR is not in Draft (Ready for Review), to avoid over-publishing pre-releases.

## Problem Statement

Current PR workflow publishes npm prerelease packages for every PR update. Draft PRs commonly receive many intermediate pushes before they are ready for review, causing excess npm prerelease versions and noisy PR comments.

Maintainers need prerelease publishing to continue automatically for ready PRs while allowing draft PR prereleases only when explicitly requested.

## Goals

- Prevent automatic npm prerelease publishing for draft PRs by default.
- Publish prereleases for ready-for-review PRs without extra labels.
- Allow maintainers/authors to opt a draft PR into prerelease publishing with a label.
- Make trigger, label, and gating behavior explicit in `.github/workflows/publish.yml`.
- Preserve existing final release publishing behavior.
- Document prerelease opt-in behavior for contributors/maintainers.
- Add tests or validation sufficient to catch accidental gate regressions.
- Add changelog entry under `Unreleased` because release automation behavior is user-visible to maintainers.

## Non-Goals

- Changing prerelease version format (`{base}-pr.{number}.{run_id}`).
- Changing npm dist-tag format (`pr-{number}`).
- Adding manual `workflow_dispatch` prerelease publishing.
- Deleting old prerelease versions or npm dist-tags.
- Changing final GitHub Release publish semantics.
- Using `pull_request_target` or broadening token/secrets exposure.
- Adding UI beyond GitHub labels, workflow status, and existing PR comment.

## Proposed Behavior

### Label contract

- Gate label name: `publish-prerelease`.
- Matching is exact and case-sensitive.
- Always render the label as code text: `publish-prerelease`.
- Do not call the label `prerelease`, `pre-release`, `publish prerelease`, `force prerelease`, `npm prerelease`, or `deploy prerelease` in docs, workflow comments, changelog, or PR guidance.
- Label description should be documented as: `Publish npm prereleases for this PR, including while draft`.
- Workflow must not create or manage the label; maintainers may create it in GitHub repository settings.
- Maintainer mental model: label means "publish prereleases even if this PR is Draft." It is not a release approval, security approval, merge approval, or final npm release trigger.

### Draft and ready semantics

Use GitHub PR draft state from `github.event.pull_request.draft`:

- `draft == true`: PR is Draft.
- `draft == false`: PR is Ready for Review.

Prerelease publish eligibility:

| PR state         | Has `publish-prerelease` label | Publish prerelease? | Reason                        |
| ---------------- | ------------------------------ | ------------------- | ----------------------------- |
| Draft            | No                             | No                  | Avoid over-publishing drafts  |
| Draft            | Yes                            | Yes                 | Explicit opt-in               |
| Ready for Review | No                             | Yes                 | Ready PRs publish by default  |
| Ready for Review | Yes                            | Yes                 | Label allowed but unnecessary |

### GitHub Actions triggers

`.github/workflows/publish.yml` keeps existing release trigger and expands PR trigger:

```yaml
on:
    release:
        types: [published]
    pull_request:
        types:
            - opened
            - synchronize
            - reopened
            - ready_for_review
            - converted_to_draft
            - labeled
            - unlabeled
```

Trigger intent:

- `opened`: publish if ready PR or labeled draft.
- `synchronize`: publish new prerelease for new commits only if eligible.
- `reopened`: publish if eligible.
- `ready_for_review`: publish immediately when draft becomes ready.
- `converted_to_draft`: re-evaluate gate; publish only if label remains present.
- `labeled`: publish immediately when `publish-prerelease` is added, including draft PRs.
- `unlabeled`: re-evaluate gate; normally skip draft PRs when opt-in label is removed.

Implementation may include `labeled`/`unlabeled` for all labels, but release/publish job must only become eligible when current PR labels include exact `publish-prerelease` or PR is ready.

### Job gating

`publish-prerelease` job must be gated before any checkout/build/npm publish steps:

```yaml
if: >-
    github.event_name == 'pull_request' &&
    (github.event.pull_request.draft == false ||
     contains(github.event.pull_request.labels.*.name, 'publish-prerelease'))
```

Required constraints:

- Final `publish` job remains gated on release event and semver tag as today.
- No npm publish step may run for ineligible draft PRs.
- No PR prerelease comment may be created or updated for ineligible draft PRs.
- Existing `permissions` for prerelease job should not be broadened.
- Workflow must continue using `pull_request`, not `pull_request_target`.
- Fork PR behavior must not become more permissive than current workflow behavior.

### PR comment behavior

When prerelease publishes, existing comment behavior remains:

- Comment heading stays `## 📦 Prerelease published to npm`.
- Existing bot comment is updated rather than duplicated.
- Comment includes exact version and PR tag install commands.
- Comment is only evidence of a completed publish. It must not imply merge readiness, release approval, or final package availability on `latest`.

When prerelease is skipped by gate:

- Workflow should rely on skipped job visibility.
- No skip comment is required.
- No new or updated PR comment should be visible for the skipped run.

### Canonical UX contract

#### User sees first

- On a Draft PR without `publish-prerelease`, maintainers first see the GitHub Actions run with `publish-prerelease` job marked skipped. They should not see a new npm prerelease comment.
- On a Draft PR with `publish-prerelease`, maintainers first see the normal prerelease publish job progress and, after success, the existing prerelease comment updated.
- On a Ready for Review PR, maintainers first see prerelease publishing happen without adding any label.

#### Primary maintainer action

- To publish a prerelease from a Draft PR: add label `publish-prerelease`.
- To stop future Draft PR prereleases: remove label `publish-prerelease` or keep/remove Draft state without that label.
- To publish by readiness instead of opt-in: mark PR Ready for Review.

#### Reading order and hierarchy

Docs and README wording must present behavior in this order:

1. Ready for Review PRs publish prereleases automatically.
2. Draft PRs skip prerelease publishing by default.
3. Add `publish-prerelease` to opt a Draft PR into prerelease publishing.
4. Remove `publish-prerelease` to stop future Draft PR prereleases.
5. Version format and dist-tag format are unchanged.

#### GitHub Actions status clarity

- Job name should remain or be visibly recognizable as `publish-prerelease`.
- Ineligible Draft PR result should be a skipped job, not a failed job.
- Skipped job should not be described as an error, warning, blocked release, or missing secret.
- If explanatory YAML comments are added, use wording: `Draft PRs publish prereleases only with publish-prerelease label; ready PRs publish automatically.`
- Do not add a separate "gate failed" step that can show red status for intended skips.

#### Interaction rules

- Adding unrelated labels may trigger a workflow run, but must not publish unless current label set includes exact `publish-prerelease` or PR is Ready for Review.
- Removing unrelated labels must not change eligibility unless current label set no longer includes exact `publish-prerelease` and PR is Draft.
- Converting a labeled PR to Draft preserves prerelease publishing because label remains explicit override.
- Converting an unlabeled Draft PR to Ready for Review publishes on the `ready_for_review` event.
- Converting a Ready PR to Draft skips future prereleases unless label is present.

#### Empty/loading/error states

- Empty state: no existing prerelease comment on a skipped Draft PR is expected; do not create placeholder comments.
- Loading state: while workflow is running, GitHub Actions status is source of truth; docs must not promise immediate npm availability before job success.
- Validation state: if label casing differs, such as `Publish-Prerelease`, gate treats it as absent.
- Error state: publish failures should remain normal workflow failures inside eligible runs; gate skips must remain non-error skipped jobs.

#### Canonical wording snippets

Use these exact snippets in maintainer-facing docs where practical:

- `Ready for Review PRs publish npm prereleases automatically.`
- `Draft PRs skip prerelease publishing unless labeled publish-prerelease.`
- `Add publish-prerelease to a Draft PR when reviewers need an npm prerelease before the PR is ready.`
- `Remove publish-prerelease to stop future Draft PR prereleases.`
- `The label does not affect final releases, mergeability, or npm latest.`

### Documentation

Update `docs/publishing.md` with a maintainer-facing `PR prereleases` section. Place it near automated publishing guidance, before manual publishing, so maintainers see PR behavior before emergency/manual workflows.

Required wording coverage:

- Ready for Review PRs publish prereleases automatically.
- Draft PRs do not publish prereleases by default.
- Add `publish-prerelease` label to a Draft PR to opt in.
- Remove `publish-prerelease` or convert a PR to Draft without that label to stop future Draft prerelease publishes.
- Version format and dist-tag format remain unchanged.
- Skipped Draft PR runs are expected and should appear as skipped `publish-prerelease` jobs, not failures.

README wording is optional. If README mentions PR prereleases, it must be one short pointer to `docs/publishing.md` and must use the same canonical label/name semantics. README must not duplicate the full trigger matrix.

### Changelog

Add `CHANGELOG.md` entry under `## [Unreleased]`, likely `### Changed`, e.g.:

```markdown
- **PR prerelease publishing** — draft PRs publish npm prereleases only when labeled `publish-prerelease`; ready-for-review PRs continue publishing automatically.
```

## Technical Design

### Existing workflow baseline

Current `.github/workflows/publish.yml` has two jobs:

- `publish`: release-only final npm publish. Triggered by `release: published`; job condition is `github.event_name == 'release' && startsWith(github.ref, 'refs/tags/v')`; permissions are `contents: write` and `id-token: write`.
- `publish-prerelease`: PR-only npm prerelease publish. Triggered today by `pull_request` types `opened`, `synchronize`, and `reopened`; job condition is `github.event_name == 'pull_request'`; permissions are `contents: read`, `id-token: write`, and `pull-requests: write`; comment creation/update lives inside this job after successful publish.

Other workflow files (`build-devcontainers.yml`, `generate-docs.yml`, `validate-overlays.yml`) use `pull_request` for validation only and do not publish npm packages. They must not absorb prerelease gate logic.

### Architecture Ownership

Owns new logic:

- `.github/workflows/publish.yml` owns event triggers, job-level eligibility, npm publish execution, and PR comment side effects.
- `docs/publishing.md` owns maintainer-facing operating model and label semantics.
- `CHANGELOG.md` owns user-visible release automation behavior change under `Unreleased`.
- Test/static-validation files own regression checks for workflow trigger and gate expression behavior.

Must not own new logic:

- CLI modules under `scripts/` or `tool/`; this is not runtime behavior.
- Overlay metadata, schema generation, composer, questionnaire, or generated devcontainer outputs.
- Other GitHub workflows; they remain validation-only.
- Repository label automation; maintainers create/manage `publish-prerelease` manually.

### System Boundaries

- Boundary between GitHub event payload and workflow eligibility changes: `github.event.pull_request.draft` and `github.event.pull_request.labels.*.name` become gate inputs.
- Boundary between workflow eligibility and npm side effects tightens: checkout/build/test/npm publish/comment steps run only when job-level `if` evaluates true.
- Boundary between prerelease and final release remains unchanged: release events never depend on PR draft state or labels.
- Boundary between docs and automation: docs describe exact label and expected skipped job; docs do not create or validate labels.

### Contracts Changed

Workflow contract:

```yaml
on:
    release:
        types: [published]
    pull_request:
        types:
            - opened
            - synchronize
            - reopened
            - ready_for_review
            - converted_to_draft
            - labeled
            - unlabeled
```

`publish-prerelease` job contract:

```yaml
# Draft PRs publish prereleases only with publish-prerelease label; ready PRs publish automatically.
if: >-
    github.event_name == 'pull_request' &&
    (github.event.pull_request.draft == false ||
     contains(github.event.pull_request.labels.*.name, 'publish-prerelease'))
```

Downstream interface contract:

- npm prerelease version remains `{base}-pr.{number}.{run_id}`.
- npm dist-tag remains `pr-{number}`.
- PR comment heading remains `## 📦 Prerelease published to npm`.
- Ineligible Draft PR run exposes skipped `publish-prerelease` job and no PR comment mutation.

### Canonical Data Flow

1. GitHub emits `release: published` or configured `pull_request` event.
2. Workflow scheduler creates run for matching event.
3. `publish` job evaluates release-only condition. If true, existing final release path runs unchanged.
4. `publish-prerelease` job evaluates PR-only gate before checkout:
    - if event is not `pull_request`, skip;
    - if PR `draft` is `false`, run;
    - if PR `draft` is `true` and current labels include exact `publish-prerelease`, run;
    - otherwise skip.
5. Eligible prerelease job checks out code, computes version from GitVersion + PR number + run ID, runs lint/build/tests, publishes npm package with `pr-{number}` tag, then creates/updates existing bot comment.
6. Ineligible prerelease job remains skipped; no npm publish and no comment step execute.

### Event Trigger and Transition Semantics

- `ready_for_review` must be added so Draft → Ready transition publishes immediately from resulting payload (`draft: false`).
- `converted_to_draft` must be added so Ready → Draft transition re-evaluates gate; labeled PRs continue publishing, unlabeled PRs skip.
- `labeled` must be added so adding exact `publish-prerelease` to Draft PR publishes immediately.
- `unlabeled` must be added so removing exact `publish-prerelease` from Draft PR causes future runs to skip.
- `opened`, `synchronize`, and `reopened` remain for backward compatibility with existing ready PR behavior and commit updates.
- `labeled`/`unlabeled` may fire for unrelated labels; job eligibility must inspect current full label set, not only `github.event.label.name`, so unrelated label churn cannot publish an unlabeled Draft PR.

### Job `if` Placement

Use job-level `if` on `publish-prerelease`, not step-level gates, because:

- GitHub renders ineligible Draft PRs as skipped jobs, matching maintainer mental model.
- Checkout, npm setup, provenance-capable publish, and PR comment steps never start for ineligible Draft PRs.
- No red "gate failed" status appears for intended skips.

Do not split publish/comment into separate jobs unless dependency conditions preserve same skip semantics and no comment job can run without successful publish.

### Backward Compatibility

Preserved:

- Final release publishing trigger and release job condition.
- Semver tag validation and final npm publish path.
- Ready PR prerelease publishing on `opened`, `synchronize`, and `reopened`.
- Existing PR prerelease version and dist-tag formats.
- Existing PR comment heading and update-rather-than-duplicate behavior.
- Current prerelease permissions and `pull_request` security posture.

Changed intentionally:

- Draft PRs without exact `publish-prerelease` no longer publish prereleases.
- Draft PR label/readiness transitions may create workflow runs that skip.
- Wrong-case/variant labels are ignored.

### Security and Privacy

- Keep `pull_request`; do not move to `pull_request_target`, because prerelease path builds PR code and has npm publishing capability.
- Do not broaden `publish-prerelease` permissions beyond current `contents: read`, `id-token: write`, `pull-requests: write`.
- Do not add secrets to conditions or comments.
- Fork PR behavior must remain no more permissive than current workflow. If current npm provenance/token behavior fails for untrusted forks, this change must not bypass that failure.

### Observability and Failure Modes

- Intended gate skip: skipped `publish-prerelease` job, no comment, no failure.
- Eligible publish failure: normal failing step inside `publish-prerelease`; existing diagnostics remain source of truth.
- GitHub expression typo: could publish too often or skip all PRs; static tests must cover truth table.
- Label typo/case mismatch: treated absent by design; docs must call out exact label.
- Stale label on Draft PR: publishes by design; docs must state remove label to stop future Draft prereleases.
- Existing prerelease comment may remain after later skipped run; it must not update and must be read as prior successful publish only.

### Implementation Slices

1. Workflow trigger slice: update `.github/workflows/publish.yml` PR event types only; preserve release trigger.
2. Workflow gate slice: replace `publish-prerelease` job `if` with combined Draft/label condition; keep all publish/comment steps inside gated job.
3. Static validation slice: add workflow regression tests or documented local validation fixture before docs/changelog are considered complete.
4. Documentation slice: add `docs/publishing.md` `PR prereleases` section near automated publishing; optional README one-line pointer only.
5. Changelog slice: add `CHANGELOG.md` `Unreleased` `### Changed` entry.
6. Quality slice: run `npm run lint:fix`, `npm run lint`, and targeted workflow validation/test command.

### Test Plan

Automated/static tests should cover workflow shape and gate semantics. Preferred approach: add a small Vitest test that reads `.github/workflows/publish.yml` and validates:

- `pull_request.types` contains exactly required trigger set, including transition and label events.
- workflow does not contain `pull_request_target`.
- `publish` job condition still includes release event and `refs/tags/v` tag guard.
- `publish-prerelease` permissions match current baseline.
- `publish-prerelease` job-level `if` contains PR event guard, `draft == false`, and exact `publish-prerelease` label check.
- comment step remains inside `publish-prerelease` job and no skip-comment step exists.

Gate truth-table tests should model intended expression in TypeScript or fixture evaluation:

| Event          | Draft | Labels                   | Expected |
| -------------- | ----- | ------------------------ | -------- |
| `pull_request` | true  | `[]`                     | false    |
| `pull_request` | true  | `['publish-prerelease']` | true     |
| `pull_request` | true  | `['Publish-Prerelease']` | false    |
| `pull_request` | true  | `['other']`              | false    |
| `pull_request` | false | `[]`                     | true     |
| `pull_request` | false | `['publish-prerelease']` | true     |
| `release`      | false | `['publish-prerelease']` | false    |

Manual QA remains covered by scenario scripts above for real GitHub event behavior.

### Architecture Decision Impact

Aligned with current repository architecture and AGENTS.md constraints: change is confined to GitHub Actions release automation, docs, changelog, and validation tests. No overlay, schema, composer, CLI, generated output, or package runtime contract changes.

No ADRs exist in `docs/`; no ADR amendment required. `docs/foundation.md` is missing, so no foundation alignment beyond AGENTS.md can be verified. If repository later adds CI/release foundation rules that conflict with label-gated prereleases, PM should request ADR/foundation update before implementation.

## Risks

- Maintainers may forget label name and wonder why draft PR prerelease did not publish.
- `labeled` trigger fires for unrelated labels, causing skipped workflow runs.
- GitHub expression syntax for label arrays can be brittle if not validated.
- Draft PRs with stale `publish-prerelease` label will continue publishing after conversion back to draft; this is intended label override behavior.
- Job-level condition mistakes could either over-publish Draft PRs or suppress ready PR prereleases.
- Existing duplicate/legacy sections in `docs/publishing.md` may make PR prerelease guidance hard to place; implementation should insert near current automated publishing section and avoid duplicating trigger matrix elsewhere.

## Out of Scope

- npm cleanup for old PR prereleases.
- Repository label bootstrapping automation.
- Branch-specific prerelease policies.
- Publishing to registries other than npm.
- Any CLI/runtime changes.

## QA Scenario Scripts

1. **Draft, no label**
    - Create or update a Draft PR with no `publish-prerelease` label.
    - Expected: workflow may run; `publish-prerelease` job is skipped; no prerelease PR comment appears or changes.
2. **Draft, add opt-in label**
    - Add exact label `publish-prerelease` to a Draft PR.
    - Expected: `labeled` event runs; `publish-prerelease` job publishes; prerelease comment appears or updates.
3. **Draft, wrong-case label**
    - Add `Publish-Prerelease` or any non-exact variant to a Draft PR.
    - Expected: `publish-prerelease` job is skipped; no comment appears or changes.
4. **Ready for Review, no label**
    - Mark Draft PR Ready for Review with no `publish-prerelease` label.
    - Expected: `ready_for_review` event runs; prerelease publishes automatically; comment appears or updates.
5. **Ready to Draft without label**
    - Convert Ready PR without `publish-prerelease` to Draft, then push commit.
    - Expected: future `publish-prerelease` job skips; existing older prerelease comment may remain but must not update for skipped run.
6. **Ready to Draft with label**
    - Add `publish-prerelease`, convert PR to Draft, then push commit.
    - Expected: future prerelease publishes continue because label is explicit override.
7. **Unrelated label churn**
    - Add/remove unrelated labels on Draft PR.
    - Expected: workflow may run; publish eligibility depends only on current Draft state and exact `publish-prerelease` presence.

## Acceptance Criteria

1. [x] **Workflow triggers updated** — `.github/workflows/publish.yml` `pull_request.types` includes `opened`, `synchronize`, `reopened`, `ready_for_review`, `converted_to_draft`, `labeled`, and `unlabeled`; verify by inspecting workflow file.
2. [x] **Draft PR without label skips publish** — for PR event payload with `draft: true` and labels not including `publish-prerelease`, `publish-prerelease` job condition evaluates false; verify with automated expression/unit test or documented local workflow validation fixture.
3. [x] **Draft PR with label publishes** — for PR event payload with `draft: true` and labels including exact `publish-prerelease`, job condition evaluates true; verify with automated expression/unit test or documented fixture.
4. [x] **Ready PR without label publishes** — for PR event payload with `draft: false` and no label, job condition evaluates true; verify with automated expression/unit test or documented fixture.
5. [x] **Ready-for-review transition publishes** — `ready_for_review` is configured as trigger and eligible when resulting payload has `draft: false`; verify by workflow inspection plus gate test.
6. [x] **Label-added transition publishes for draft** — `labeled` is configured as trigger and eligible draft payload with `publish-prerelease` publishes; verify by workflow inspection plus gate test.
7. [x] **Label removal stops draft publishing** — `unlabeled` is configured as trigger and draft payload without `publish-prerelease` skips; verify by workflow inspection plus gate test.
8. [x] **Release publish unchanged** — final release job still runs only for `release` events on `refs/tags/v*`; verify workflow diff preserves existing release job condition and release trigger.
9. [x] **No broadened security posture** — workflow still uses `pull_request` rather than `pull_request_target`, and prerelease job permissions are not broadened beyond current `contents: read`, `id-token: write`, `pull-requests: write`; verify workflow inspection.
10. [x] **No skipped PR comments** — implementation does not add skip comments for ineligible draft PRs; verify no new comment step runs outside gated `publish-prerelease` job.
11. [x] **Docs updated** — `docs/publishing.md` documents `publish-prerelease` label, Draft/Ready behavior, expected skipped job status, maintainer action wording, and unchanged version/tag format; verify doc review.
12. [x] **Changelog updated** — `CHANGELOG.md` includes `Unreleased` entry for PR prerelease gating; verify changelog review.
13. [x] **Quality checks pass** — run `npm run lint:fix`, `npm run lint`, and targeted workflow validation/test command chosen by implementation; document commands and results in PR.

## Implementation Notes

Implemented 2026-06-03. Updated `.github/workflows/publish.yml` to add PR transition/label triggers and gate `publish-prerelease` at job level with Draft/Ready plus exact `publish-prerelease` label semantics. Added `tool/__tests__/publish-workflow.test.ts` to statically validate trigger shape, security posture, comment placement, prerelease permissions, release gate preservation, and gate truth table. Updated `docs/publishing.md` and `CHANGELOG.md` with maintainer-facing prerelease behavior. Validation: `npm run lint:fix`, `npm run lint`, `npm test -- tool/__tests__/publish-workflow.test.ts`, and `npm test` passed.
