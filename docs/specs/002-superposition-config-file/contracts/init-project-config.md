# Contract: Init Project Config

## Purpose

Define the user-facing contract for repository-root project config input during
`init` runs.

## Supported Files

Exactly one of these files may be used at the repository root:

- `.superposition.yml`
- `superposition.yml`

If both exist, initialization fails before generation.

## Supported Declaration Surface

The project config file may declare every supported clean-generation input that
materially affects generated output, including:

- stack selection
- base image and custom image selection
- container name
- preset selection and preset parameters
- overlay selections by category
- output path
- port offset
- target environment
- minimal/editor settings
- supported customization inputs such as environment-related settings, custom
  container definitions, preset glue values, and additional generated features

## Resolution Rules

### Standard Initialization

1. Discover a supported project config file in the repository root.
2. Validate the file and stop on any ambiguity or invalid entries.
3. Apply project config values as the default persisted input source.
4. Apply any direct command input as run-specific overrides.
5. Collect only still-missing required values through the existing flow.

### Explicit Manifest Initialization

1. Load the explicit manifest as the run’s persisted input source.
2. Apply any direct command input as run-specific overrides.
3. Do not silently merge repository project config values into that run.

## Parity Requirement

If a generation input is supported through the existing clean-generation path
and materially affects generated output, it must be expressible through the
project config file and yield the same final generated output.

## Error Conditions

Initialization must fail before generation when any of the following occur:

- both supported project config filenames exist
- the file cannot be parsed
- unsupported keys or values are declared
- conflicting selections are declared
- a required value is missing in a non-interactive context
- a declared customization input is outside the supported clean-generation
  surface

## Verification Expectations

- Valid project config yields the same output as equivalent direct user
  selections.
- Supported customization inputs round-trip through project config without
  losing parity.
- Missing project config preserves current interactive and flag-driven
  behavior.
- Explicit manifest runs remain isolated from project-config defaults.
