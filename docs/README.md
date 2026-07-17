# Container Superposition Documentation

Container Superposition is a project-file-first devcontainer generator.
Commit `superposition.yml` (or `.superposition.yml`) as shared intent, preview changes before writing, and use `regen` to replay that intent into normal `.devcontainer/` output.

## Spec-First Development

Feature work is governed by specs committed under `docs/specs/`. Implementation must not begin until the relevant spec is committed and reviewed.

## Start Here

### User workflow

1. [Quick Reference](quick-reference.md) — command lookup and common flags
2. [superposition.yml Reference](superposition-yml.md) — canonical project file format
3. [Workflows and Regeneration](workflows.md) — preview, init, regen, migrate, and adopt flows
4. [Examples](examples.md) — worked examples and patterns
5. [Adopt Command](adopt.md) — convert an existing handwritten `.devcontainer/`
6. [Presets Guide](presets.md) — optional shortcuts for common setups

### Architecture and repository authority

- [Foundation](foundation.md) — current architectural authority and ownership boundaries
- [ADR Index](adr/README.md) — standing architecture decisions
- [Architecture](architecture.md) — historical design context; confirm live behavior against `foundation.md` and ADRs
- [Definition of Done](definition-of-done.md) — quality gates and workflow expectations
- [Spec Index](specs/README.md) — approved and draft feature specs

### Additional guides

- [Filesystem Contract](filesystem-contract.md) — what the tool writes and what to edit
- [Hash Command](hash.md) — semantic fingerprinting
- [Messaging Comparison](messaging-comparison.md) — choosing a messaging overlay
- [Messaging Quick Start](messaging-quick-start.md) — messaging setup walkthrough
- [Observability Workflow](observability-workflow.md) — monitoring and tracing workflow
- [Security Considerations](security.md) — development-time risks and guardrails
- [Publishing Guide](publishing.md) — release and npm publishing flow
- [Creating Overlays](creating-overlays.md) — maintainer overlay authoring guide
- [Contributing](../CONTRIBUTING.md) — contributor workflow
- [AGENTS.md](../AGENTS.md) — repository instructions for coding agents and automation

## Recommended command flow

```bash
# Discover what exists
npx container-superposition list
npx container-superposition explain postgres

# Preview before writing
npx container-superposition plan --stack compose --overlays nodejs,postgres
npx container-superposition plan --stack compose --overlays grafana --verbose

# Write shared intent and generated output
npx container-superposition init

# Replay committed shared intent later
npx container-superposition regen
```
