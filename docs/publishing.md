# Publishing to npm

`container-superposition` is published by the repository's GitHub Actions workflow using npm trusted publishing and OIDC. Do not add an npm token, registry secret, or manual token-based fallback.

## Final releases

Final releases are the only path that updates npm's `latest` tag.

1. Update `CHANGELOG.md`.
2. Create and publish a GitHub Release with a semver tag such as `v0.1.13`.
3. The release workflow validates the tag, installs dependencies, lints, builds, generates the schema, tests, previews the package, and publishes with provenance.

After a successful publish, the workflow summary includes exact-version install commands and the workflow updates an associated PR comment when it finds one. Verify the final release with:

```bash
npm view container-superposition@<version> version
npm view container-superposition@latest version
```

## Staged prereleases from `main`

The shared npm `prerelease` tag is only updated by a publish-worthy push already merged to `main`. It is a staging channel for the newest merged main build, never a PR build.

A main push is publish-worthy when it changes one or more of:

- `package.json`, `package-lock.json`, `.npmignore`, or `tsconfig.json`
- `scripts/**` or non-test `tool/**`
- `templates/**`, `features/**`, `overlays/**`, or `docs/**/*.md`
- `README.md` or `LICENSE`

Test-only `tool` changes, `CHANGELOG.md`-only changes, workflow-only changes, and other maintenance-only pushes run the classifier but skip the staged-prerelease publication successfully. A push that contains both excluded and listed paths is publish-worthy.

Each eligible push publishes a unique `{base}-main.{run_id}` version directly with the shared `prerelease` tag. After success, use either the immutable version from the workflow summary or the moving shared channel:

```bash
npm install container-superposition@<exact-version>
npx container-superposition@<exact-version> regen

npm install container-superposition@prerelease
npx container-superposition@prerelease regen
```

## Manual PR-scoped packages

Pull request events never publish npm packages, update `@prerelease`, update `@latest`, or create prerelease PR comments. When a maintainer needs to test a PR package before merge, they must explicitly run **Publish to npm** with **Run workflow**, select the trusted `main` workflow ref, and provide both the numeric `pr_number` and the intended 40-hex `expected_head_sha`.

An unprivileged preparation job validates both inputs, resolves the selected PR's current immutable head SHA, and stops before checkout if it differs from `expected_head_sha`. It checks out that verified SHA, builds and packs it, then transfers only the tarball and checksum as a same-run artifact. A separate OIDC publisher does not check out or run PR code: it validates the archive, checksum, package name, and version, then publishes the explicit tarball with lifecycle scripts disabled. It publishes `{base}-pr.{number}.{run_id}` directly under the mutable `pr-{number}` tag. The exact version and tag are both PR-scoped:

```bash
npm install container-superposition@<exact-version>
npx container-superposition@<exact-version> regen

npm install container-superposition@pr-<number>
npx container-superposition@pr-<number> regen
```

`pr-<number>` is not the shared `@prerelease` channel and does not update `@latest`. Manual dispatch is an external publishing action; use it only when the PR package itself needs validation.

## Maintainer checks

Before a final release or when investigating package contents, run:

```bash
npm test
npm run build
npm pack --dry-run
```

For locally produced package output, inspect the dry-run list rather than publishing manually. The release workflow is the canonical OIDC-backed publication path.

## Troubleshooting

If a published version is not immediately visible, npm registry propagation may be delayed. Check the exact version first:

```bash
npm view container-superposition@<exact-version> version
```

Use `@prerelease` only to inspect the newest eligible merged-main staging build. Use `@pr-<number>` only to inspect the selected manually dispatched PR package.
