# Current Overlay Audit Findings

Updated after implementing spec `054-overlay-audit-remediation`.

## Current state

The repo no longer has open findings in the remediation scope that triggered this spec:

- no audited compose overlay source still hard-codes `networks.devnet.name: devnet`
- startup-order authority is normalized to `overlay.yml -> serviceOrder`
- `.shared` importer inventory now matches live usage
- the stale `.shared/vscode/recommended-extensions.json` fragment was removed
- every overlay in the feature-decision set now has an explicit disposition recorded below

## Closed decisions

### Startup-order source of truth

- **Canonical source:** `overlay.yml serviceOrder`
- **Downstream consumer check:** live composer behavior already reads `serviceOrder` from overlay manifests (`tool/questionnaire/composer.ts`), and this remediation found no remaining consumer that requires `_serviceOrder` in `devcontainer.patch.json`
- **Catalog cleanup:** the leftover duplicate `_serviceOrder` field was removed from `overlays/fuseki/devcontainer.patch.json`
- **Authority surfaces aligned:**
    - `docs/creating-overlays.md`
    - `docs/dependencies.md`
    - `docs/quick-reference.md`
    - `.pi/skills/overlay-development/SKILL.md`
    - `.pi/agents/overlay-architect.md`
    - `.pi/agents/overlay-reviewer.md`

### Image default pinning

Pinned defaults replaced the prior moving `latest` / `latest-*` defaults across the audited compose catalog.

**Documented exception:**

- `comfyui` keeps `COMFYUI_VERSION=latest-cuda` (and the related `latest-cpu` / `latest-rocm` flavor aliases) as an explicit README-documented exception because this remediation did not validate one fixed upstream ai-dock release tag per hardware flavor.

### Shared fragment inventory

- `otel/instrumentation.env` importers: `otel-collector`, `prometheus`
- `compose/nvidia-gpu-devcontainer.yml` importers: `ollama`, `comfyui`
- removed stale fragment: `.shared/vscode/recommended-extensions.json`

## Feature-reuse dispositions

| Overlay        | Outcome                     | Rationale                                                                                                  |
| -------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------- |
| `amp`          | Keep bespoke implementation | Vendor-specific AI CLI install and auth flow; no validated feature adoption in this remediation            |
| `argocd`       | Keep bespoke implementation | Current overlay already owns pinned binary install and verification; no validated feature migration landed |
| `claude-code`  | Keep bespoke implementation | Vendor-specific AI CLI and extension coupling remain repo-owned                                            |
| `cloudflared`  | Keep bespoke implementation | Tunnel/auth workflow remains vendor-specific; no validated feature migration landed                        |
| `commitlint`   | Keep bespoke implementation | Overlay is repo-workflow-oriented and already composes with `nodejs` dependency semantics                  |
| `copilot-cli`  | Keep bespoke implementation | npm-based vendor CLI install/auth flow remains repo-owned                                                  |
| `gcloud`       | Keep bespoke implementation | SDK install/auth behavior remains bespoke pending a validated feature replacement                          |
| `gemini-cli`   | Keep bespoke implementation | Vendor-specific AI CLI install/auth flow remains repo-owned                                                |
| `just`         | Keep bespoke implementation | Current binary install is simple, pinned, and already validated in-repo                                    |
| `mkdocs2`      | Keep bespoke implementation | Overlay is intentionally repo-specific around the pre-release MkDocs 2 workflow                            |
| `ngrok`        | Keep bespoke implementation | Tunnel/auth workflow remains vendor-specific; no validated feature migration landed                        |
| `ollama-cli`   | Keep bespoke implementation | Overlay preserves repo-specific install behavior for local/remote Ollama workflows                         |
| `opencode`     | Keep bespoke implementation | Vendor-specific AI CLI install/auth flow remains repo-owned                                                |
| `pi`           | Keep bespoke implementation | Repo-owned coding-agent workflow and package choices remain bespoke                                        |
| `playwright`   | Keep bespoke implementation | Overlay already composes browser/tooling setup with repo dependency expectations                           |
| `pre-commit`   | Keep bespoke implementation | Overlay is repo-workflow-oriented and already composes with `python` dependency semantics                  |
| `spec-kit`     | Keep bespoke implementation | Repo-coupled Spec Kit workflow remains bespoke                                                             |
| `task`         | Keep bespoke implementation | Current pinned binary install and verification are already validated in-repo                               |
| `windsurf-cli` | Keep bespoke implementation | Vendor-specific AI CLI install/auth flow remains repo-owned                                                |

## Repeatable allowlist check

Spec `051` allowlist remains unchanged:

- retained: `postgres`, `redis`, `fuseki`, `sqlserver`, `nats`
- no additional overlay was made repeatable in this remediation
