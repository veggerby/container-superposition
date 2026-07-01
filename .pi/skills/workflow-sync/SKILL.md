---
name: workflow-sync
description: Workflow artifact synchronization guidance for container-superposition. Use when updating specs, spec index, changelog, opportunities, roadmap, or Pi inventory assets.
---

# Workflow Sync

Use this skill when work changes any spec file, the spec index, the changelog, the opportunities backlog, the roadmap, or Pi inventory assets (`.pi/README.md`, `.pi/skills/`, `.pi/prompts/`, `.pi/agents/`).

## When to use this skill

- Updating a spec's status, title, taxonomy, or content
- Creating, merging, or removing a spec
- Updating `docs/specs/README.md` (the spec index)
- Updating `docs/specs/taxonomy.md`
- Writing or amending `CHANGELOG.md` entries
- Updating `docs/opportunities/README.md` or `docs/roadmap.md`
- Adding, removing, or renaming files under `.pi/skills/`, `.pi/prompts/`, or `.pi/agents/`
- Updating `.pi/README.md`

## Read first

Before making any changes, read these in order:

1. `AGENTS.md` — authoritative project contributor rules; owns the changelog categorization and DoD rules
2. `docs/definition-of-done.md` — validation gates, completion criteria, and changelog trigger rules
3. `docs/specs/README.md` — current spec index; verify existing entries before adding or changing rows
4. `docs/specs/taxonomy.md` — current taxonomy listings; verify before adding or changing taxonomy values
5. The live spec(s) being edited — read the full file before changing any field
6. `.pi/README.md` — current Pi inventory claims; compare against disk state
7. `CHANGELOG.md`, `docs/opportunities/README.md`, and `docs/roadmap.md` when the change type may require them (see Required workflow §3 for trigger rules)

## Primary files and surfaces

| Surface             | Path                           |
| ------------------- | ------------------------------ |
| Spec index          | `docs/specs/README.md`         |
| Spec taxonomy       | `docs/specs/taxonomy.md`       |
| Individual specs    | `docs/specs/**/spec.md`        |
| Changelog           | `CHANGELOG.md`                 |
| Opportunity backlog | `docs/opportunities/README.md` |
| Roadmap             | `docs/roadmap.md`              |
| Pi inventory        | `.pi/README.md`                |
| Pi skills           | `.pi/skills/*/SKILL.md`        |
| Pi prompts          | `.pi/prompts/*.md`             |
| Pi agents           | `.pi/agents/*.md`              |

## Required workflow

### 1. Synchronize spec metadata in the same change when indexed fields change

When a spec's title, status, taxonomy, or QA marker changes:

- Update the matching row in `docs/specs/README.md` in the **same change** — not a follow-up commit
- Keep `docs/specs/taxonomy.md` synchronized when taxonomy listings or displayed spec statuses/titles would otherwise become false
- The spec file and the index must always be consistent after any commit

Authority: `AGENTS.md` (synchronization rule), `docs/definition-of-done.md`

### 2. Respect workflow role ownership

Each status field has an owner. Do not write or delete markers you do not own:

| Field / marker                                    | Owner                |
| ------------------------------------------------- | -------------------- |
| `Status: Draft`                                   | PM                   |
| `Status: Implemented` + `## Implementation Notes` | Developer            |
| `Status: Final`                                   | QA                   |
| `QA Status` (field)                               | QA                   |
| `## QA Feedback` section                          | QA                   |
| Marking QA feedback rows `Done`                   | Developer or support |

Never remove `QA Status` or `## QA Feedback` sections, even when resolving feedback rows. Mark rows `Done`; do not delete them.

Authority: `AGENTS.md` (workflow artifact rules)

### 3. Update portfolio or changelog artifacts only when the change type requires it

Update `docs/opportunities/README.md` when:

- Opportunity evidence changes (new discovery, obsoleted assumption)
- Priority or recommended next action changes based on delivery outcomes

Update `docs/roadmap.md` when:

- Roadmap sequencing changes
- A commitment is added, removed, or shifted

Update `CHANGELOG.md` when:

- The shipped change is user-visible (command behavior, output, schema, docs that end users read)
- The shipped change adds or changes contributor-visible guidance (skills, Pi inventory, AGENTS.md)
- Repo guidance explicitly requires a changelog entry for the change type

Do **not** update `docs/opportunities/README.md` or `docs/roadmap.md` for routine copy edits, formatting fixes, or spec status progressions that do not affect priority or sequencing.

When adding a new item in the current unreleased cycle: keep it as one consolidated `Added` entry. Do not also list the same new item under `Changed` or `Fixed`.

Authority: `AGENTS.md` (Changelog categorization rule), `docs/definition-of-done.md`

### 4. Keep Pi inventory truthful whenever Pi assets change

When adding, removing, or renaming files under `.pi/skills/`, `.pi/prompts/`, or `.pi/agents/`:

1. Open `.pi/README.md`
2. Compare every claim in the skills, prompts, and agents listings against the actual files on disk
3. Add entries for new assets, remove entries for deleted assets, correct names and paths for renamed assets
4. Commit the inventory update in the same change as the asset change — never leave inventory claims that no longer match disk state

A claim that does not match a real file is a false inventory entry. Remove or correct it.

Authority: Spec `039-project-local-contributor-skills-initiative`

### 5. Handle unclear artifacts conservatively

When you encounter a stray, empty, or orphaned workflow artifact (spec without an index row, index row without a spec file, etc.):

- Surface it as hygiene debt rather than silently fixing or silently ignoring it
- Do not delete a spec, index row, opportunity entry, or roadmap item unless ownership and removal intent are unambiguous
- Flag the artifact in your implementation notes or escalate if the ownership is unclear

## Do not do this

- Leave spec metadata and the spec index out of sync after a commit
- Remove or rewrite `QA Status` or `## QA Feedback` markers — only QA may remove them
- Claim a Pi asset (skill, prompt, agent) exists in `.pi/README.md` when no corresponding file exists on disk
- Update `docs/opportunities/README.md` or `docs/roadmap.md` mechanically for every delivery when the change does not affect priority or sequencing
- List the same new unreleased item under both `Added` and `Changed`/`Fixed` in `CHANGELOG.md`

## Escalate when

- A requested status change is owned by another role (e.g., setting `Status: Final` as a developer) — escalate rather than overriding role boundaries
- A portfolio artifact update would imply a priority or commitment change that is outside the scope of the request
- A stray or orphaned workflow artifact cannot be classified safely and removal would be destructive
- Work conflicts with `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR 001, or an approved feature spec — escalate; do not invent a local exception

## Validation

Select validation by change type:

| Change type                       | Required validation                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| Formatting-affecting file changes | `npm run lint:fix` then `npm run lint`                                                              |
| Any shipped change                | `npm run lint`                                                                                      |
| Spec status update                | Confirm `docs/specs/README.md` row matches updated spec header                                      |
| Pi inventory update               | Confirm `.pi/README.md` listings match actual files in `.pi/skills/`, `.pi/prompts/`, `.pi/agents/` |
| Taxonomy changes                  | Confirm `docs/specs/taxonomy.md` still accurately reflects live spec set                            |

No code compilation or test commands are typically required for pure workflow-artifact changes. If the workflow-sync change is part of a larger implementation, apply the full validation surface required by that implementation's skill (e.g., `cli-command-delivery` or `dogfooding-safety`).

Full command reference: `AGENTS.md` → Commands section.

## Related skills

- `cli-command-delivery` — when workflow sync is triggered by a command implementation change
- `canonical-docs-alignment` — when Pi inventory or docs need updating alongside workflow artifacts
- `overlay-development` — when the primary scope is overlay files that also require changelog or spec updates
- `dogfooding-safety` — when the change touches generated output that has spec or changelog implications
