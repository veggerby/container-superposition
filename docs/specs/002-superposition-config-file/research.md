# Research: Project Configuration File

## Decision 1: Treat project config as a partial-answer source in the existing init flow

**Decision**: Load `.superposition.yml` or `superposition.yml` into the same
partial-answer merge flow already used for direct command input and manifest
translation.

**Rationale**: The repository already has `QuestionnaireAnswers`,
`buildAnswersFromCliArgs`, `buildAnswersFromManifest`, and `mergeAnswers`.
Reusing that path keeps generation behavior aligned across interactive, CLI,
manifest, and project-config inputs.

**Alternatives considered**:

- Build a separate config-only generation pipeline: rejected because it would
  duplicate behavior and drift from the main generation path.
- Translate project config into a manifest before generation: rejected because
  the project config is intended to be the human-authored source of intent, not
  a derived artifact.

## Decision 2: Keep explicit manifest mode separate from project-config defaults

**Decision**: Project config is the default persisted input source for standard
initialization, but explicit manifest-based runs remain a separate mode and do
not merge project-config values silently.

**Rationale**: The feature spec explicitly preserves manifest-based regeneration
as a separate path. Mixing the two persisted inputs would make source-of-truth
selection ambiguous and weaken predictability.

**Alternatives considered**:

- Always merge project config into manifest-based runs: rejected because explicit
  manifest input is a stronger per-run instruction.
- Replace manifest workflows entirely: rejected because it would break existing
  regeneration behavior and expand scope.

## Decision 3: Define parity in terms of supported clean-generation inputs

**Decision**: “Full parity” means every currently supported clean-generation
input that materially affects generated output can be declared in the project
config file, including customization surfaces such as custom images,
editor/minimal settings, preset glue, environment-related settings, and
additional generated features already represented by the generation flow.

**Rationale**: The user value is not just basic overlay selection; it is a
declarative source of truth for the full supported generation surface. Limiting
project config to a subset would force teams back to long commands for the most
important customizations.

**Alternatives considered**:

- Support only stack and overlays first: rejected because it would not satisfy
  the parity requirement in the approved spec.
- Allow arbitrary raw devcontainer fragments in project config: rejected because
  it would blur the boundary between supported generation inputs and unmanaged
  custom output.

## Decision 4: Restrict discovery to the repository root and fail on dual-file ambiguity

**Decision**: Discover project config only in the current repository root and
fail if both supported filenames exist.

**Rationale**: The feature is explicitly project-level. Root-only discovery is
predictable for local workflows and CI, and dual-file failure preserves a
single visible source of truth.

**Alternatives considered**:

- Search parent directories: rejected because it risks binding nested work to
  the wrong config.
- Prefer one filename silently: rejected because ambiguity should be surfaced,
  not hidden.

## Decision 5: Validation must happen before generation and name the offending config entry

**Decision**: Project-config validation fails before generation begins and
reports syntax errors, unsupported keys, unsupported values, conflicts, missing
required values, and ambiguity in terms of the file content or repository state
the user must correct.

**Rationale**: Declarative workflows are only trustworthy if failures point back
to the committed source of truth rather than forcing users to infer hidden merge
behavior.

**Alternatives considered**:

- Let composition fail later: rejected because it hides whether the problem is
  config input or generation logic.
- Ignore unknown keys: rejected because it would make committed config content
  misleading.

## Decision 6: Verification must include parity cases, not only happy-path loading

**Decision**: Verification covers clean-generation parity for supported
customization inputs in addition to discovery, precedence, and validation
behavior.

**Rationale**: The highest-risk regressions are cases where project config loads
but silently loses part of the intended output surface, especially customization
settings that teams expect to be declarative.

**Alternatives considered**:

- Test only project-config discovery: rejected because discovery alone does not
  prove parity.
- Rely on manual parity checks only: rejected because user-visible generation
  behavior needs automated regression protection.
