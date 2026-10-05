# Spec 030 Current-Guidance Inventory

## Authorized completion amendment

The diagnosis below is preserved as historical evidence, not the final correction
boundary. Its ten-file proposal was rejected twice: the second pre-edit review
found wrong root-receipt paths in `docs/filesystem-contract.md` and
`docs/team-workflow.md`. An independent expanded-root review also identified
category-flag examples in `CONTRIBUTING.md`. The user's instruction to finish
Spec 030 from this tree authorizes correcting all remaining findings rather than
accepting the residual risk. The expanded correction batch covers **14 guidance files**: the original ten
listed below, the three omitted files, and `docs/presets.md` after independent
final-tree review found a conflicting runnable example. The owning inventory
and workflow records are updated separately from the guidance files.

The expanded tracked-root check adds root contributor/user guides, `.github/`
guides, `examples/`, `features/`, and `tool/` to the original boundary. The
reproducible path enumeration used for this amendment is:

```bash
{
  find docs .github/instructions .pi templates -type f -name '*.md'
  find overlays -mindepth 2 -maxdepth 2 -type f -name README.md
  git ls-files '*.md' | grep -vE '^(docs/|\.github/instructions/|\.pi/|templates/|overlays/)'
} | sort -u > /tmp/spec030-expanded.txt
wc -l /tmp/spec030-expanded.txt
sha256sum /tmp/spec030-expanded.txt
```

It produced **274 paths**, SHA-256
`11f62b1c871e8ac958e2858d95b121c149c719120b188dad6c9706fed807cc03`
at correction start; the original boundary remained **260 paths** with hash
`80ba7a6dab6e30a5dc38a26b51ac9992e753bc5cd5db821f911839df9cd0fd58`.
The additional tracked Markdown signals were reviewed: `README.md`,
`tool/README.md`, `.github/copilot-instructions.md`, `AGENTS.md`,
`CHANGELOG.md`, `examples/**`, and `features/**` add no current category/manifest
conflict to this batch. `CONTRIBUTING.md` has two unlabelled category-flag recommendations
at the pre-edit lines 311 and 452 and is the thirteenth correction. The normal
receipt is generated at `.devcontainer/superposition.json` by default; root
receipts are specific to conversion flows such as `adopt`. The two previously
misclassified docs are corrected accordingly.

The first final-tree independent review also caught `docs/presets.md`: its
otherwise canonical `plan` example combined `nodejs` and `grafana`, which the
live CLI marks as conflicting. The corrected example uses the verified
`python,postgres,redis,otel-collector,prometheus,grafana,loki` selection. The
same review caught a duplicate candidate changelog entry inside released
`0.1.13`; the unreleased entry remains and the duplicate was removed.

The ten-file list, old classifications of the two receipt docs, old prohibition
on editing other files, and old pre-edit approval blocker below are **superseded**
by this amendment and the independent expanded-root review. Historical counts
remain provenance of the earlier, insufficient query, not a claim that it
exhausts all first-party guidance. Final validation and review dispositions
belong in `artifacts/implementation-evidence.md` and `review-gate.md`.

## Purpose and decision

This is the finite pre-edit inventory requested after the independent gate rejected
the earlier six-file boundary. It diagnoses the recurring AC-4/AC-6 evidence gap;
it does **not** correct documentation, code, tests, generated output, status fields,
or the independent review verdict.

- Convergence decision: **REPLAN**. The gate exposed a new bounded inventory-evidence
  gap before another correction began: the prior query omitted current product-template
  and overlay README roots and did not search `--observability` / `--cloud`.
- Result: ten current conflicts form the exact proposed correction batch. All six
  reviewer-named surfaces are accounted for: five are current conflicts and
  `docs/architecture.md` is explicitly historical. Five previously diagnosed
  conflicts remain inside the same finite boundary.
- Execution profile recommendation: **Governed**.
- Route recommendation: diagnosis/inventory first (this artifact), then direct
  documentation correction only after **independent pre-edit inventory approval**;
  return the corrected candidate to **INDEPENDENT** review.
- Review mode for this artifact: **SELF_CHECK**.
- Existing gate remains authoritative: `CHANGES_REQUESTED`, execution `BLOCKED`,
  integration `NOT_READY`, risk `PENDING_ACCEPTANCE`.

## Provenance

| Item                              | Value                                                                                                                                                      |
| --------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Recorded UTC                      | `2026-10-05T08:26:21Z`                                                                                                                                     |
| Git revision / branch             | `12f3dd65f1b56258a834ff5a946c26d852fbf8b7` / `main`                                                                                                        |
| Working tree                      | Intentionally non-clean partial candidate preserved; before this replan, 32 tracked paths differed from `HEAD` and one spec-local inventory was untracked. |
| Pre-edit tracked-tree fingerprint | `8780049ea2e9037899da016806f9b7280d245cdd9bf6e7250f0b26ee20c1c91c` (`git diff --no-ext-diff HEAD \| sha256sum`)                                            |
| Authority read                    | `AGENTS.md`, `docs/foundation.md`, `docs/definition-of-done.md`, ADR 001, Spec 030, `plan.md`, `review-gate.md`, and this prior inventory                  |
| Required special inspection       | `docs/architecture.md`, because only `docs/README.md` labels it historical                                                                                 |
| Local procedures                  | `plan-change`, `assess-delivery-convergence`, `canonical-docs-alignment`, `workflow-sync`, and `overlay-development`                                       |

## Finite boundary and exclusions

### Included roots

The inventory boundary is exactly:

1. every Markdown file under `docs/`;
2. every Markdown file under `.github/instructions/`;
3. every Markdown file under `.pi/`;
4. every Markdown file under `templates/`; and
5. every direct overlay README matching `overlays/*/README.md`, including
   dot-prefixed support directories matched by `find`.

The raw boundary contains **260 paths**. Its sorted path-list SHA-256 is
`80ba7a6dab6e30a5dc38a26b51ac9992e753bc5cd5db821f911839df9cd0fd58`.
After the path exclusions below, **151 paths** remain eligible for the diagnostic
query; their sorted path-list SHA-256 is
`c9bd31770310da8e4c718b2246ae768e400641b963515d5e25920bffd2d832b8`.

A surface is **Current conflict** when it gives an unlabelled current command or
imperative workflow that teaches category flags, legacy index registration, or
manifest-first authority instead of project-file-first flat `overlays:` guidance.
A surface is **Current aligned** when its current instruction is consistent with
that authority, including clearly labelled compatibility/migration or specialised
command context. A file with no current recommendation is not upgraded to guidance
merely because it contains a historical example or vocabulary reference.

### Explicit path/content exclusions

- `docs/specs/**` — task history, plans, gates, and evidence; the owning Spec 030
  artifacts are authority inputs, not correction candidates.
- `docs/adr/**` — decision history/authority, not current command walkthroughs.
- `docs/roadmap.md` and `docs/opportunities/**` — portfolio/history rather than
  command instruction.
- Documentation templates such as `docs/specs/_*_template.md`,
  `docs/adr/_adr_template.md`, and `docs/opportunities/opportunity-template.md`
  when they contain no current command instruction.
- **Not excluded:** the product-input root `templates/**`. Its READMEs are current
  guidance and were the key false negative caused by the former `!**/*template*`
  glob.
- `docs/architecture.md` was manually inspected despite the exclusions. It contains
  obsolete workflow statements, but `docs/README.md:27` explicitly labels the whole
  file “historical design context” and directs readers to the foundation/ADRs.
  Classification: **Excluded historical; no correction in this batch**.
- `.github/instructions/changelog.instructions.md` has matching category flags only
  in historical/deprecation examples. `docs/abbreviations.md` is vocabulary
  reference. Classification for both: **Excluded reference/history; no current
  workflow correction**.

## Reproducible path enumeration and diagnostic query

Run from repository root. This first records the complete boundary, then applies
only the explicit history/portfolio exclusions. It deliberately includes
`templates/` and overlay READMEs and searches `--observability` and `--cloud`.

```bash
{
  find docs -type f -name '*.md' -print
  find .github/instructions .pi templates -type f -name '*.md' -print
  find overlays -mindepth 2 -maxdepth 2 -type f -name README.md -print
} | sort -u > /tmp/spec030-boundary.txt

{
  find docs -type f -name '*.md' \
    ! -path 'docs/specs/*' \
    ! -path 'docs/adr/*' \
    ! -path 'docs/opportunities/*' \
    ! -path 'docs/roadmap.md' -print
  find .github/instructions .pi templates -type f -name '*.md' -print
  find overlays -mindepth 2 -maxdepth 2 -type f -name README.md -print
} | sort -u > /tmp/spec030-eligible.txt

xargs rg -l -i \
  -e '(npm run init --|\b(?:container-superposition|npx container-superposition|cs)\s+(?:list|explain|plan|init|regen|adopt|migrate|doctor|hash)\b|--(?:language|database|observability|cloud|postgres|redis|my-overlay|from-manifest|project-file)\b|superposition\.(?:ya?ml|json)|overlays/index\.yml|_serviceOrder)' \
  < /tmp/spec030-eligible.txt | sort -u > /tmp/spec030-candidates.txt

wc -l /tmp/spec030-boundary.txt /tmp/spec030-eligible.txt /tmp/spec030-candidates.txt
sha256sum /tmp/spec030-boundary.txt /tmp/spec030-eligible.txt /tmp/spec030-candidates.txt
```

Recorded output is `260`, `151`, and **50** paths respectively. The sorted
candidate-list SHA-256 is
`7aa4f9e471b5f715e0af8dcb82ef6f54b8652e59190833c2bbd196c2c587bc2f`.
`docs/architecture.md` is the one required manual special inspection outside the
50 signal candidates. Before correction, rerun both enumeration and diagnostic
query; any changed path set or newly current instruction invalidates approval and
must be classified before editing.

## Exhaustive classification of current signal candidates

### `docs/` current guidance

| Surface                                   | Label                         | Evidence / handling                                                                                                                        |
| ----------------------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------ |
| `docs/adopt.md`                           | Current aligned               | Project file is shared intent; receipt and deprecated option are labelled.                                                                 |
| `docs/creating-overlays.md`               | Current aligned               | Runnable tests use flat `--overlays`; project examples use `superposition.yml`.                                                            |
| `docs/custom-patches.md`                  | Current aligned               | Canonical project-file flow; manifest is labelled compatibility/migration and receipt path is `.devcontainer/superposition.json`.          |
| `docs/definition-of-done.md`              | Current aligned               | Current validation commands only; no legacy selection recommendation.                                                                      |
| `docs/deployment-targets.md`              | Current aligned               | Explicitly says `plan` cannot preview target-specific artifacts; project file remains authority.                                           |
| `docs/discovery-commands.md`              | Current aligned               | Flat-overlay discovery/preview; `--from-manifest` is explicitly compatibility/migration-only.                                              |
| `docs/examples/custom-patches-example.md` | Current aligned               | Flat-overlay plan/init/regen; legacy manifest mode labelled.                                                                               |
| `docs/examples.md`                        | Current aligned               | Canonical project file and discover → inspect → preview → write sequence.                                                                  |
| `docs/filesystem-contract.md`             | Current aligned               | Project file is shared intent; generated receipt has compatibility/audit role.                                                             |
| `docs/foundation.md`                      | Current aligned               | Governing project-file/receipt boundary and validation commands.                                                                           |
| `docs/hash.md`                            | Current aligned (specialised) | Manifest references belong to the manifest-hash command contract, not normal project authoring; flat overlays are used for explicit input. |
| `docs/local-devcontainer-amendment.md`    | Current aligned (specialised) | Explicitly denies creating project/manifest authority.                                                                                     |
| `docs/merge-strategy.md`                  | Current aligned (specialised) | Only current `doctor` validation command signal.                                                                                           |
| `docs/messaging-comparison.md`            | Current aligned               | Flat-overlay preview before write.                                                                                                         |
| `docs/messaging-quick-start.md`           | Current aligned               | Flat overlay project intent and receipt boundary are explicit.                                                                             |
| `docs/minimal-and-editor.md`              | Current aligned               | Flat-overlay project files, preview, and receipt boundary.                                                                                 |
| `docs/observability-workflow.md`          | **Current conflict**          | Lines 38–40 and 278–280 recommend `--observability` as current creation/update workflow with no project-file or compatibility label.       |
| `docs/overlay-imports.md`                 | Current aligned (specialised) | Current explain/doctor verification, no category-selection recommendation.                                                                 |
| `docs/overlay-manifest-refactoring.md`    | **Current conflict**          | Line 149 gives current `--language my-overlay` test command; migration-only central-index material can remain when clearly labelled.       |
| `docs/presets-architecture.md`            | **Current conflict**          | Lines 399–411 still model and require registration in prohibited `overlays/index.yml`.                                                     |
| `docs/presets.md`                         | Current aligned               | Presets optional; metadata-driven authoring and legacy index/receipt labels are explicit.                                                  |
| `docs/private-catalogs.md`                | Current aligned (specialised) | Canonical project file plus generated catalog receipt and flat discovery commands.                                                         |
| `docs/quick-reference.md`                 | Current aligned               | Canonical flat-overlay preview/write workflow and migration labels.                                                                        |
| `docs/README.md`                          | Current aligned               | Current docs route teaches canonical project intent and preview-first commands; labels `architecture.md` historical.                       |
| `docs/superposition-yml.md`               | Current aligned               | Canonical project-file reference and receipt boundary.                                                                                     |
| `docs/team-workflow.md`                   | Current aligned               | Team-owned project file, flat previews, and labelled migration path.                                                                       |
| `docs/workflows.md`                       | Current aligned               | Discover → inspect → preview → write; manifest mode is labelled legacy/transition.                                                         |

`docs/abbreviations.md` is the excluded reference-only signal candidate described
above. `docs/architecture.md` is the separately inspected historical file.

### `.github/instructions/` current guidance

| Surface                                                  | Label                | Evidence / handling                                                                                                   |
| -------------------------------------------------------- | -------------------- | --------------------------------------------------------------------------------------------------------------------- |
| `.github/instructions/dogfooding.instructions.md`        | Current aligned      | Root project file authority and executable flat-overlay preview/regen commands.                                       |
| `.github/instructions/overlay-authoring.instructions.md` | **Current conflict** | Line 269 points authors to legacy index ports; lines 911 and 929 use category flags as current tests.                 |
| `.github/instructions/overlay-docs.instructions.md`      | **Current conflict** | Line 299 uses `--database`; line 563 calls the index instruction a registration guide.                                |
| `.github/instructions/overlay-index.instructions.md`     | **Current conflict** | Despite “previous approach” framing, lines 694, 806, and 982 retain imperative legacy-index/category-flag validation. |

`.github/instructions/changelog.instructions.md` is excluded historical-example
content. The remaining instruction file,
`.github/instructions/documentation.instructions.md`, contains no selection,
preview, write, regeneration, receipt, or legacy-index signal and is therefore
outside the candidate table, but inside the enumerated boundary.

### `.pi/` current guidance

| Surface                                        | Label                         | Evidence / handling                                                         |
| ---------------------------------------------- | ----------------------------- | --------------------------------------------------------------------------- |
| `.pi/agents/overlay-writer.md`                 | Current aligned (specialised) | Regen/doctor validation only.                                               |
| `.pi/prompts/project-config.md`                | Current aligned               | Requires inspection of canonical project intent before writing.             |
| `.pi/skills/canonical-docs-alignment/SKILL.md` | Current aligned               | Defines project-file, flat-overlay, preview-first, and legacy-label rules.  |
| `.pi/skills/cli-command-delivery/SKILL.md`     | Current aligned               | Canonical project intent and compatibility receipt boundary.                |
| `.pi/skills/dogfooding-safety/SKILL.md`        | Current aligned               | Project file drives regen/doctor; receipt is not an authoring target.       |
| `.pi/skills/overlay-development/SKILL.md`      | Current aligned (specialised) | Regen/doctor validation only.                                               |
| `.pi/skills/project-config-authoring/SKILL.md` | Current aligned               | Flat-overlay discovery/preview and explicit non-authoring receipt boundary. |

The other 13 Markdown files under `.pi/` are inside the enumerated boundary but
have no diagnostic selection/workflow signal; they are not correction targets.

### `templates/` current guidance

| Surface                       | Label                         | Evidence / handling                                                                                                                         |
| ----------------------------- | ----------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------- |
| `templates/README.md`         | Current aligned for AC-4/AC-6 | Live interactive `init` is described without stale category flags or manifest authority; it is not an explicit project-file syntax example. |
| `templates/compose/README.md` | **Current conflict**          | Line 17 combines `--language`, `--database`, and `--observability` as the recommended usage.                                                |
| `templates/plain/README.md`   | **Current conflict**          | Line 18 recommends `--language nodejs`.                                                                                                     |

### `overlays/*/README.md` current guidance

All 85 direct overlay READMEs were path-enumerated. Seven contain a diagnostic
signal; the other 78 contain no relevant selection/preview/write/receipt/index
instruction and are not correction targets.

| Surface                         | Label                         | Evidence / handling                                                    |
| ------------------------------- | ----------------------------- | ---------------------------------------------------------------------- |
| `overlays/all/README.md`        | Current aligned               | Uses a flat `overlays:` project-file example.                          |
| `overlays/cuda/README.md`       | Current aligned (specialised) | Doctor integration statement only.                                     |
| `overlays/hermit/README.md`     | Current aligned               | Parameter override is shown in `superposition.yml`.                    |
| `overlays/jupyter/README.md`    | **Current conflict**          | Line 76 recommends `--language python,jupyter` for current generation. |
| `overlays/localstack/README.md` | **Current conflict**          | Line 63 recommends `--cloud localstack` for current generation.        |
| `overlays/rocm/README.md`       | Current aligned (specialised) | Doctor integration statement only.                                     |
| `overlays/.shared/README.md`    | Current aligned (specialised) | Maintainer doctor validation only.                                     |

## Exact proposed correction list (not executed)

No file outside these ten may be corrected under the proposed batch:

1. `docs/observability-workflow.md` — replace both `--observability` workflows
   with `superposition.yml` flat overlay selections and executable `plan` before
   `init --no-interactive` or `regen`; preserve the operational observability steps.
2. `docs/overlay-manifest-refactoring.md` — replace the current
   `--language my-overlay` test with a valid flat-overlay preview/write test;
   keep the central-index section only as clearly historical migration context.
3. `docs/presets-architecture.md` — remove current `overlays/index.yml`
   registration authority and describe metadata-driven preset discovery/testing;
   retain any legacy material only with an explicit historical label.
4. `.github/instructions/overlay-authoring.instructions.md` — source ports from
   `overlay.yml`/owned files, not the legacy index; replace both category-flag
   tests with valid `--overlays` commands.
5. `.github/instructions/overlay-index.instructions.md` — make the entire legacy
   index procedure non-operative historical context or retire current imperative
   checks; direct present-day authoring/testing to per-overlay `overlay.yml` and
   flat `--overlays` commands.
6. `.github/instructions/overlay-docs.instructions.md` — replace the
   `--database` example with flat overlays and stop describing the legacy-index
   instruction as a current registration guide.
7. `templates/compose/README.md` — replace the combined language/database/
   observability flags with a canonical `superposition.yml` flat overlay example
   plus preview-before-write commands.
8. `templates/plain/README.md` — replace `--language nodejs` with canonical flat
   project intent plus preview-before-write commands.
9. `overlays/jupyter/README.md` — replace `--language python,jupyter` with a
   flat `python,jupyter` selection in project intent and a valid port-offset
   preview/write sequence.
10. `overlays/localstack/README.md` — replace `--cloud localstack` with flat
    `localstack` project intent and a valid port-offset preview/write sequence.

`docs/architecture.md` is **not** item 11: it was inspected and excluded because
the current docs index explicitly marks it historical. If maintainers want its
obsolete prose rewritten, that is a separately authorized historical-doc cleanup,
not scope inferred from AC-4/AC-6.

## Ordered delivery sequence after approval

1. Independently approve or reject this 260 → 151 → 50 boundary, classifications,
   and ten-file correction list before edits.
2. If approved, capture a fresh path-list hash and tracked-tree fingerprint; stop
   if either invalidates the approved inventory.
3. Correct the three `docs/` conflicts, preserving labelled historical/specialised
   content.
4. Correct the three `.github/instructions/` conflicts as one maintainer-guidance
   unit so index/authoring/docs instructions cannot contradict one another.
5. Correct both template READMEs and both overlay READMEs using one canonical
   project-file/flat-overlay/preview wording pattern.
6. Run the selected validation below, self-check the exact ten-file diff, then
   return the whole candidate to independent review. Do not alter the existing
   reviewer verdict in place.

## Affected boundaries, validation, and rollback

- Affected correction boundary: exactly the ten files above. This replan itself
  changes only this inventory and the planner-owned convergence record.
- Forbidden in the future correction batch: CLI source/tests, overlay manifests,
  generated `docs/overlays.md`, schemas, `.devcontainer/`, spec requirements,
  acceptance criteria, status fields, changelog/roadmap/opportunity records, and
  reviewer-owned verdict text.
- Architecture fit: **ALIGNED**. The batch restores existing foundation/ADR 001
  authority and introduces no contract, dependency, schema, or architectural
  decision. ADR need: **none**.

### Validation surface — DISCOVER mode

No previous validation manifest is reused: the independent gate invalidated its
exhaustive-scope assumption. Selected validation for a future approved correction:

1. rerun the exact boundary/query and confirm no unclassified current signal;
2. targeted negative searches for unlabelled `--language`, `--database`,
   `--observability`, `--cloud`, and operative `overlays/index.yml` guidance;
3. manually classify every retained hit as current aligned or explicitly
   historical/migration/compatibility/specialised;
4. check each changed `plan`/`init`/`regen` example against live `--help`, and
   execute safe non-writing `plan` examples;
5. run Prettier check for the ten changed Markdown files and `git diff --check`;
6. run mandatory `task validate` before handoff because approved corrections would
   be shipped documentation changes;
7. preserve the existing focused CLI/BDD evidence unless source/test fingerprint
   changes; no new BDD scenario is planned because the proposed batch changes only
   prose, with live CLI execution providing command-example evidence.

Not selected unless scope changes: build, browser/E2E, schema/docs generation,
`regen`, or generated-output checks. They cannot establish inventory completeness
and the proposed batch changes no source, overlay metadata, schema, or output.

Rollback/containment: preserve the intentional partial candidate. Keep any approved
ten-file correction as a separable documentation diff; if the query gains a path,
a classification is disputed, or a command contract is unclear, stop and revert
only that correction diff (not pre-existing work), then return to Lead/maintainer.

## Open questions and approval need

- Blocking decision: independent reviewer must confirm that this finite boundary
  and ten-file correction list are exhaustive before implementation resumes.
- No product preference, requirements change, risk waiver, or ADR is requested.
- AC-4 and AC-6 remain **NOT_MET**; all other ACs are outside this diagnosis-only
  replan and are not reclassified here.
