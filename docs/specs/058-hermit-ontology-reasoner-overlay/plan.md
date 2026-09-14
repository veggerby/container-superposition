# Plan

## Scope

- Spec: `docs/specs/058-hermit-ontology-reasoner-overlay/spec.md`
- Source baseline: revision `4dceff2` plus the Interrogator-owned uncommitted spec/index additions in the current workspace.
- Delivery result: one additive built-in plain/dev overlay, `hermit`, using existing overlay dependency and script-composition behavior. No Compose service, port, category/schema semantic, Java default, or Fuseki behavior change is in scope.

## Technical Approach

- Ownership stays under `overlays/hermit/`; the existing overlay loader, dependency resolver, composer, generated-doc, and generated-schema paths consume it without new TypeScript production behavior.
- Declare `category: dev`, `supports: []`, `requires: [java]`, `suggests: [fuseki]`, no conflicts, no ports, and semantic-web/OWL/reasoner-oriented tags. This makes Java mandatory through existing dependency semantics while keeping Fuseki complementary and opt-in.
- Add a pinned `HERMIT_VERSION` parameter with default `1.4.5.519`. The setup hook will use Maven supplied by the required `java` overlay to resolve the exact Maven Central coordinate `net.sourceforge.owlapi:org.semanticweb.hermit:1.4.5.519` and its runtime dependency closure into a versioned installation directory, then install an idempotent `hermit` launcher on `PATH` that invokes `org.semanticweb.HermiT.cli.CommandLine` with that classpath.
- Keep `devcontainer.patch.json` to the required schema-bearing minimal patch; do not duplicate Java features/packages or add OS packages when Java's existing JDK and Maven capability is sufficient.
- Add a verification hook that checks `java`, `mvn`, the `hermit` launcher, and `hermit --version`; exercise an ontology consistency/classification command in implementation validation rather than creating a long-lived service.
- Document the Maven coordinate, default pin, runtime dependency resolution, installation/launcher locations, Java requirement, Fuseki distinction, license/source references, and command examples using workspace-local OWL files. Link directly to `../java/README.md` and `../fuseki/README.md`.

## Distribution and Executable Decision

- **Selected distribution:** Maven Central `net.sourceforge.owlapi:org.semanticweb.hermit:1.4.5.519`, resolved with a temporary minimal POM and a pinned Maven Dependency Plugin invocation. This is the latest/release version reported by Maven metadata and provides an immutable ecosystem coordinate plus published checksums/signatures.
- **Selected executable:** `/usr/local/bin/hermit`, a small repository-owned launcher over `java -cp '<versioned HermIT lib directory>/*' org.semanticweb.HermiT.cli.CommandLine "$@"`. Verify with `hermit --version`; common workflows use `hermit --consistency <ontology-IRI-or-file>` and `hermit --classify ...` according to upstream CLI options.
- **Why not `java -jar` on the selected Maven artifact:** inspection of `org.semanticweb.hermit-1.4.5.519.jar` found the CLI class and POM `mainClass`, but no JAR `Main-Class`; the Maven artifact also declares runtime dependencies. It therefore needs an explicit classpath rather than misleading `java -jar` guidance.
- **Rejected standalone alternative:** the upstream `HermiT.zip` does contain executable `HermiT.jar` with `Main-Class`, but the currently served file reports `Implementation-Version: 1.3.8.1099`, was last modified in 2013, is exposed through a moving `/current/` URL, and is materially older than Maven Central's `1.4.5.519` release. Its locally observed SHA-256 was `5ce30a35a1f02e933c262dfc976dd9e4e7bfe6c3e587c7bdaee6f57b97c814d0`, but no upstream-published SHA-256 was found.
- **Evidence consulted (2026-09-14):** Maven metadata and 1.4.5.519 POM/JAR/source under `https://repo1.maven.org/maven2/net/sourceforge/owlapi/org.semanticweb.hermit/`; upstream usage/download pages under `http://www.cs.ox.ac.uk/isg/tools/HermiT/`; `phillord/hermit-reasoner` README/POM; and the Dev Container Features catalog. No credible existing repository overlay, preset, or published Dev Container Feature candidate was identified.
- **Licensing:** upstream README/POM and JAR metadata identify LGPL-3.0 licensing. The overlay downloads rather than vendors the artifacts; documentation must preserve source/license attribution for reviewer assessment.

## Implementation Ladder Decision

- Chosen rung: **6 — adopt the existing HermiT distribution as an external runtime dependency**, with only small local installation/launcher glue.
- Lower rungs checked: no existing overlay or preset supplies ontology reasoning; `java` supplies only the runtime/build tooling; Java itself does not provide an OWL 2 DL reasoner; implementing a reasoner locally is out of scope; no suitable installed dependency or credible Dev Container Feature was found.
- Result: reuse existing overlay composition, dependency resolution, Maven, setup/verify hooks, and generated-artifact tooling. Add no Node dependency, shared abstraction, composer branch, category, or service.
- Non-negotiables: exact default version pin, HTTPS Maven resolution, fail-fast/idempotent setup, safe quoting and temporary-file cleanup, no credentials, no workspace ontology mutation, and explicit unsupported-download/setup failure.

## Ordered Steps

1. Create the required `overlays/hermit/overlay.yml`, minimal `devcontainer.patch.json`, and `README.md` using the metadata, dependency, distribution, documentation, and non-service boundaries above.
2. Add `setup.sh` that resolves the pinned Maven artifact and runtime dependencies into a versioned system location and installs the `hermit` launcher idempotently; add `verify.sh` for runtime, launcher, and version checks. Keep all install policy local to this overlay and reuse Java/Maven rather than changing `overlays/java/`.
3. Add focused Vitest coverage for HermIT metadata, `requires: [java]`, the pinned Maven coordinate/version and launcher contract, generated setup/verify hook registration, and absence of HermIT-owned Compose/port behavior. Reuse general loader/dependency tests rather than copying their implementation.
4. Add `overlays/hermit/tests/behave/hermit-overlay.feature` using shared steps to prove that selecting `hermit` is accepted in a plain project, auto-materializes the required Java feature and HermIT setup/verify scripts, registers lifecycle commands, and does not emit Compose output. This satisfies the BDD requirement rather than relying only on a justification.
5. Regenerate `docs/overlays.md` and the generated `tool/schema/*.schema.json` outputs from the new manifest; inspect diffs for a single new catalog option and no category/type semantic changes.
6. Add one consolidated HermIT overlay entry under `CHANGELOG.md` → `Unreleased` → `Added`, covering catalog discovery, Java dependency, pinned CLI distribution, and ontology workflow documentation.
7. Run targeted checks, an actual Java/container smoke when available, the full generated-artifact gate, packaging inspection, and independent review. Record command revision, environment, timestamp, exit code, generated diffs, skipped checks, and residual risk.

## Affected Areas and Boundaries

- `overlays/hermit/overlay.yml` — new catalog metadata, Java requirement, Fuseki suggestion, tags, and pinned version parameter.
- `overlays/hermit/devcontainer.patch.json` — required minimal schema-bearing patch; no service, port, or duplicate Java feature.
- `overlays/hermit/setup.sh` — Maven-backed pinned distribution installation and launcher creation.
- `overlays/hermit/verify.sh` — runtime/executable/version health check.
- `overlays/hermit/README.md` — packages/distribution/version/license details, OWL examples, and Java/Fuseki links and distinction.
- `overlays/hermit/tests/behave/hermit-overlay.feature` — user-visible discovery and generated-output behavior.
- `tool/__tests__/hermit-overlay.test.ts` (preferred focused file; a tightly scoped section in an existing overlay test is acceptable) — source contract and composition regression coverage.
- `docs/overlays.md` — generated catalog documentation; regenerate, never hand-edit.
- `tool/schema/superposition.schema.json`, `tool/schema/superposition.local.schema.json`, `tool/schema/superposition.global.schema.json` — generated outputs from `npm run schema:generate`; commit only files that actually change.
- `CHANGELOG.md` — consolidated Unreleased/Added entry.
- Explicitly unchanged: `overlays/java/**`, `overlays/fuseki/**`, `overlays/index.yml`, `tool/schema/types.ts`, `tool/questionnaire/composer.ts`, Compose/network code, and `dist/`.

## Validation Surface Discovered (DISCOVER)

- Manifest source: newly discovered from `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, `Taskfile.yml`, `package.json`, `.github/workflows/validate-overlays.yml`, nearby overlay tests, and the local `overlay-development` skill. No reusable spec-local validation manifest existed.
- Invalidation inputs: any change to the selected HermiT coordinate/version/launcher shape, Java overlay tooling, overlay dependency/composition behavior, package scripts/Taskfile, generated-doc/schema scripts, BDD harness, or CI workflow requires rediscovery.
- Build: `npm run build`; CI's overlay workflow runs this even though no TypeScript production change is expected.
- Typecheck/static analysis and lint/format: focused formatting during iteration, then mandatory `task validate` (which runs `lint:fix`, `lint`, and Vitest).
- Unit/contract: focused Vitest for HermIT source/composition plus existing `overlay-loader`, `dependency-resolution`, and composition coverage.
- Integration: actual Maven resolution and launcher execution are network/JDK-dependent and are not exercised by ordinary generation tests; validate in a built devcontainer or equivalent Java 21 + Maven environment.
- E2E/BDD: focused overlay-owned Behave feature during iteration; full `task test:bdd` through `task validate:generated` before handoff.
- Generated documentation/schema: `npm run docs:generate` and `npm run schema:generate`, generated diff review, then rerun through `task validate:generated`.
- Reproducibility/doctor: `npm run init -- regen` and `npm run init -- doctor`, included in `task validate:generated`; no Reproducibility errors permitted.
- Packaging: `npm pack --dry-run --json` and inspect the file list for all required `overlays/hermit/` runtime/docs files and generated reference/schema artifacts; no tarball should be committed.
- Documentation/link checks: manually resolve the Java/Fuseki relative links and upstream Maven/source/license links because no dedicated link checker was found.
- CI-only/broader: `.github/workflows/validate-overlays.yml` additionally runs `npm run test:smoke`; run locally if Docker/environment support exists or rely on CI with the skip and residual risk recorded.

### Selected Check Sequence

1. `npx vitest run tool/__tests__/hermit-overlay.test.ts tool/__tests__/overlay-loader.test.ts tool/__tests__/dependency-resolution.test.ts`
2. `npm run test:bdd -- overlays/hermit/tests/behave`
3. `npm run docs:generate && npm run schema:generate`, followed by generated diff review.
4. In a generated HermIT devcontainer (or equivalent clean Java 21/Maven environment): run `hermit --version`, `hermit --help`, and `hermit --consistency <small workspace OWL fixture>`; confirm an inconsistent fixture produces documented/understood behavior without mutating either file. Also confirm rebuilding is idempotent.
5. `npm pack --dry-run --json` and inspect package contents.
6. `npm run build` and, when locally practical, `npm run test:smoke`.
7. Final required gate: `task validate:generated`; review the final working-tree diff and doctor output.

### Acceptance-Criteria Evidence Plan

| Criterion | Planned evidence                                                                                                                                                      |
| --------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| AC-058-01 | Manifest assertions, `list`/loader visibility via focused tests/BDD, and generated `docs/overlays.md`/schema diffs.                                                   |
| AC-058-02 | Setup/launcher tests plus clean Java 21 container smoke using `--version`, `--help`, and ontology consistency.                                                        |
| AC-058-03 | Manifest `requires: [java]`, dependency-resolution assertion, and BDD evidence that the Java feature is materialized.                                                 |
| AC-058-04 | README review against the pinned Maven coordinate, runtime dependency mechanism, install locations, source, version, and license; setup contract test.                |
| AC-058-05 | Manual link resolution for HermIT README links to Java and Fuseki overlay READMEs and upstream references.                                                            |
| AC-058-06 | No diffs under Java/Fuseki, no HermIT Compose/port fields, existing test suite, and focused composition assertions; optional explicit HermIT+Fuseki generation smoke. |
| AC-058-07 | README examples for consistency/classification and explanation that Fuseki handles RDF storage/SPARQL while HermIT performs OWL reasoning.                            |
| AC-058-08 | Generated docs/schema diffs, `task validate:generated`, reproducible rerun, and doctor output with no Reproducibility errors.                                         |
| AC-058-09 | New overlay-owned Behave scenario and full BDD gate.                                                                                                                  |
| AC-058-10 | One consolidated `Unreleased` → `Added` changelog entry.                                                                                                              |

- Evidence profile: **Expanded**, because the externally resolved Java dependency and generated artifacts require provenance beyond static source tests.
- Checks not runnable locally must be marked `SKIPPED` with reason and residual risk; in particular, absence of Docker/network prevents the distribution smoke and cannot be represented as passing.

## Architecture and Design Quality

- Fit verdict: **PASS with dependency freshness risk**. The design uses the catalog/overlay source boundary named by the foundation, keeps project-file-first deterministic generation, and introduces no new cross-layer contract.
- Correctness/testability: static generation and dependency behavior are automated; live Maven/Java execution is a separate explicit smoke because BDD only materializes files.
- Simplicity/proportionality: one ordinary overlay and a launcher are sufficient; no new framework, shared helper, Compose service, or Java/Fuseki modification is justified.
- Security/data safety: exact coordinate and HTTPS reduce substitution risk; Maven Central transitive resolution remains an external supply-chain boundary. Setup must avoid `curl | sh`, secrets, and ontology-file mutation.
- Reliability/operability: versioned install path, fail-fast setup, cleanup, idempotence, and version verification are required. Network unavailability should fail with an actionable setup error, not silently install a partial launcher.
- Compatibility/performance: Java's existing JDK/Maven defaults are reused unchanged. Reasoning can be memory-intensive, so docs may show JVM tuning without imposing a global heap default.
- ADR impact: **none**. This is an additive ordinary overlay using established metadata, dependency, setup, generated-artifact, and review conventions; it does not establish a new durable architectural policy.

## Rollback / Containment

- Revert `overlays/hermit/`, the focused tests/BDD scenario, changelog entry, and regenerated docs/schema diffs together. Regenerate docs/schema after removal and run `task validate:generated` so no catalog receipt remains.
- Existing projects not selecting `hermit` are unaffected. Projects that selected it can remove `hermit` from canonical project config and run `regen`; `java` remains only if independently selected or required elsewhere.
- Do not roll back by hand-editing generated `.devcontainer/`, `docs/overlays.md`, schema JSON, `dist/`, Java, or Fuseki files.
- If Maven Central resolution or Java 21 compatibility fails during implementation validation, contain the change before review rather than switching distribution silently: mark execution blocked and route any requirement-affecting alternative back to Lead/Interrogator.

## Execution and Review Recommendation

- Execution profile: **Standard** — additive and localized, but includes an external Java artifact, setup lifecycle hook, generated outputs, packaging, and user-visible BDD behavior.
- Route: **direct implementation**, not diagnosis-first or fast path. The implementation boundary and distribution decision are sufficiently evidenced.
- Review gate: **INDEPENDENT**, matching spec metadata and warranted by external distribution provenance, license/supply-chain review, shell installation behavior, and live Java compatibility evidence.
- No ADR or human decision is currently required; implementation must stop and escalate if the selected Maven artifact cannot provide a working Java 21 CLI, licensing/source provenance conflicts emerge, or satisfying the ACs would require a service/category/schema semantic change.

## Open Questions

- None blocking. The version/distribution/executable ambiguity is resolved above from available evidence.

## Risks / Dependencies

- Maven Central reports `1.4.5.519` as latest but its metadata was last updated in 2020; this is stale upstream software even though it is newer and more reproducible than the 2013 standalone distribution. Independent review should explicitly accept fit for the requested HermIT-specific scope.
- Runtime transitive dependencies are resolved externally at devcontainer creation. Network outage, repository outage, or future repository policy may block first setup; exact coordinates should make successful resolutions repeatable but do not eliminate supply-chain risk.
- The selected Maven JAR is not directly executable with `java -jar`; launcher/classpath tests and live smoke are mandatory to avoid shipping documentation that follows the older standalone distribution shape.
- Java's manifest currently exposes ports 8080/8081. Those are normal effects of the required Java overlay, not HermIT-owned ports; tests/docs must not claim HermIT itself opens a port.
- Overlay setup and verify hooks become generated `postCreateCommand`/`postStartCommand` entries through existing composer behavior. Tests should verify this contract without introducing HermIT-specific composer logic.

## Implementation Notes

- Follow-up after independent review digest `c2caea893be82959e4719717e1445f67ef16f24610935579f135f0f766ce171a`: hardened `overlays/hermit/setup.sh` so `HERMIT_VERSION` is validated before Maven XML/coordinate use, artifact matching, filesystem path construction, or any `sudo` operation. The accepted version grammar is intentionally narrow (`[A-Za-z0-9][A-Za-z0-9._-]*`, max 128 chars) and rejects path separators plus `..`.
- Added a resolved-path containment check using `realpath -m` to ensure the versioned install directory remains under `/usr/local/share/hermit` before the script can remove/reinstall the directory.
- Added negative regression coverage that executes the setup script with traversal and malformed versions using stubbed `java`, `mvn`, and `sudo`; the test asserts failure occurs before Maven resolution or privileged setup.
- Live Java/Maven HermIT smoke was not run in this workspace because `java` and `mvn` are not installed on PATH; local Docker and repository smoke were available, so `npm run test:smoke` was run instead. Independent review should still rerun, and a real devcontainer Java/Maven smoke remains recommended where runtime/network are available.
- Follow-up after independent review rerun finding "Medium version rollback can preserve wrong global launcher": `setup.sh` now checks existing launchers for the selected versioned `${HERMIT_LIB_DIR}` before taking the idempotent shortcut, reinstalls stale launchers, and validates the newly installed launcher target. `verify.sh` now fails when `hermit` on `PATH` does not target the selected versioned library directory. Added focused Vitest regression coverage for stale B→A launcher rollback correction plus stale launcher detection, using a temp install root and stubbed Java/Maven/sudo toolchain.
