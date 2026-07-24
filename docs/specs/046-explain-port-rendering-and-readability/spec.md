---
spec: '046-explain-port-rendering-and-readability'
title: 'Explain Port Rendering and Readability Polish'
status: 'Final'
qa_status: ''
priority: 'P1'
owner: 'pm'
product_approval: 'approved'
architecture_review: 'not-needed'
ux_review: 'approved'
created: '2026-07-17'
updated: '2026-07-17'
related_adrs:
    - 'docs/adr/adr001-project-file-first-replay-and-regeneration.md'
related_foundation:
    - 'docs/foundation.md'
related_specs:
    - 'docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md'
normative_references:
    - 'AGENTS.md'
    - 'docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md'
---

# Explain Port Rendering and Readability Polish

**Spec**: `046-explain-port-rendering-and-readability`
**Status**: Final
**Created**: 2026-07-17
**Priority**: P1
**Product Approval**: approved
**Architecture Review**: not-needed
**UX Review**: approved

## Description

Fix the current `explain` defect where rich port metadata renders as `[object Object]`, and use that repair to make `explain` output easier to scan without reopening the broader cross-command UX program.

## Evidence

- User report: `npx container-superposition@prerelease explain postgres` shows `[object Object]` under `What it adds`, `What to watch out for`, and `Files, services, and ports`.
- `tool/commands/explain.ts` — current `overlay.ports.join(', ')` and `String(port)` style rendering assumes primitive ports and leaks object coercion into human-readable output.
- `tool/schema/types.ts` — `OverlayMetadata.ports` explicitly supports both legacy numeric ports and rich `PortMetadata` objects.
- `overlays/postgres/overlay.yml` — live overlay metadata uses rich port objects with `port`, `service`, `protocol`, and `description`.
- `docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md` — existing authority already requires `explain` to answer `What would it add?` and `What should I watch out for?` in plain language.

## Problem Statement

`explain` currently breaks when an overlay declares rich port metadata, which makes a core discovery command look untrustworthy at the point where users are deciding whether to adopt an overlay. The broader request for “prettier” output is valid, but a broad read-only command redesign would be larger than the confirmed defect and should not be smuggled in as an unbounded polish pass.

## User Goals / Jobs To Be Done

- As a user evaluating an overlay, I want `explain` to show ports in readable language so I can understand what opens locally.
- As a user skimming command output, I want the structured details in `explain` to be easier to scan than raw metadata dumps.
- As a maintainer, I want this fix to preserve the existing discovery → inspect → preview ladder rather than introducing a surprise cross-command redesign.

## Success Signals

- `explain postgres` no longer prints `[object Object]` anywhere in human-readable output.
- Rich-port overlays communicate port number and relevant context in plain language.
- Readability improves within `explain` without changing unrelated command contracts.

## Confidence

- Overall confidence: high
- Confidence notes: defect and root cause are directly evidenced in live command output, code, and overlay metadata. The broader “across the board” request is intentionally narrowed here to avoid speculative UX scope.

## User Stories

**US-1** As a user, I want `explain` to render ports clearly so I can tell what network exposure an overlay adds.

**US-2** As a user, I want the `Files, services, and ports` section to be more readable so I can skim structured impact quickly.

## Goals

- Repair human-readable rendering for both numeric and object-form ports in `explain`.
- Normalize one concise port presentation pattern across all `explain` sections that mention ports.
- Apply small readability polish inside `explain` where needed to support scanning of the repaired data.

## Non-Goals

- Redesigning `list`, `plan`, `hash`, or `doctor` output in this change.
- Rewriting the section order or workflow ladder defined by spec 033.
- Adding new overlay metadata fields or changing overlay manifest schema.
- Solving every CLI formatting complaint under the broad “prettier across the board” request.

## Authority and References

This spec must align with:

- `docs/foundation.md`
- `docs/adr/adr001-project-file-first-replay-and-regeneration.md`
- `docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md`

List the specific references for this spec:

- `tool/commands/explain.ts`
- `tool/schema/types.ts`
- `overlays/postgres/overlay.yml`

## Design

### Observed Behavior

For overlays that use rich port metadata objects, `explain` currently stringifies those objects implicitly. This leaks `[object Object]` into at least three sections and undercuts the “plain language” promise of the command.

### Likely Intent

`explain` is intended to translate overlay metadata into a human-readable decision aid, not to expose raw JavaScript coercion artifacts.

### Product / Behavior

- Human-readable `explain` must render every port reference through one normalized formatter that supports both numeric ports and rich port metadata objects.
- The formatter must produce concise plain-language text that includes the port number and may include relevant context such as service name, protocol, or description when present.
- `What it adds`, `What to watch out for`, and `Files, services, and ports` must all consume that normalized representation instead of ad hoc string coercion.
- Readability polish in this scope is limited to making those sections easier to scan once ports are rendered correctly. Acceptable polish includes clearer phrasing, more consistent bullet text, and avoiding redundant wording around structured items.
- JSON output should remain semantically aligned with text output and must not lose the underlying structured data because of the text-format fix.

### Technical Notes

- Favor one command-local formatting helper or normalized view-model field rather than repeating port-string assembly in multiple section builders.
- Preserve support for legacy numeric port arrays and rich `PortMetadata` arrays.
- Preserve existing section order and next-step behavior from spec 033.

## Technical Design

### Architecture Ownership

- `tool/commands/explain.ts` owns this bugfix because the defect is in command-local human-readable assembly (`overlay.ports.join(', ')` and `port: ${port}`).
- `tool/schema/types.ts` remains the authority for the existing mixed `ports` contract (`number | PortMetadata`); this work must consume that contract, not change it.
- JSON output remains a structured command model; this fix must not flatten or replace structured `overlay.ports` data for JSON consumers.

### System Boundaries

- In scope: human-readable `explain` rendering plus the command-local view-model fields that feed those rendered sections.
- Out of scope: overlay schema changes, cross-command renderer redesign, port-offset logic, or any mutation of overlay metadata.
- The normalized display token is a presentation concern for `explain`, not a new repository-wide canonical port schema.

### Canonical Data Flow

```mermaid
flowchart LR
    A[Overlay metadata\nnumber | PortMetadata] --> B[explain model builder]
    B --> C[command-local normalized port token]
    C --> D[What it adds bullets]
    C --> E[What to watch out for bullets]
    C --> F[Files services and ports list]
    B --> G[JSON output model keeps structured overlay data]
```

### Implementation Slices

1. Add a small command-local formatter in `tool/commands/explain.ts` that converts one `number | PortMetadata` entry into the normalized display token.
2. Build one ordered array of normalized port display records during explain-model construction, then reuse that same array for:
    - `What it adds` as `port: <token>`
    - `What to watch out for` as `opens port: <token>`
    - `Files, services, and ports` as `port: <token>`
3. Leave non-port bullets and section ordering unchanged except for the approved bounded readability copy change from plural summaries to one-bullet-per-port phrasing.
4. Keep JSON output semantically aligned by preserving raw structured overlay metadata while allowing additive explain-local fields if tests need them.

### Likely Files To Change

- `tool/commands/explain.ts` — defect fix and explain-local normalization reuse
- `tool/__tests__/ux-renderers.test.ts` — section phrasing, ordering, token reuse, and no-`[object Object]` assertions
- `tool/__tests__/commands.test.ts` — command-level rich-port and legacy numeric-port coverage

### Implementation Ladder Decision

- Chosen rung: reuse existing command module and add minimum new code there.
- Lower rungs checked:
    - skip: not viable because the current output is incorrect
    - reuse existing repo helper: `tool/utils/port-utils.ts` normalizes ports for generation/docs (`actualPort`, URLs, connection strings) but does not own this exact explain-only text token
    - stdlib/platform/dependency: none provide the required domain-specific token formatting
- Non-negotiables checked: no schema change, no JSON data loss, no section-order drift, no broader command-contract rewrite.

### Risk Notes

- If each section formats ports independently, token drift can reappear; mitigate by computing the token once per port and reusing it.
- If the formatter treats missing fields loosely, output can gain dangling separators; mitigate with explicit omission rules and tests for partial metadata.
- If JSON serialization is switched to rendered strings, downstream structured consumers could regress; mitigate by keeping structured overlay metadata intact.

### Test Plan

- Command-level text coverage for a rich object-form overlay (`postgres`) asserting:
    - no `[object Object]`
    - `port: 5432/tcp — postgres — PostgreSQL database connection`
    - `opens port: 5432/tcp — postgres — PostgreSQL database connection`
    - identical token reuse in `Files, services, and ports`
- Command-level text coverage for one legacy numeric-port overlay such as `ngrok` asserting compact `4040` rendering with no extra punctuation.
- Ordering assertions confirming `Best for` through `Try this next` still match spec `033`.
- JSON assertions confirming structured `overlay` data remains present and semantically aligned.

### Architecture Decision Impact

aligned with current ADRs/foundation

### UX Notes

- Keep the current section order intact.
- Keep `Files, services, and ports` as one flat bullet list in this change; do not add sub-headings or nested groups.
- Prefer compact scan-friendly lines over verbose prose paragraphs.
- Port text must surface the most decision-relevant parts first: port number, then protocol when present, then service/context, then optional description.
- Use stable item prefixes where they already exist (`file:`, `service:`, `port:`) so mixed lists remain easy to skim.

## Canonical Interaction Model

### First-read contract

`explain` remains a read-only inspection screen inside the existing `discover → inspect → preview` ladder from spec `033`.

The user should be able to answer these questions without parsing raw metadata:

1. what capability this overlay adds
2. what local port exposure it creates
3. what service that port belongs to
4. what command to run next for a safe preview

### Port representation contract

Human-readable `explain` must treat each port as one normalized display token.

Canonical token pattern:

- `<port>/<protocol> — <service> — <description>` when protocol, service, and description are present
- `<port> — <service> — <description>` when protocol is absent
- `<port>/<protocol> — <service>` when description is absent
- `<port>` for legacy numeric ports with no extra metadata

Rules:

- `port` is always first and is never omitted.
- `protocol` is appended directly to the port with `/` when present.
- `service` is the next most important qualifier and comes before description.
- `description` is last and only shown when present.
- Do not render empty placeholders such as `unknown`, `n/a`, empty parentheses, or trailing dashes.
- Do not coerce objects with `String(port)` or array `.join()` on raw objects.

Preferred house style example:

- `5432/tcp — postgres — PostgreSQL database connection`

## Interaction Rules

### Section-level formatting rules

#### `What it adds`

- Keep each additive fact as a separate bullet.
- When ports are present, render one bullet per port using `port: <normalized token>`.
- Do not collapse rich ports into comma-joined object output.
- Keep other additive bullets unchanged unless a small wording adjustment improves scanability.

#### `What to watch out for`

- Keep watch-outs as separate bullets.
- When port exposure is mentioned, render one bullet per port using `opens port: <normalized token>`.
- If conflict or stack-fit bullets also appear, port bullets should remain peers rather than embedded in prose.

#### `Files, services, and ports`

- Keep one flat list under the existing section title.
- Preserve typed prefixes:
    - `file: <name>`
    - `service: <name>`
    - `port: <normalized token>`
- Do not add nested grouping, tables, or extra headings in this change.

### Consistency rules

- The normalized token after `port:` or `opens port:` must be identical everywhere the same port is referenced in one `explain` response.
- Numeric ports and rich object-form ports must flow through the same formatter.
- If multiple ports exist, preserve input order rather than re-sorting within this bugfix.

## Terminology Rules

- Prefer `opens port` over lower-level phrasing like `binds`, `publishes`, or `exposes` in `What to watch out for`.
- Prefer singular `port:` bullets over plural `ports:` summary bullets when rendering individual port items.
- Keep `Files, services, and ports` label unchanged to stay aligned with spec `033`.

## Worked Examples

### Rich port overlay

For `postgres`, human-readable `explain` should render port references like:

```text
What it adds
- PostgreSQL 16 database
- compose services: postgres
- port: 5432/tcp — postgres — PostgreSQL database connection

What to watch out for
- stack fit: compose
- conflicts to watch: pgvector
- starts sidecar services: postgres
- opens port: 5432/tcp — postgres — PostgreSQL database connection

Files, services, and ports
- file: .env.example
- file: README.md
- service: postgres
- port: 5432/tcp — postgres — PostgreSQL database connection
```

### Legacy numeric port overlay

For an overlay that only declares a numeric port:

```text
What it adds
- port: 6379

What to watch out for
- opens port: 6379

Files, services, and ports
- port: 6379
```

## QA Scenario Scripts

1. Run `npm run init -- explain postgres` and verify there is no `[object Object]` anywhere in output.
2. Verify the same normalized port token appears under `What it adds`, `What to watch out for`, and `Files, services, and ports`.
3. Verify `Files, services, and ports` remains a flat list with `file:`, `service:`, and `port:` prefixes.
4. Verify a legacy numeric-port overlay still renders compactly as just the port number with no extra punctuation.
5. Verify section order still matches spec `033`.

## Constraints

- No schema changes.
- No changes to command routing or next-step logic.
- Must remain compatible with both overlays that use numeric ports and overlays that use rich port objects.

## Preferences / Tradeoffs

- Prefer a small, reusable formatting pattern over bespoke copy per section.
- Prefer bounded `explain`-only polish now over a larger unscoped “make everything prettier” sweep.

## Risks

- Over-formatting could make simple numeric ports noisier than today.
- Section-specific copy tweaks could drift if each section formats the same port differently.

## Implementation / Intent Mismatches

- Spec 033 requires plain-language explain output, but current implementation leaks raw object coercion.
- The broader readability ask is product-valid, but current request does not provide enough UX contract to safely extend the work across all commands.

## Acceptance Criteria

- [x] `explain <id>` never renders `[object Object]` in human-readable output, including overlays that use rich `ports` metadata.
- [x] Rich port metadata renders as one normalized token in the form `<port>/<protocol> — <service> — <description>`, omitting missing parts cleanly and rendering legacy numeric-only ports as just `<port>`.
- [x] `What it adds` renders one bullet per port as `port: <normalized token>`.
- [x] `What to watch out for` renders one bullet per port exposure as `opens port: <normalized token>`.
- [x] `Files, services, and ports` remains one flat mixed list and renders port entries as `port: <normalized token>` while preserving `file:` and `service:` prefixes.
- [x] The same normalized token is reused everywhere the same port appears in a single human-readable `explain` response.
- [x] Existing `explain` section order from spec `033` remains unchanged.
- [x] JSON output for `explain` remains semantically aligned and retains structured overlay information needed by existing consumers/tests.
- [x] Automated tests cover at least one overlay with object-form ports and one legacy numeric-port case, asserting readable port text and absence of `[object Object]` in human-readable output.
- [x] Documentation and workflow artifacts are updated to match the implemented or reviewed state.

## Out of Scope

- Cross-command visual redesign of all read-only CLI output.
- New docs/help rewrites beyond any narrowly required mention of changed `explain` output.
- Overlay catalog cleanup unrelated to port rendering.

## Assumptions

- Existing spec 033 remains the governing UX contract for section order and workflow framing.
- Developer can implement the fix without architecture changes.

## Open Questions

- Product follow-up: Should the broader “prettier across the board” request be handled as a later cross-command UX sweep under spec `033`, or tracked as a separate backlog/spec item after this bugfix ships?

## Definition of Done

> Filled in progressively by each role. QA sets `Status: Final` only after verifying all gates.
> Full standards in `docs/definition-of-done.md`.

### Code

- [x] No lint errors
- [x] No type errors
- [x] No debug or uncommitted temporary code
- [x] Follows project conventions

### Tests

- [x] Unit tests cover new pure logic
- [x] Integration tests cover system boundaries
- [x] All tests pass
- [x] No unjustified skipped tests
- [x] Failure and edge cases covered

### Documentation

- [x] Public interfaces documented
- [x] All new documentation in Markdown
- [x] All diagrams in Mermaid
- [ ] README updated if behavior or setup changed
- [x] Architecture docs updated if ownership or boundaries changed

### Changelog

- [x] `CHANGELOG.md` updated under `[Unreleased]` for user-visible changes

### Workflow artifacts

- [x] Acceptance criteria checked off (met only — unmet left unchecked with explanation)
- [x] `## Implementation Notes` written
- [x] Spec status and index synchronized
- [x] QA feedback rows marked `Done` where applicable

### Architecture

- [x] No ADR or foundation rules silently violated
- [x] ADR created or amended if a standing decision was made or changed

### QA verification

- [x] All above gates verified independently
- [x] Acceptance criteria classified: MET / CLAIMED BUT FAILED / OPEN / UNCHECKED
- [x] No regressions introduced
- [x] Spec set to `Final`

## Implementation Notes

Implemented the approved explain-local port rendering fix in `tool/commands/explain.ts`.

Changes shipped:

- added one explain-local normalized port token formatter for `number | PortMetadata`
- reused the same token in `What it adds`, `What to watch out for`, and `Files, services, and ports`
- kept section order and flat-list rendering from spec `033`
- preserved structured JSON port data via additive `overlay.ports` plus `overlay.normalizedPortTokens`
- added targeted regression coverage for rich object-form ports (`postgres`) and legacy numeric ports (`ngrok`)

Validation run:

- `npx vitest run tool/__tests__/ux-renderers.test.ts tool/__tests__/commands.test.ts`
- `task validate`

Notes:

- README unchanged; this fix is limited to explain output phrasing and existing command/spec coverage
