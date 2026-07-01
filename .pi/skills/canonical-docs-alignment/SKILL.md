---
name: canonical-docs-alignment
description: Canonical documentation alignment guidance for container-superposition. Use when updating README files, docs, help examples, or Pi inventory text to match the current canonical workflow.
---

# Canonical Docs Alignment

Use this skill when work updates `README.md`, `tool/README.md`, `docs/**`, command help examples or walkthroughs, or `.pi/README.md` when contributor-facing inventory text changes.

## When to use this skill

- Editing `README.md` or `tool/README.md`
- Updating or adding content under `docs/**`
- Updating command help text, inline examples, or walkthrough prose
- Correcting stale workflow descriptions, command references, or option names
- Updating `.pi/README.md` to reflect the current Pi asset inventory
- Removing or relabeling legacy/deprecated content

## Read first

Before making any changes, read these in order:

1. `AGENTS.md` — authoritative project contributor rules
2. `docs/foundation.md` — engineering boundary authority; defines what the tool owns and does not own
3. `docs/adr/adr001-project-file-first-replay-and-regeneration.md` — project-file-first intent authority; canonical input model
4. `docs/definition-of-done.md` — validation gates and completion criteria
5. `docs/specs/030-discovery-surface-and-docs-alignment/spec.md` — canonical docs alignment requirements
6. The relevant live command spec(s) and current command help/output when documenting command behavior

## Primary files and surfaces

| Surface                | Path                    |
| ---------------------- | ----------------------- |
| User-facing README     | `README.md`             |
| Tool maintainer README | `tool/README.md`        |
| Project docs           | `docs/**`               |
| Pi inventory           | `.pi/README.md`         |
| Pi skill files         | `.pi/skills/*/SKILL.md` |
| Prompt templates       | `.pi/prompts/*.md`      |
| Agent definitions      | `.pi/agents/*.md`       |

## Required workflow

### 1. Teach the canonical project-intent model

When writing or updating docs that describe how to configure a project:

- Present `superposition.yml` / `.superposition.yml` as the canonical shared intent file — the file the whole team owns
- Present flat `overlays:` selection as the default explicit authoring model for choosing overlays
- Present presets as an optional shorthand, not a different configuration architecture
- Present `superposition.json` as compatibility/reproducibility output — not the primary team-owned intent file

Do not present `superposition.json` as the file contributors should hand-edit for steady-state configuration when a project file exists.

Authority: `docs/adr/adr001-project-file-first-replay-and-regeneration.md`, `docs/foundation.md`

### 2. Teach the preview-first workflow

When docs cover command flows:

- Default documented workflow must read as `discover → inspect → preview → write`
- Surface `list`, `explain`, `plan`, `plan --verbose`, and `plan --diff` as the safe path before `init` or `regen` where those flows are relevant
- Do not document `init` as the first step for new users without first surfacing the read-only discovery commands

Authority: `docs/specs/033-cli-discovery-preview-and-fingerprint/spec.md`

### 3. Label legacy guidance correctly

When encountering or writing content about deprecated configuration syntax:

- Deprecated category-centric top-level fields (such as `language:` or `database:` as top-level keys) must not be taught as the default current model
- If legacy syntax must be retained for migration or compatibility context, frame it explicitly: "Legacy / migration only" or equivalent
- Do not teach `_serviceOrder` or other internal implementation fields as end-user workflow guidance unless an approved spec broadens their audience
- Manifest-first explanations may remain only when clearly framed as migration or compatibility context — not as the default user path

Authority: `docs/specs/030-discovery-surface-and-docs-alignment/spec.md`

### 4. Verify examples against live behavior

Before committing example commands or option names:

- Run the example command or check the current help output (`npm run init -- --help`, `npm run init -- plan --help`, etc.) to confirm the command name and flags are still accurate
- Remove or rewrite stale examples rather than leaving them because they look close enough
- If an example's expected output has changed, update the expected output

### 5. Keep user guidance and maintainer guidance separated

- End-user docs (README, walkthroughs, getting-started content) should teach the canonical user workflow using user-visible command names and flags
- Maintainer-only internals (overlay authoring details, schema type registration, generator internals) should remain in maintainer-oriented surfaces such as `tool/README.md` or `docs/`
- Do not promote maintainer internals into user-facing content without an approved spec authorizing the audience change

### 6. Keep Pi inventory docs truthful

When a change adds, removes, or renames a Pi asset (skill, prompt, or agent):

- Check `.pi/README.md` claims against the actual files present in `.pi/skills/`, `.pi/prompts/`, and `.pi/agents/`
- Correct any listing that no longer matches disk state in the same change
- Do not document a skill, prompt, or agent that does not have a corresponding file

Authority: Spec `039-project-local-contributor-skills-initiative`, `workflow-sync` skill

## Do not do this

- Reintroduce manifest-first or category-centric steady-state guidance as the primary model for new users
- Document Pi assets (skills, prompts, agents) that do not exist as files on disk
- Teach `_serviceOrder` or other internal implementation details as end-user workflow guidance without spec authority
- Leave stale examples in place solely because they look roughly correct
- Present `superposition.json` as the primary team-owned intent file

## Escalate when

- Live behavior and current docs disagree, and the correct product behavior is unclear — escalate before picking a version to document
- A requested docs change would contradict ADR 001 or spec 030 — escalate rather than making a local exception
- Legacy syntax is being retained or promoted without a clear migration/compatibility label and you are not certain what the label should be
- Work conflicts with `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR 001, or an approved feature spec — escalate; do not invent a local exception

## Validation

Select validation by change type:

| Change type                       | Required validation                                                                                 |
| --------------------------------- | --------------------------------------------------------------------------------------------------- |
| Formatting-affecting file changes | `npm run lint:fix` then `npm run lint`                                                              |
| Any shipped change                | `npm run lint`                                                                                      |
| Command example updates           | Manually verify example against live `npm run init -- <command> --help` output                      |
| Pi inventory update               | Confirm `.pi/README.md` listings match actual files in `.pi/skills/`, `.pi/prompts/`, `.pi/agents/` |
| Generated overlay docs changed    | `npm run docs:generate` (edit overlay source first, then regenerate)                                |
| Generated schema changed          | `npm run schema:generate` (edit source first, then regenerate)                                      |

Full command reference: `AGENTS.md` → Commands section.

## Related skills

- `cli-command-delivery` — when the scope shifts from documentation to command code, tests, or output logic
- `workflow-sync` — when spec metadata, changelogs, or Pi inventory need updating alongside docs changes
- `overlay-development` — when the primary scope is overlay files and overlay-specific documentation
- `dogfooding-safety` — when the change touches generated output or regen/doctor flows
