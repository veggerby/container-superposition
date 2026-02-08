---
applyTo: '**/*.md'
---

# GitHub Copilot Instructions: Documentation Standards

This file provides instructions for GitHub Copilot when creating or modifying documentation files across the project.

## File Naming Conventions

### Markdown Files

All markdown files MUST use **lowercase kebab-case** filenames, with the following exceptions:

**Standard Exceptions** (uppercase allowed):
- `README.md` - Project/directory documentation
- `CONTRIBUTING.md` - Contribution guidelines
- `CHANGELOG.md` - Version history
- `LICENSE.md` - License file
- `CODE_OF_CONDUCT.md` - Community guidelines
- `SECURITY.md` - Security policy

**All other markdown files MUST use lowercase kebab-case:**

✅ **Correct:**
- `messaging-comparison.md`
- `presets-architecture.md`
- `overlay-authoring.instructions.md`
- `quick-start.md`
- `api-reference.md`

❌ **Incorrect:**
- `MESSAGING-COMPARISON.md`
- `IMPLEMENTATION_SUMMARY.md`
- `API-REFERENCE.md`
- `QuickStart.md`
- `api_reference.md` (use kebab-case, not snake_case)

### Rationale

- **Consistency**: Easier to remember and navigate
- **Readability**: Lowercase is easier to read in file lists
- **URL-friendly**: Direct mapping to documentation sites
- **Case-sensitivity**: Avoids issues on case-sensitive filesystems

## Documentation Structure

### Location Guidelines

Documentation files should be organized by purpose:

**`/docs/` directory** - User-facing documentation:
- Architecture and design documents
- User guides and tutorials
- API references
- Comparison guides
- Workflow guides

**`/overlays/` directory** - Overlay-specific documentation:
- `README.md` only (following overlay-docs.instructions.md)
- No other markdown files in overlay directories

**`/.github/instructions/` directory** - Internal instructions:
- Copilot agent instructions
- Must end with `.instructions.md`
- Must use kebab-case before `.instructions.md`

**Root directory** - Project-level documentation:
- `README.md`
- `CONTRIBUTING.md`
- `CHANGELOG.md`
- `AGENTS.md` (agent configuration exception)

### Content Guidelines

#### Focus on Outcomes, Not Actions

Documentation should explain:
- **What** the feature/system does
- **How** it works (architecture/design)
- **Why** design decisions were made
- **When** to use it (use cases)

Documentation should NOT:
- List implementation steps taken ("First I did X, then Y")
- Include timestamps or dates of work
- Focus on development history
- Read like a changelog or commit log

**Example - Bad (action-focused):**

```markdown
# Feature Implementation

## What Was Done

1. Created schema.ts file ✅
2. Added PresetMetadata interface ✅
3. Modified composer.ts to support presets ✅
4. Updated questionnaire flow ✅

## Files Modified

- tool/schema/types.ts (+71 lines)
- scripts/init.ts (+129 lines)
```

**Example - Good (outcome-focused):**

```markdown
# Presets Architecture

## Overview

Presets are meta-overlays that combine multiple overlays
into pre-configured development environments.

## Design

The preset system uses a declarative YAML format...

### Type System

```typescript
interface PresetMetadata {
  // ...
}
```

### Composition Flow

1. User selects preset
2. Preset expands to overlay list
3. Normal composition proceeds
```

#### Use Proper Markdown Structure

- **Frontmatter**: Optional for metadata (YAML)
- **H1 (`#`)**: Document title (once per file)
- **H2 (`##`)**: Major sections
- **H3 (`###`)**: Subsections
- **H4 (`####`)**: Minor subsections (use sparingly)

#### Code Examples

Include working, copy-pasteable code examples:

```markdown
## Usage Example

\`\`\`bash
# Generate with preset
container-superposition --preset web-api
\`\`\`

## API Example

\`\`\`typescript
interface PresetMetadata {
  id: string;
  name: string;
}
\`\`\`
```

#### Internal Links

Use relative links for documentation cross-references:

```markdown
See [Overlay Authoring](creating-overlays.md) for details.

Reference the [RabbitMQ overlay](../overlays/rabbitmq/README.md).
```

## Documentation Types

### Architecture Documents

**Purpose**: Explain system design and technical decisions

**Naming**: `{feature}-architecture.md`

**Structure**:
1. Overview
2. Core concepts
3. Architecture/design
4. Integration points
5. Design patterns
6. Trade-offs
7. Future enhancements

**Example**: `presets-architecture.md`

### Comparison Guides

**Purpose**: Help users choose between alternatives

**Naming**: `{topic}-comparison.md`

**Structure**:
1. Quick comparison table
2. When to use each option
3. Performance characteristics
4. Decision tree
5. Integration examples

**Example**: `messaging-comparison.md`

### Workflow Guides

**Purpose**: Document end-to-end processes

**Naming**: `{workflow}-workflow.md`

**Structure**:
1. Overview
2. Prerequisites
3. Step-by-step instructions
4. Common patterns
5. Troubleshooting

**Example**: `observability-workflow.md`

### Quick Reference

**Purpose**: Cheat sheets and command references

**Naming**: `{topic}-quick-reference.md` or `quick-reference.md`

**Structure**:
- Concise command tables
- Common patterns
- Tips and tricks

**Example**: `quick-reference.md`

## Tone and Style

### Voice

- **Clear and direct**: Avoid unnecessary words
- **Present tense**: "The system uses" not "The system will use"
- **Active voice**: "Composer applies patches" not "Patches are applied"
- **Professional**: Avoid slang, emojis in prose (✅ in lists OK)

### Terminology

Use consistent terminology:

- **Overlay** (not "module", "plugin", "extension")
- **Preset** (not "meta-overlay" in user docs)
- **Devcontainer** (not "dev container", "DevContainer")
- **Compose** (not "Docker Compose", when referring to stack type)

### Code Formatting

- **Inline code**: \`filename.ts\`, \`variableName\`, \`--flag\`
- **Code blocks**: Use language identifiers (\`\`\`bash, \`\`\`typescript\`)
- **Commands**: Show with prompt when helpful (`$ command` or `# command`)
- **Outputs**: Show expected results when relevant

## Maintenance

### Updating Documentation

When modifying features:

1. **Update architecture docs** if design changes
2. **Update user guides** if usage changes
3. **Update examples** if APIs change
4. **Update cross-references** if files move/rename

### Deprecation

When deprecating features:

1. Add deprecation notice at top of document
2. Link to replacement documentation
3. Keep deprecated docs for one version cycle
4. Remove after feature is fully removed

**Example:**

```markdown
# Old Feature (Deprecated)

> **⚠️ Deprecated**: This feature is deprecated and will be removed in v2.0.
> Use [New Feature](new-feature.md) instead.
```

## Quality Checklist

Before submitting documentation:

- [ ] Filename uses lowercase kebab-case (or is standard exception)
- [ ] File is in correct directory (/docs, /overlays, /.github)
- [ ] Content focuses on outcomes, not implementation actions
- [ ] Code examples are working and copy-pasteable
- [ ] Internal links use relative paths
- [ ] Proper markdown structure (H1, H2, H3)
- [ ] No TODO or FIXME comments in production docs
- [ ] Spell-checked (technical terms excluded)
- [ ] Cross-references updated if moving/renaming

## See Also

- [Overlay Documentation Standards](overlay-docs.instructions.md)
- [Overlay Authoring Standards](overlay-authoring.instructions.md)
- [Contributing Guidelines](../../CONTRIBUTING.md)
