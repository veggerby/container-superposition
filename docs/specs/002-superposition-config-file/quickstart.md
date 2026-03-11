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

## 6. Preserve explicit manifest regeneration

```bash
npm run init -- --from-manifest ./.devcontainer/superposition.json --no-interactive
```

Expected result:

- the manifest remains the persisted input source for that run
- repository project config does not silently override it

## 7. Validate parity for supported customization inputs

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
