# Data Model: Project Configuration File

## Entity: ProjectConfigFile

**Purpose**: Represents the repository-root YAML document that declares shared
generation intent for a project.

**Fields**:

- `path`: Absolute path to the discovered file.
- `fileName`: `.superposition.yml` or `superposition.yml`.
- `declaredValues`: Parsed user-authored generation inputs.
- `status`: `missing`, `loaded`, `invalid`, or `ambiguous`.

**Validation rules**:

- At most one supported config filename may exist in the repository root.
- The file must be valid YAML.
- The file may declare only supported clean-generation inputs.

## Entity: ProjectConfigSelection

**Purpose**: Represents the set of supported generation inputs declared in the
project config file.

**Fields**:

- `stack`
- `baseImage`
- `customImage`
- `containerName`
- `preset`
- `presetChoices`
- `language`
- `database`
- `observability`
- `cloudTools`
- `devTools`
- `playwright`
- `outputPath`
- `portOffset`
- `target`
- `minimal`
- `editor`
- `customizationInputs`
- `sourceMode`

**Validation rules**:

- Values must follow the same supported set as equivalent direct command or
  interactive inputs.
- Customization-related inputs must map to supported clean-generation behavior,
  not unmanaged arbitrary output fragments.
- Partial definitions are allowed, but unresolved required values must remain
  completable through the existing flow.

## Entity: CustomizationInput

**Purpose**: Represents a supported non-basic generation setting that changes
the final generated output beyond simple stack or overlay selection.

**Fields**:

- `kind`: category of customization input
- `name`: user-facing identifier for the customization
- `value`: declared value
- `source`: `project-config`, `cli`, `manifest`, or `interactive`

**Examples**:

- custom container definition
- environment-related setting
- preset glue configuration
- editor/minimal customization
- additional generated feature setting

**Validation rules**:

- The customization must already be part of the supported clean-generation
  surface.
- The customization must round-trip through generation without being dropped or
  silently rewritten to a different meaning.

## Entity: EffectiveGenerationRequest

**Purpose**: Represents the final resolved inputs for one generation run.

**Fields**:

- `sourceMode`: standard init, explicit project-file init, implicit project-file
  regen, explicit manifest init, or standard init with direct overrides
- `resolvedValues`: final merged `QuestionnaireAnswers`-equivalent values
- `overrideSources`: per-field record of which source won precedence

**Relationships**:

- May derive from one `ProjectConfigSelection`
- May derive from one explicit manifest input
- May include many `CustomizationInput` values

## Entity: ValidationIssue

**Purpose**: Represents one user-facing problem found while loading the project
config file.

**Fields**:

- `scope`: `discovery`, `syntax`, `field`, `selection`, `conflict`, `ambiguity`
- `location`: file or config entry reference
- `message`: user-facing description
- `suggestedFix`: corrective action

**State transitions**:

- `detected` -> `reported`
- `reported` -> `resolved by config edit`

## Relationship Summary

- One repository has zero or one `ProjectConfigFile`.
- One `ProjectConfigFile` may contain one `ProjectConfigSelection`.
- One `ProjectConfigSelection` may contain many `CustomizationInput` values.
- One `EffectiveGenerationRequest` merges values from supported sources and
  feeds generation plus manifest output.
- One `EffectiveGenerationRequest` must resolve exactly one persisted-input
  source mode before generation starts.
