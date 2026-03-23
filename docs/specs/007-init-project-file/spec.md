# Spec: `init --project-file`

## Summary

Allow `container-superposition init` to optionally write a repository-root
project config file (`.superposition.yml` by default, or the existing supported
project config path when one already exists) alongside the normal init output.

## Requirements

- `init` MUST accept a `--project-file` flag.
- When `--project-file` is set, `init` MUST write a repository-root project
  config that reflects the final selected configuration for that run.
- If the repository already contains exactly one supported project config file,
  `init --project-file` MUST update that file instead of creating a second one.
- If no project config file exists, `init --project-file` MUST write
  `.superposition.yml` at the repository root.
- The written project config MUST include supported fields represented by the
  final init answers, including stack, base image, overlays, output path,
  target, minimal mode, editor profile, preset, and preset choices.
- `init --project-file` MUST continue to write `superposition.json` the same way
  current `init` runs do.
