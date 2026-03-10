<!--
Sync Impact Report
- Version change: template -> 1.0.0
- Modified principles:
  - Template Principle 1 -> I. Spec-First Delivery
  - Template Principle 2 -> II. Overlay Contract Integrity
  - Template Principle 3 -> III. Verification Before Merge
  - Template Principle 4 -> IV. Documentation Synchronization
  - Template Principle 5 -> V. Simplicity and Compatibility
- Added sections:
  - Implementation Constraints
  - Delivery Workflow
- Removed sections:
  - None
- Templates requiring updates:
  - ✅ updated /workspaces/container-superposition/.specify/templates/plan-template.md
  - ✅ updated /workspaces/container-superposition/.specify/templates/spec-template.md
  - ✅ updated /workspaces/container-superposition/.specify/templates/tasks-template.md
  - ✅ updated /workspaces/container-superposition/.specify/templates/checklist-template.md
  - ✅ updated /workspaces/container-superposition/README.md
  - ✅ updated /workspaces/container-superposition/CONTRIBUTING.md
  - ✅ updated /workspaces/container-superposition/AGENTS.md
  - ✅ updated /workspaces/container-superposition/docs/README.md
  - ✅ updated /workspaces/container-superposition/.specify/scripts/bash/common.sh
  - ✅ updated /workspaces/container-superposition/.specify/scripts/bash/create-new-feature.sh
- Follow-up TODOs:
  - TODO(RATIFICATION_DATE): Original ratification date is not recorded in the repository history available to this update.
-->
# Container Superposition Constitution

## Core Principles

### I. Spec-First Delivery
Every feature MUST begin with a specification committed under
`docs/specs/<feature-branch>/spec.md`. Implementation code, implementation tasks,
and merge approval MUST wait until that spec is committed and reviewed. Plans,
tasks, and implementation changes MUST trace back to the approved spec so scope
changes are visible before code is written. Rationale: this project explicitly
follows spec-first development and depends on durable design records for safe
CLI, overlay, and template evolution.

### II. Overlay Contract Integrity
Changes to overlays, templates, manifests, or composition logic MUST preserve
editable output, declared dependencies, conflict rules, and documented stack
support. Any behavior change that affects generated files, CLI output, path
resolution, or overlay compatibility MUST update the relevant schema, manifests,
and user-facing documentation in the same change. Rationale: the product is a
composition system, so undocumented contract drift is a functional defect.

### III. Verification Before Merge
Every change MUST define and execute verification proportional to risk before
merge. Code changes MUST include automated test coverage or an explicit written
rationale when automation is not practical; changes to composition, generation,
or workflow scripts MUST include smoke or end-to-end validation when applicable.
Failing checks MUST block merge. Rationale: generated devcontainer output is only
trustworthy when the repository proves the behavior it claims.

### IV. Documentation Synchronization
User-visible behavior changes MUST update affected documentation, examples, and
the changelog in the same change set. Feature specs, plans, tasks, README-level
guidance, and contributor instructions MUST agree on file paths, workflow gates,
and required quality checks. Rationale: this repository is both tooling and
reference material; stale docs create incorrect environments and bad contributor
decisions.

### V. Simplicity and Compatibility
Implementations MUST prefer the simplest design that preserves existing
workflows, generated output editability, and dual-mode execution from source and
compiled `dist/` artifacts. New file resolution logic MUST use candidate-path
patterns compatible with both development and compiled layouts, and breaking
workflow changes MUST be justified explicitly in the spec and plan. Rationale:
the project’s value comes from composability and predictable regeneration, not
from hidden complexity.

## Implementation Constraints

- Specs for new work MUST live in `docs/specs/`; root-level `specs/` paths are
  non-compliant for new or updated feature workflows.
- A spec MUST include user scenarios, functional requirements, measurable success
  criteria, and review status before implementation tasks are created.
- Implementation plans MUST record constitution gates, compatibility impact,
  verification scope, and any complexity justification before coding starts.
- Task lists MUST separate spec/review readiness, implementation, verification,
  documentation, and changelog work so reviewers can audit compliance.
- User-visible behavior changes MUST add an `[Unreleased]` entry to
  `CHANGELOG.md` in the same change.

## Delivery Workflow

1. Create or update the feature spec in `docs/specs/<feature-branch>/spec.md`.
2. Commit the spec and obtain review before writing implementation code.
3. Produce `plan.md` and `tasks.md` in the same `docs/specs/<feature-branch>/`
   directory, with constitution gates and verification scope filled in.
4. Implement only the behavior approved by the reviewed spec; spec changes during
   implementation MUST be committed and reviewed before related code changes.
5. Before merge, re-run the constitution check, complete required verification,
   and update docs and changelog entries affected by the change.

## Governance

This constitution supersedes conflicting process guidance in repository docs and
templates. Amendments MUST be proposed as a documented change to this file,
include any required template or workflow updates, and be reviewed before
adoption.

Versioning policy:
- MAJOR: removes or redefines a principle or governance rule in a backward
  incompatible way.
- MINOR: adds a new principle, section, or materially stronger mandatory policy.
- PATCH: clarifies wording, fixes inconsistencies, or makes non-semantic edits.

Compliance review expectations:
- Every plan MUST pass the constitution check before design or implementation
  work proceeds.
- Every review of implementation changes MUST confirm the spec path, review gate,
  verification evidence, and documentation/changelog synchronization.
- Exceptions MUST be documented in the relevant spec and plan with a concrete
  rationale and approval from reviewers.

**Version**: 1.0.0 | **Ratified**: TODO(RATIFICATION_DATE): Original adoption date is not recorded in the repository. | **Last Amended**: 2026-03-10
