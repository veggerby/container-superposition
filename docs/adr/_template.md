---
id: adr-000
title: '[Short descriptive title]'
description: '[One-sentence description of the decision]'
category: '[Application Architecture | Domain Model & Semantics | Data & Persistence | API & Integration Contracts | Frontend Experience & UX Composition | Security & Privacy | Performance & Scalability | Reliability & Resilience | Observability & Operations | Delivery & Developer Experience | Rejected]'
status: '[reserved | proposed | rejected | adopted | deprecated | superseded]'
date: '[YYYY-MM-DD]'
review_date: '[YYYY-MM-DD or blank]'
pr: ''
deciders:
    - '[Name or @handle]'
relationships: {}
# depends_on:
#   - [adrXXX-filename]
# extends:
#   - [adrXXX-filename]
# implements:
#   - [adrXXX-filename]
# leads_to:
#   - [adrXXX-filename]
# supports:
#   - [adrXXX-filename]
# aligns_with:
#   - [adrXXX-filename]
# clarifies:
#   - [adrXXX-filename]
# complements:
#   - [adrXXX-filename]
# superseded_by:
#   - [adrXXX-filename]
---

<!--
## Create an ADR
1. Copy `docs/adr/_template.md` to `docs/adr/adrXXX-my-decision.md` (assign ADR number when ready)
1. Fill in the front matter YAML
1. Keep the ADR focused on one architectural decision or one tightly-coupled decision set
1. Read `docs/foundation.md` first and ensure the ADR aligns with or explicitly updates those baseline rules
1. Prefer repository-specific terminology from the project context docs, the current specs, and finalized normative references
1. If the ADR changes a standing rule, update any superseded ADR metadata in the same change

## Supersede an ADR
1. Update the older ADR status to `superseded`
1. Add a `superseded_by` relationship in the older ADR
1. Add a `clarifies` or `supersedes` relationship in the new ADR when appropriate
-->

## Context

[Describe the current system and the part affected: application architecture, domain semantics, storage, APIs, integrations, UX composition, runtime operations, delivery pipeline, etc.]

## Problem

[State the architectural problem or decision question clearly. Prefer one question that the ADR answers decisively.]

## Decision Drivers <!-- optional -->

- [driver 1, e.g., append-only event sourcing is non-negotiable]
- [driver 2, e.g., planning surfaces must share canonical read semantics]
- [driver 3, e.g., frontend must not import backend route logic directly]

## Constraints and Assumptions

- [constraint or assumption 1]
- [constraint or assumption 2]

## Considered Options

- [option 1]
- [option 2]
- [option 3]

## Decision

Chosen option: "[option 1]".

[Describe the decision in direct, normative language. Use "must", "must not", and "may" where needed. If useful, split this into subsections such as layering, ownership, contracts, or lifecycle.]

## Required Architecture / Rules

### Ownership and Boundaries

- [Which layer, module, or service owns what]

### Allowed Dependencies

- [Which directions dependencies may flow]

### Forbidden Couplings

- [What must not happen]

### Contracts and Interfaces

- [API, event, data, integration, or service expectations]

## Quality Attribute Impact <!-- optional -->

### Security and Privacy

- [security implications]

### Performance and Scalability

- [performance implications]

### Reliability and Resilience

- [resilience implications]

### Maintainability and Evolvability

- [maintainability implications]

### Observability and Operations

- [observability implications]

## Consequences

### Positive Consequences <!-- optional -->

- [benefit 1]
- [benefit 2]

### Negative Consequences <!-- optional -->

- [cost 1]
- [cost 2]

## Implementation Impact <!-- optional -->

- [required follow-up 1]
- [required follow-up 2]

## Compliance Signals <!-- optional -->

We will consider this ADR implemented when:

- [observable signal 1]
- [observable signal 2]

## Revisit Conditions <!-- optional -->

- [condition 1]
- [condition 2]

## Links <!-- optional -->

- [Related doc or ADR]
