# Quickstart: Project Configuration File

## Goal

Use a committed repository-root config file to declare the same supported setup
intent that users would otherwise provide through clean generation commands.

## 1. Add one project config file at the repository root

Choose exactly one:

- `.superposition.yml`
- `superposition.yml`

Do not keep both in the same repository.

## 2. Declare the intended environment

Define the supported clean-generation inputs your project needs, such as:

- stack
- overlays
- presets and preset parameters
- output path
- custom image or container definition
- environment-related settings
- additional generated features and other supported customization inputs

## 3. Run standard initialization

```bash
npm run init
```

Expected result:

- the project config file supplies default generation intent
- only still-missing required values are collected interactively
- the generated output matches the declared setup and supported customization
  settings

## 4. Override a value for one run

```bash
npm run init -- --output ./tmp-devcontainer
```

Expected result:

- the direct command value wins for that run only
- the committed project config remains the default source of truth

## 5. Use the same config in automation

Run initialization from CI or another scripted workflow in a repository that
contains the committed project config.

Expected result:

- non-interactive runs use declared defaults without prompting for already
  declared values
- repeated runs resolve the same configuration

## 6. Regenerate from the project file

```bash
npm run init -- regen
```

Expected result:

- `regen` uses the repository project file when one exists
- the command does not require `--from-project` in that default case
- the generated output matches the project file's declared intent

## 7. Preserve explicit manifest regeneration

```bash
npm run init -- --from-manifest ./.devcontainer/superposition.json --no-interactive
```

Expected result:

- the manifest remains the persisted input source for that run
- repository project config does not silently override it

## 8. Reject conflicting source modes early

```bash
npm run init -- init --from-project --stack compose
```

Expected result:

- the command fails before generation
- the error explains that persisted-input source flags cannot be mixed with
  clean-generation selection flags

## 9. Validate parity for supported customization inputs

For any supported customization input that can be expressed through the existing
clean-generation path:

- declare it in the project config file
- run generation
- confirm the final generated output matches the equivalent clean-generation
  result

Examples of parity checks:

- custom image or container definition
- environment-related settings
- preset glue values
- additional generated features

## 10. Maintainer workflow review

Review result for `SC-003`:

- a maintainer can create or update `.superposition.yml`, run `npm run init -- --no-interactive`, and inspect the generated output without reconstructing a long command
- the documented workflow keeps the committed project config as the source of truth while still allowing one-run CLI overrides

## 11. Verification record

Validated during implementation:

- targeted regression tests for project-config discovery, precedence, manifest isolation, no-config fallback, and customization parity
- targeted regression tests for explicit `--from-project`, implicit project-file
  `regen`, and source-conflict validation
- `npm test`
- `npm run lint`
- `npm run test:smoke`

Observed outcomes:

- valid project-config driven runs generated the expected manifest and devcontainer output
- `regen` used the repository project file by default when present and still
  allowed explicit manifest-based regeneration
- `--no-interactive` now works with a repository-root project config and still fails without any persisted input source
- explicit `--from-manifest` runs ignored repository project-config defaults as required
