# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- **`mounts` field in `superposition.yml`** — First-class filesystem mount support modeled after the existing `env` field; declare mounts once and the generation pipeline routes them to the correct devcontainer artifact based on `stack`
    - String shorthand: `- "source=${localWorkspaceFolder}/../libs,target=/workspace/libs,type=bind"` — raw mount spec passed through verbatim
    - Long form: `{value: "...", target: auto|devcontainerMount|composeVolume}` — explicit routing control
    - `target: auto` (default): plain stack → `devcontainer.json mounts[]`; compose stack → `docker-compose.yml services.devcontainer.volumes[]`
    - `target: devcontainerMount`: always writes to `devcontainer.json mounts[]` regardless of stack
    - `target: composeVolume`: always writes to `docker-compose.yml services.devcontainer.volumes[]` (compose only; error on plain)
    - Applied before `customizations.devcontainerPatch` / `customizations.dockerComposePatch` so patch overrides remain respected
- **`superposition.yml` authoring guide** (`docs/superposition-yml.md`) — comprehensive reference covering every field, routing tables, and a complete annotated example; `README.md` updated to reference it

## [0.1.9] - 2026-04-29

### Added

- **`doctor` overlay dependency checks** — `cs doctor` now validates that all overlay `requires:` dependencies are present in the project file, flags unknown overlay IDs (typos, removed overlays), and surfaces `suggests:` entries as informational warnings; `doctor --fix` auto-adds missing required overlays and regenerates
- **`doctor` port cross-validation** — `cs doctor` cross-checks `devcontainer.json` `forwardPorts` against the ports actually exposed by Docker Compose services; reports `fail` for forwarded ports with no backing service and `warn` for compose-bound ports absent from `forwardPorts`; not auto-fixable (requires overlay-level changes)
- **`doctor` `.env.example` drift detection** — `cs doctor` detects when `.env.example` is stale: `fail` for parameters declared by selected overlays that are missing from the file; `warn` for keys in the file not declared by any overlay; `doctor --fix` regenerates `.env.example` via a full `cs regen`
- **`doctor` reproducibility check** — `cs doctor` dry-composes the devcontainer to a temp directory and compares it file-by-file against the current output; reports `fail` when a generated file is missing or has drifted from what `cs regen` would produce; `doctor --fix` regenerates the affected files
- **`doctor --fix --dry-run`** — New flag combination that previews what `doctor --fix` would change without writing any files; prints a numbered plan of each auto-fixable action with its `remediationKey`, `safetyClass`, and `plannedChanges`; exits with code `1` when any findings exist (auto-fixable or manual) so CI can detect "fix needed" without applying changes; `--dry-run` without `--fix` is an error; `--format json` is supported and adds `dryRun: true` and `plannedActions` to the output
- **`doctor` parameter checks** — `cs doctor` now validates overlay parameter configuration against the project file and generated output. Five new checks in a dedicated "Parameters" section:
    - **Unresolved `{{cs.*}}` tokens** — scans `devcontainer.json`, `docker-compose.yml`, and `.env.example` for substitution tokens that were never replaced; reported as a failure
    - **Sensitive parameters in plain text** — detects `sensitive: true` parameters whose values appear as literal strings in `devcontainer.json` `remoteEnv` instead of being referenced via `${VAR:-default}`; reported as a warning
    - **Missing `.env.example`** — warns when a compose-stack project has parameterised overlays but no `.env.example` was generated
    - **Unknown parameter keys** — warns when the project file's `parameters:` section contains keys not declared by any selected overlay (stale entries from removed overlays)
    - **Missing required parameters** — fails when an overlay declares a required parameter (no default value) that is absent from the project file `parameters:` section
    - `doctor --fix` resolves the automatic checks by adding missing parameters with their overlay defaults to the project file then re-running `cs regen`
- **`local-llm` preset** — New preset for local LLM inference: always selects `ollama` + `ollama-cli` + `open-webui`; optional `gpu` parameter adds `cuda` or `rocm` overlay; pre-sets `OLLAMA_HOST` environment variable
- **`full-observability` preset** — New preset that bolts a complete monitoring stack onto any project: `prometheus`, `grafana`, `loki`, `otel-collector`, `alertmanager`, `promtail` always included; `tracing` parameter selects Jaeger, Tempo, both, or none; pre-sets all OTel SDK environment variables
- **`vector-ai` preset** — New preset for RAG pipeline development: `qdrant` + `ollama` + `ollama-cli` + `python` always included; optional `gpu` and `chat_ui` (Open WebUI) parameters; pre-sets `QDRANT_URL`, `OLLAMA_HOST`, and `EMBEDDING_MODEL`
- **`k8s-dev` preset** — New preset for local Kubernetes development: `kubectl-helm` + `docker-in-docker` + `modern-cli-tools` always included; `cluster` parameter selects k3d (default) or kind; `devloop` parameter selects Tilt (default), Skaffold, or none
- **`.shared/vscode/markdown-extensions.json`** — New shared VS Code fragment containing `yzhang.markdown-all-in-one` and `DavidAnson.vscode-markdownlint`; imported by `mkdocs`, `mkdocs2`, and `pandoc` overlays, removing duplicated extension entries from their patches
- **`fuseki` overlay** — New overlay for Apache Fuseki (Apache Jena SPARQL server); runs `stain/jena-fuseki` with a TDB2-backed persistent dataset, exposes port 3030 for the SPARQL endpoint and admin UI, and injects `FUSEKI_HOST`, `FUSEKI_PORT`, `FUSEKI_DATASET`, `FUSEKI_URL`, and `FUSEKI_ADMIN_PASSWORD` into the devcontainer environment
- **`parameters:` sections on infrastructure overlays** — `mysql`, `mongodb`, `redis`, `rabbitmq`, `nats`, `minio`, `sqlserver`, and `localstack` now declare all configurable values (version, port(s), credentials) as first-class parameters visible to the questionnaire and documentation system; password fields are marked `sensitive: true`
- **`serviceOrder` field in `overlay.yml`** — Service startup ordering is now declared as `serviceOrder: <number>` in `overlay.yml` rather than the non-standard `_serviceOrder` field in `devcontainer.patch.json`, eliminating VS Code JSON schema validation warnings; `mergeRunServices()` reads the value from the overlay manifest; convention is 0 = infrastructure, 1 = observability backends, 2 = middleware, 3 = UI tier, 4 = demo apps
- **`messaging` overlay category** — `rabbitmq`, `nats`, and `redpanda` are now categorised as `messaging` instead of `database`; the interactive questionnaire shows a dedicated "Messaging" section; a `MessagingOverlay` type alias is exported from `tool/schema/types.ts`
- **`.shared/vscode/js-ts-settings.json`** — New shared VS Code settings fragment providing Prettier/ESLint extensions and `formatOnSave` for TypeScript and JavaScript; imported by `nodejs` and `bun` overlays, removing duplicated configuration from their patches

### Fixed

- **`cross-distro-packages` feature deleted on regen** — When `cleanupStaleDirFiles` was introduced to remove stale scripts within registered directories, it also recursed into the `features/` directory and deleted `cross-distro-packages/devcontainer-feature.json` and `install.sh` because those files were never added to the file registry. The composer now registers every file in the copied feature directory, so `devcontainer build` can locate the local feature.
- **Stale `scripts/` files not removed on regen** — When an overlay with a `setup.sh` or `verify.sh` was removed from a project and `cs regen` was run, any scripts that belonged only to the removed overlay (e.g. `scripts/setup-rabbitmq.sh`) were left behind on disk if at least one other overlay still contributed scripts. The cleanup pass now recurses into registered subdirectories and removes individual stale files within them, not just entire unregistered directories. Additionally, `scripts/` is no longer created eagerly before determining whether any overlay in the current run requires it.
- **`messaging` overlays rejected by project file validator on regen** — After `rabbitmq`, `nats`, and `redpanda` were moved to the `messaging` category, any project file using the legacy `database:` list field to declare them caused a `ProjectConfigError` that silently aborted `cs regen` before any files were written — leaving the previous `docker-compose.yml` intact. The `database` predicate in `buildCategoryLookup` now accepts both `database` and `messaging` category overlays so existing project files continue to work without migration.
- **Port conflict declarations** — Added bidirectional `conflicts:` entries for all overlays sharing host ports, preventing silent Docker bind failures at startup:
    - Port 3000: `grafana`, `open-webui`, `nodejs`, `bun`, `rust`
    - Port 8080: `mysql`, `redpanda`, `otel-demo-nodejs`, `nodejs`, `bun`, `go`, `java`, `dotnet`
    - Port 8081: `mongodb`, `redpanda`, `otel-demo-python`, `go`, `java`
- **`grafana` and `otel-collector` `depends_on`** — Removed hardcoded `depends_on` entries for services declared as `suggests` (optional); `grafana` now only depends on `prometheus` (its sole `requires`); `otel-collector`'s `depends_on` block removed entirely
- **`minio` / `localstack` conflict** — Added bidirectional conflict between `minio` and `localstack` (both provide S3-compatible storage and inject conflicting `AWS_ACCESS_KEY_ID`/`AWS_SECRET_ACCESS_KEY`); `minio` env var unified from `AWS_REGION` to `AWS_DEFAULT_REGION`
- **Redundant feature installs** — `pre-commit` no longer re-installs the Python devcontainer feature (already provided by `requires: [python]`); `commitlint` no longer re-installs Node (already provided by `requires: [nodejs]`); `playwright` now declares `requires: [nodejs]` and no longer installs Node independently
- **Observability `restart: unless-stopped`** — Added restart policy to all 8 observability compose services (`prometheus`, `grafana`, `loki`, `tempo`, `jaeger`, `alertmanager`, `promtail`, `otel-collector`)
- **Observability healthchecks** — Added HTTP healthchecks to all 8 observability services; `grafana`'s healthcheck uses `/api/health`, `prometheus` and `alertmanager` use `/-/ready`, others use `/ready` or the collector's `/` health endpoint
- **`redis` healthcheck** — Added `redis-cli ping` healthcheck matching the pattern in `.shared/compose/common-healthchecks.md`
- **`mysql` and `mongodb` healthcheck `start_period`** — Added `start_period: 30s` to `mysql` and `start_period: 20s` to `mongodb` to prevent spurious failures during slow storage-engine initialisation
- **`qdrant` version pinning** — Default `QDRANT_VERSION` changed from `latest` to `v1.9.0` for reproducible builds
- **`mkdocs` category** — Changed from `language` to `dev`, matching `mkdocs2` and reflecting that documentation generators are dev tools, not language runtimes
- **`comfyui` GPU devcontainer support** — Added `compose_imports: [.shared/compose/nvidia-gpu-devcontainer.yml]` so Nvidia GPU tooling is available in the devcontainer shell, not only the ComfyUI sidecar
- **`rocm` / `comfyui` cross-suggests** — `rocm` now suggests `comfyui`; `comfyui` now suggests `rocm`, giving AMD GPU users guidance equivalent to the existing `cuda` suggest
- **`keycloak` service order** — Corrected `serviceOrder` from `10` to `2` (middleware tier); added `parameters:` section for `KEYCLOAK_VERSION`, `KEYCLOAK_PORT`, `KEYCLOAK_ADMIN`, and `KEYCLOAK_ADMIN_PASSWORD` (sensitive) so they are visible to the questionnaire and documented in `.env.example`
- **`otel-demo-nodejs` / `otel-demo-python` service order** — Corrected `serviceOrder` from `3` to `4` to match `order: 4` declared in their `overlay.yml`
- **Observability suggests on infrastructure overlays** — `postgres`, `pgvector`, `mysql`, `mongodb`, `redis`, `rabbitmq`, `nats`, `redpanda`, `minio`, `sqlserver` now suggest `prometheus` and `grafana`; `qdrant`, `ollama`, and `open-webui` additionally suggest `otel-collector`
- **`nodejs` and `bun` `formatOnSave`** — `editor.formatOnSave: true` is now set for `[typescript]` and `[javascript]` via the new shared `js-ts-settings.json` fragment
- **`pgvector` env var alignment** — `pgvector/devcontainer.patch.json` now uses `remoteEnv` (matching `postgres`) with `PGVECTOR_*` primary names and `POSTGRES_*` aliases, so apps written against the `postgres` overlay work without changes when switching to `pgvector`
- **`name: devnet` in all compose network declarations** — Added `name: devnet` under the `devnet:` key in all 28 overlay compose files so Docker uses that as the actual network name regardless of the Compose project name, enabling cross-stack service discovery
- **AI CLI overlay install steps** — `amp`, `opencode`, `gemini-cli`, and `windsurf-cli` now wire their pre-existing `setup.sh` scripts via `postCreateCommand`, so the CLI tool is installed when the devcontainer is built rather than requiring a manual step
- **Removed unused `.shared/otel/otel-base-config.yaml`** — Skeletal config superseded by the full `otel-collector-config.yaml` already shipped with the `otel-collector` overlay
- **`adopt --json` output no longer polluted by progress messages** — `buildExpectedDevcontainerConfig` now suppresses `console.log` progress output during analysis so `--json` mode always emits clean JSON
- **`overlay-loader` test category allowlist** — `messaging` added to the valid overlay category set in `overlay-loader.test.ts`, fixing a pre-existing test failure introduced when the `messaging` category was added to the type system
- **`claude-code` overlay** — Added `anthropic.claude-code` VS Code extension
- **`codex` overlay** — Added `openai.chatgpt` VS Code extension
- **`ollama-cli` overlay** — Added a CLI-only Ollama overlay that installs `ollama` in plain or compose stacks without requiring a local sidecar service
    - Supports host/remote Ollama usage by honoring `OLLAMA_HOST` when configured
    - Keeps the existing archive + Docker-image extraction install flow (`.tar.zst` preferred, `.tgz` fallback)
- **`ollama` overlay auto-dependency** — `ollama` now implicitly requires `ollama-cli`, preserving current UX (server + CLI) while separating service and CLI concerns
- **`jaeger` overlay** — Jaeger no longer advertises unused legacy ports, so the overlay better matches the OTLP-based setup users actually run
    - Applications running inside the devcontainer now get OTLP tracing environment variables preconfigured out of the box for Jaeger, including `OTEL_EXPORTER_OTLP_ENDPOINT=http://jaeger:4317`
    - Jaeger now waits until it is healthy before the devcontainer starts, ensuring the UI is reachable when VS Code opens the browser
- **`otel-collector` overlay** — Applications in the devcontainer now get OTLP export variables preconfigured for the collector, and telemetry is routed through the collector automatically when `jaeger` and `otel-collector` are used together
- **`pandoc` overlay** — Unicode PDF generation no longer fails on `\textfallback{}` or when `Noto Sans Symbols 2` is unavailable, including status-icon content like `✅ ⚠️ ❌`

## [0.1.8] - 2026-04-11

### Added

- **`open-webui` overlay** — Browser-based chat UI for Ollama and OpenAI-compatible LLM backends, running as a Docker Compose sidecar
    - Serves the Open WebUI at port `3000` (mapped from container port `8080`); auto-forwarded and opened in the browser
    - Pre-configured `OLLAMA_BASE_URL=http://ollama:11434` so it connects automatically when the `ollama` overlay is also selected
    - Persistent `open-webui-data` volume preserves conversation history and settings across container rebuilds
    - Supports any OpenAI-compatible backend via `OLLAMA_BASE_URL`; not limited to Ollama
    - Suggests the `ollama` overlay as its natural LLM backend
- **`qdrant` overlay** — High-performance vector database for similarity search and embeddings, running as a Docker Compose service
    - REST API on port `6333`, gRPC on port `6334`; both ports forwarded from the devcontainer
    - `QDRANT_HOST`, `QDRANT_PORT`, and `QDRANT_URL` pre-set in the container environment for zero-config SDK usage
    - Persistent `qdrant-data` volume and health check via `/readyz` endpoint
    - Suggests `ollama`, `python`, and `nodejs` overlays for embedding-generation workflows
- **`pgvector` overlay** — PostgreSQL 16 with the pgvector extension pre-installed, running as a Docker Compose service
    - Uses the official `pgvector/pgvector:pg16` image; `CREATE EXTENSION vector;` works immediately with no manual setup
    - `postgresql-client` installed in the devcontainer; `PGHOST`, `PGPORT`, `PGDATABASE`, and `PGUSER` pre-set for seamless `psql` usage
    - Conflicts with the `postgres` overlay (both provide a PostgreSQL service on port 5432 — choose one)
    - Fully parameterised: `PGVECTOR_DB`, `PGVECTOR_USER`, `PGVECTOR_PASSWORD`, `PGVECTOR_PORT`, `PGVECTOR_VERSION` configurable via `superposition.yml` or `--param`
    - Suggests `ollama`, `python`, and `nodejs` overlays for RAG and embedding workflows
- **`k3d` overlay** — Lightweight local Kubernetes clusters running k3s in Docker, with faster startup and lower resource usage than `kind`
    - Installs the `k3d` binary via `setup.sh`; supports amd64 and arm64
    - Requires `docker-in-docker` (auto-resolved dependency) to launch k3s nodes as Docker containers
    - Conflicts with `kind` (both provision local Kubernetes clusters — choose one)
    - Suggests `kubectl-helm` for interacting with clusters via `kubectl` and Helm
    - README includes a `k3d` vs `kind` comparison table
- **`skaffold` overlay** — Continuous build-test-deploy pipeline for Kubernetes applications
    - Installs the `skaffold` binary via `setup.sh`; supports amd64 and arm64
    - Supports multiple builders (Docker, Buildpacks, Jib) and deployers (kubectl, Helm, Kustomize) via declarative `skaffold.yaml`
    - Conflicts with `tilt` (both serve the Kubernetes inner-loop development role — choose one)
    - Suggests `kubectl-helm`, `kind`, and `k3d` overlays for a complete local Kubernetes workflow
    - README includes a `skaffold` vs `tilt` comparison table

- **Overlay parameters with safe `{{cs.KEY}}` substitution** — Overlays can now declare configurable parameters that are resolved at generation time without colliding with Docker Compose `${VAR}`, shell `$VAR`, VS Code `${localWorkspaceFolder}`, or GitHub Actions `${{ }}` syntax
    - Overlays declare parameters in `overlay.yml` under a `parameters:` map, each with a `description`, optional `default`, and optional `sensitive: true` flag
    - Users supply values in `superposition.yml` under a top-level `parameters:` section, or via `--param KEY=value` on the CLI (repeatable)
    - Resolution order: CLI overrides → project file → overlay defaults
    - Missing required parameters (no default, no supplied value) → hard error before generation
    - Unresolved `{{cs.*}}` tokens in final output → hard error (catch-all safety net)
    - Unknown parameters supplied in `superposition.yml` → warning only (generation continues)
    - Docker Compose `${VAR:-default}`, shell, VS Code, and GitHub Actions variable expressions pass through completely untouched
    - The `{{cs.*}}` syntax can be nested inside Docker Compose defaults: `${POSTGRES_PORT:-{{cs.POSTGRES_PORT}}}` — `cs` resolves the inner token at generation time, Docker resolves the outer at runtime
    - Interactive questionnaire prompts for each declared parameter (sensitive parameters use masked input)
    - `postgres` overlay converted to use parameters as proof-of-concept: `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_PORT`, `POSTGRES_VERSION` are now fully configurable without forking the overlay
    - Spec committed under `docs/specs/011-overlay-parameters/spec.md`

- **First-class project `env` in `superposition.yml`** — Container environment variables can now be declared once in the project file and routed automatically by stack
    - `stack: plain` writes project `env` entries to `devcontainer.json -> remoteEnv`
    - `stack: compose` materializes project `env` entries into `.devcontainer/.env`, writes `docker-compose.yml -> services.devcontainer.environment` as `${KEY}`, and exposes the same values to the devcontainer via `devcontainer.json -> remoteEnv.KEY = ${containerEnv:KEY}`
    - Supports string shorthand (`FOO: bar`) and object form with explicit target override (`target: auto | remoteEnv | composeEnv`)
    - Compose values that reference `${NAME}` or `${NAME:-default}` resolve from the repository root `.env` when available before being written to `.devcontainer/.env`
    - `customizations.envTemplate` is now the canonical project-file field for variables written to `.env.example`; `customizations.environment` remains as a deprecated read-compatible alias, but newly written project files normalize to `envTemplate`
- **JetBrains IDE support (`--editor jetbrains`)** — Generates JetBrains project artifacts alongside the devcontainer configuration
    - Adds `customizations.jetbrains.backend` to `devcontainer.json`, selecting the IDE automatically from the primary language overlay (WebStorm for Node.js/Bun, PyCharm for Python, GoLand for Go, Rider for .NET, RustRover for Rust, IntelliJIdea for Java or generic)
    - Generates `.idea/.gitignore` at the project root, marking shared settings as VCS-tracked and excluding user-local entries
    - Generates language-specific run configuration XML files under `.idea/runConfigurations/` (`npm_dev.xml` for `npm run dev` / Node.js, `bun_dev.xml` for Bun, `mkdocs_serve.xml` for `mkdocs serve`, `python_main.xml` for `python main.py`, `go_run.xml` for `go run ./...`, `dotnet_run.xml` for `dotnet run`, `java_run.xml` for a Java Application, `rust_run.xml` for `cargo run`)
    - Existing `.idea/` files are **never overwritten** — only missing files are written, preserving any user customisations
    - Falls back to a minimal `.idea/` scaffold with `IntelliJIdea` backend when no language overlay is selected
    - Editor profile question added to the interactive questionnaire (`? Editor profile: VS Code / JetBrains / None`)
    - `editor` field persisted to `superposition.json` manifest for reproducible regen
- **`cs` command alias** — `npm install -g container-superposition` now registers both `container-superposition` and the shorter `cs` command; all existing `cs <subcommand>` usage in docs and examples works without a separate install
- **`ollama` overlay** — Local LLM inference server via [Ollama](https://ollama.com), running as a Docker Compose sidecar
    - Serves the Ollama REST API on port `11434`; OpenAI-compatible endpoint available at `/v1/`
    - **Ollama CLI installed in devcontainer** — `setup.sh` now prefers copying `/usr/bin/ollama` from the local `ollama/ollama` sidecar image, avoiding a second multi-gigabyte download during setup; when Docker is unavailable it falls back to the current official Linux release archives (prefers `.tar.zst`, falls back to legacy `.tgz`, and installs `zstd` when required) instead of via `ollama.com/install.sh`
    - **`OLLAMA_HOST` pre-configured** — Set as a `containerEnv` variable to `http://ollama:11434` so `ollama pull / run / list / rm` target the sidecar automatically with no manual setup
    - **GPU passthrough built-in** — Both the `ollama` sidecar and the `devcontainer` service receive all NVIDIA GPUs via `deploy.resources.reservations.devices`; enables GPU-accelerated tooling (`torch`, `tensorflow`, CUDA CLIs) directly in the dev environment
    - Mounts the host's `~/.ollama` directory by default so models pulled on the host are immediately available — no re-download on rebuild; models pulled inside the devcontainer are also persisted to the host
    - `OLLAMA_MODELS_PATH` env var overrides the host model path (useful for external drives or Windows users)
    - `verify.sh` checks CLI is installed, `OLLAMA_HOST` is set, smoke-tests the REST API, and lists available models via the CLI
    - Suggests `codex`, `claude-code`, and `amp` overlays for AI-assisted workflows
    - README documents the Ollama CLI UX, GPU prerequisites (NVIDIA Container Toolkit), and links to the `cuda` overlay
- **Target-aware generation** — `--target` now produces workspace artifacts and setup guidance tailored to the selected deployment environment, not just compatibility warnings
    - `--target codespaces` → extends `devcontainer.json` with `hostRequirements` (machine-size recommendation based on service count) and writes `CODESPACES.md` with Codespaces-specific setup guidance
    - `--target gitpod` → generates `.gitpod.yml` at the project root (with tasks and port exposures from selected overlays) and writes `GITPOD.md` with Gitpod badge and usage notes
    - `--target devpod` → generates `devpod.yaml` at the project root (referencing the devcontainer) and writes `DEVPOD.md` with `devpod up` instructions
    - `--target local` (explicit or default) → no change to existing behavior; no extra files written
    - **Stale artifact cleanup** — when switching target between runs (e.g. gitpod → codespaces), artifacts from the previous target (`.gitpod.yml`) are removed automatically before new ones are written
    - **Manifest records target** — `superposition.json` now includes a `target` field; regeneration reproduces the correct target-aware output without re-prompting
    - Regen without `--target` inherits the target recorded in the existing manifest, so the correct artifacts are always reproduced
- **`comfyui` overlay** — ComfyUI node-based image/video generation UI running as a Docker Compose sidecar
    - Serves the ComfyUI web UI and REST/WebSocket API on port `8188`; auto-forwarded and opened in the browser
    - Single shared models root (`/opt/comfyui-models`) mounted into both the devcontainer and the ComfyUI sidecar via `${COMFYUI_MODELS_HOST_PATH:-comfyui-models}`; ComfyUI discovers `checkpoints/`, `loras/`, etc. natively without per-subdirectory configuration
    - Named Docker volume `comfyui-models` used by default (project-scoped, no explicit `name:`); models persist across container rebuilds and work on all platforms; setting `COMFYUI_MODELS_HOST_PATH` in `.env` to a full absolute path switches to a bind mount (Docker Compose does not expand `~` in `.env` files)
    - `COMFYUI_MODELS_DIR=/opt/comfyui-models` set in `devcontainer.patch.json` as a container-side constant; scripts and tools in the devcontainer use this variable to locate the models root
    - `COMFYUI_OUTPUT_PATH` persists generated images/videos to the host across container rebuilds (named volume `comfyui-output` by default)
    - `setup.sh` pre-creates all 7 model subdirectories (`checkpoints`, `loras`, `controlnet`, `clip_vision`, `vae`, `embeddings`, `upscale_models`) on first run; handles volume permission issues with sudo fallback
    - `verify.sh` checks `$COMFYUI_MODELS_DIR` exists, is writable, and all expected subdirectories are present, plus HTTP health check on the ComfyUI web UI endpoint
    - `.env.example` documents `COMFYUI_MODELS_HOST_PATH` with examples using full absolute paths
    - README documents GPU acceleration (NVIDIA CUDA, AMD ROCm), CPU-only fallback, custom node persistence, and the ComfyUI REST/WebSocket API
    - Suggests `cuda`, `python`, and `ollama` overlays for GPU-accelerated and AI-integrated workflows

### Changed

- **`cs migrate` command** — One-time migration from manifest-only repositories
    - Reads `superposition.json`, converts the manifest to a `superposition.yml` project file
    - Auto-discovers the manifest in common locations; `--from-manifest <path>` for explicit path
    - Fails with a clear error if a project file already exists (use `--force` to overwrite)
    - Prints next-step guidance pointing toward `cs regen`
- **BREAKING: `superposition.yml` is now the canonical input** — `init` always writes a project config file alongside the devcontainer. The `--project-file` flag has been removed; project file writing is now the default behavior.
    - **Migration:** Remove `--project-file` from any scripts using `cs init`. The project file is now always written automatically.
- **BREAKING: `regen` requires a project file** — `regen` now reads only `superposition.yml` / `.superposition.yml`. It no longer falls back to `superposition.json` as an input source.
    - If `superposition.json` exists but no project file is present, `regen` errors with a clear message: `Run 'cs migrate' to create a project file from your existing manifest.`
    - **Migration for manifest-only repos:** Run `cs migrate` once to create `superposition.yml`, then use `regen` as normal.
    - **Migration for CI scripts using `--from-manifest`:** The flag still works but emits a deprecation warning. Switch to `cs migrate` + `regen` to remove the warning.
- **`--from-manifest` deprecated in `regen`** — Emits a deprecation warning pointing toward `cs migrate`. The flag is retained for backward compatibility.
- **`init --no-scaffold`** — New flag to write `superposition.yml` only, without generating `.devcontainer/`. Equivalent to the old `--write-manifest-only` but conceptually cleaner.
- **`doctor` drift detection** — `cs doctor` now compares the project file overlay list against the last-generated manifest and reports a warning when they have diverged. Suggests `regen` to reconcile.

## [0.1.7] - 2026-03-23

### Added

- **Shared overlay imports** — Overlays can now declare `imports:` in their `overlay.yml` to reuse fragments from `overlays/.shared/`, reducing copy-paste duplication across the overlay catalogue
    - Supported types: `.json` and `.yaml`/`.yml` fragments are deep-merged into the devcontainer patch; `.env` fragments are appended to `.env.example` with a `# from .shared/…` comment
    - Imports are applied in declaration order, followed by the overlay's own `devcontainer.patch.json`; the overlay's own patch always wins on key conflict
    - Path traversal prevention: any import path that does not begin with `.shared/` or resolves outside `overlays/.shared/` is rejected before generation starts
    - Missing files, unsupported types, and traversal attempts all fail with an error that names the overlay and the bad reference
    - `explain <overlay>` now shows the overlay's `imports` list under a **Shared Imports** section
    - `doctor` validates import paths (existence, type, and path traversal) for every overlay
- **`otel-collector`, `prometheus`, and `jaeger` overlays converted** — These three overlays now import `.shared/otel/instrumentation.env`, so their generated `.env.example` includes the OTEL SDK environment variables without duplication
- **`overlays/.shared/vscode/recommended-extensions.json` reformatted** — Now a valid devcontainer patch (`customizations.vscode.extensions` array) that can be merged directly when imported

- **`doctor --fix`** — Interactive repair flow for common environment problems
    - Can fix stale manifests, missing devcontainer regeneration, Node.js version mismatches, and Docker daemon issues
    - Re-runs checks after remediation and reports a structured outcome summary; use `--fix --json` for machine-readable output
- **Shared setup utilities** — A generated `scripts/setup-utils.sh` is now included automatically when any overlay provides a `setup.sh`
    - Centralises apt locking, architecture detection, binary installation helpers, npm environment setup, and quieter script output
    - Eliminates apt-lock races between parallel `postCreateCommand` scripts and reduces boilerplate across overlay setup scripts
- **`all` overlay** — Meta-overlay that expands to all non-preset overlays; useful for integration testing; hidden from the interactive questionnaire
- **`cuda` overlay** — NVIDIA CUDA GPU passthrough for containerized ML/inference workloads
    - Injects `"runArgs": ["--gpus=all"]` and `"hostRequirements": {"gpu": true}` into devcontainer.json
    - `setup.sh` probes `nvidia-smi` on container start and prints step-by-step remediation guidance when GPU access is unavailable
    - `verify.sh` asserts `nvidia-smi` exits 0 for `doctor` checks
    - Conflicts with `rocm` (the companion AMD GPU overlay)
- **`rocm` overlay** — AMD ROCm GPU passthrough for containerized ML/inference workloads
    - Injects `--device=/dev/kfd`, `--device=/dev/dri`, `--group-add=video`, and `--group-add=render` into `runArgs`
    - `setup.sh` probes `rocm-smi` / `rocminfo` on container start and prints actionable host-setup guidance when GPU access is unavailable
    - `verify.sh` asserts `rocm-smi` exits 0 for `doctor` checks
    - Conflicts with `cuda` (bidirectional); treated as a separate supported profile, not a CUDA drop-in replacement
- **`devcontainer-cli` overlay** — Installs `@devcontainers/cli` globally for building and managing devcontainers from the terminal
- **Port conflict auto-resolution** — `init` and `regen` now detect host-port collisions across selected overlays and remap conflicting ports automatically, with a before/after warning in the output

### Changed

- **Flat `overlays` field in project config** — Project files now use a single `overlays` array instead of per-category keys (`language`, `database`, `devTools`, etc.); old category keys are still accepted for backward compatibility
- **`doctor` command** — `--from-manifest`, `--from-project`, and `--project-root` flags added, bringing `doctor` into parity with `init` and `regen` for project-file and manifest selection
- **`direnv` overlay** — Package installation moved to `cross-distro-packages` devcontainer feature (runs at image-build time); `setup.sh` now handles only shell hook configuration
- **`modern-cli-tools` overlay** — Core packages (`jq`, `ripgrep`, `fd-find`, `bat`) moved to `cross-distro-packages`; `setup.sh` now only installs `yq` and creates platform symlinks (`fdfind→fd`, `batcat→bat`)
- **`git-lfs` feature** — `autoPull` set to `false` in the `git-helpers` overlay; prevents container creation failures in repos with no LFS remote configured

### Fixed

- **`${containerEnv:HOME}` in mount targets** — Replaced with absolute path `/home/vscode/.codex`; Docker cannot resolve container env vars at mount time
- **`pandoc` overlay** — Added missing `lmodern` package required by the default LaTeX template on Trixie; `emoji-fallback.lua` filter extended to cover BMP symbol blocks (Dingbats U+2700–U+27BF, Miscellaneous Symbols U+2600–U+26FF) — ✅ ⚠ ❌ and similar characters are now routed to `\textfallback{}` (Noto Sans Symbols 2) so they render as proper glyphs instead of generating XeLaTeX `[WARNING] Missing character` messages
- **`tilt` overlay** — Replaced pipe-to-bash installer with direct binary download; fixes `sudo mv: No such file or directory` on some systems
- **`minio` overlay** — Fixed hardcoded `amd64`-only download URL; now correctly selects the `aarch64` binary
- **`just` overlay** — Removed hardcoded SHA256 checksums that were incorrect for `aarch64`
- **`mongodb` overlay** — Replaced standard-repo feature (package not in default repos) with a `setup.sh` that adds the official MongoDB apt repository
- **`gcloud` overlay** — Replaced deprecated `apt-key`-based feature with a `setup.sh` using `gpg --dearmor`
- **`nats` overlay** — Fixed `latest-alpine` tag not existing on Docker Hub; default version is now `2`
- **`windsurf-cli` overlay** — Replaced non-existent npm package with binary download from GitHub releases; verify script now exits gracefully on unsupported platforms (arm64)
- **`powershell` overlay** — Fixed hang on interactive NuGet provider prompt; `Install-PackageProvider` is now skipped on PowerShell 7+ where the provider is built-in
- **`playwright` overlay** — Browser install moved to a `setup.sh` that holds the shared apt lock, preventing `E: Could not get lock` races with other parallel setup scripts; noisy apt and download progress output suppressed
- **`keycloak` overlay** — Health-check URL corrected to port `9000` (management port) instead of `8180`; verify timeout increased to cover the full container startup window; `depends_on` now waits for postgres to be healthy (`condition: service_healthy`) so Keycloak no longer starts before its database is ready
- **`postgres` overlay** — Added `pg_isready` healthcheck to the service definition so dependent overlays (e.g. Keycloak) can use `condition: service_healthy`
- **`sqlserver` overlay** — Verify script replaced `docker exec` (which requires Docker socket access) with a two-path strategy: `docker exec` via the container's ancestor image when available, TCP port check (`/dev/tcp`) as an automatic fallback when the Docker socket is not mounted
- **`redpanda` overlay** — Fixed YAML indentation in the Console config that caused the schema-registry URL to be silently ignored
- **`pre-commit` overlay** — Installation now prefers `pipx` to avoid conflicts with active virtualenvs
- **`direnv` overlay** — `direnv allow` now also runs on container rebuilds when `.envrc` already exists, fixing the "blocked" error on subsequent opens
- **`bun` overlay** — PATH entry persisted to shell profiles; verify script falls back to `~/.bun/bin/bun` when the binary is not yet on PATH in a non-interactive shell
- **`alertmanager` / `otel-collector` overlays** — Fixed workspace-root detection; scripts now locate `.devcontainer/` relative to their own path, eliminating failures when `LOCAL_WORKSPACE_FOLDER` is a host-only path
- **`alertmanager`, `promtail`, `tempo`, `otel-demo-nodejs`, `otel-demo-python` overlays** — Verify scripts now use the service's HTTP health endpoint as the primary readiness check instead of `docker ps`; eliminates false failures when the Docker socket is not accessible from inside the devcontainer
- **`mysql` overlay** — Verify script timeout increased to 90 seconds to match the container healthcheck window
- **Duplicate `postCreateCommand` entries** — `duckdb`, `kind`, `openapi-tools`, `tilt`, and `playwright` overlay patches were causing setup scripts to run twice; redundant entries removed
- **Parallel apt contention** — Setup scripts now coordinate through the shared apt lock, eliminating `E: Could not get lock` failures during parallel `postCreateCommand` execution
- **Escape sequences in apt output** — `DEBIAN_FRONTEND=noninteractive` and `TERM=dumb` are now passed explicitly on `sudo apt-get` invocations; prevents cursor-probe escape sequences appearing in devcontainer build logs

## [0.1.6] - 2026-03-16

### Added

- **`pandoc` overlay** — Complete Markdown → PDF pipeline with Pandoc, XeLaTeX, and optional Mermaid diagram rendering
    - Installs Pandoc 3.x from the official GitHub release (not the outdated apt version)
    - TeX Live / XeLaTeX with Carlito, JetBrains Mono, and Noto Sans Symbols 2 fonts for clean Unicode output
    - `diagram.lua` Lua filter from pandoc-ext/diagram for fenced `mermaid` code block rendering
    - Mermaid CLI (`mmdc`) installed automatically when the `nodejs` overlay is present; skipped gracefully otherwise
    - System Chromium wired to Puppeteer with `--no-sandbox` for headless Mermaid rendering inside containers
    - Ready-to-use `~/.pandoc/pandoc.yaml` defaults file with XeLaTeX engine, font, and table settings
- **Adopt project-file output** — `adopt --project-file` now writes a repository-root project config alongside the manifest
    - Reuses an existing `.superposition.yml` or `superposition.yml` when present to avoid dual-file ambiguity
    - Carries inferred output path, container name, overlay selections, and supported customizations into the generated project file
- **Project-root selection for persisted input** — `init` and `regen` now accept `--project-root <path>`
    - Lets you load a repository project file or discover a manifest from another directory without changing shells first
    - Relative output paths from the selected project file continue to resolve from that repository root
- **`minimal-trixie` example** — Lightweight project-file-driven example using Debian Trixie with Codex and a `~/.codex` host mount
- **`kitchen-sink` example** — Comprehensive reference example exercising every `superposition.yml` field: preset with parameter choices, additional overlays, port offset, deployment target, editor profile, and the full customizations block (patches, environment, scripts, files)

### Fixed

- **`cross-distro-packages` feature** — Package declarations can now use fallback names like `pkgA|pkgB`
    - Allows overlays such as `pandoc` to handle Debian-vs-Ubuntu package-name differences without embedding apt-specific detection logic in setup scripts

## [0.1.5] - 2026-03-11

### Added

- **Project config generation** — Standard `init` can now read a repository-root `.superposition.yml` or `superposition.yml`
    - Lets teams and CI run generation from committed declarative defaults instead of reconstructing long CLI commands
    - `regen` now supports `--from-project`, uses the repository project file by default when present, and consistently behaves as deterministic replay across project-file and manifest-based persisted sources
    - `init` remains the editable flow, so persisted sources can still prefill the questionnaire when you want to modify a generated setup instead of replaying it exactly
    - Direct CLI flags still override the project config for one run, while explicit `--from-manifest` regeneration remains isolated
    - Conflicting persisted-input source combinations such as `--from-project --from-manifest` or source mode plus structural selection flags now fail before generation with a clear source-conflict error
    - Supports parity for the existing clean-generation surface, including custom images, container naming, minimal/editor settings, environment variables, and additional generated features declared through custom patches
- **Verbose plan narration** — `plan --verbose` now explains why each overlay was included
    - Shows direct selections, required dependencies, and dependency paths in the terminal output
    - Supports `plan --from-manifest <path> --verbose` so existing manifests get the same explanation model as explicit overlay lists
    - Adds structured inclusion reasons to `plan --json --verbose` without changing the default JSON shape
    - Calls out skipped overlays and conflict boundaries so dependency resolution is easier to audit
- **`spec-kit` overlay** — Spec-Driven Development with the `specify` CLI and any supported AI coding agent
    - Installs `uv` (Astral's fast Python package manager) and `specify-cli` from [github/spec-kit](https://github.com/github/spec-kit)
    - Supports 20+ AI agents: Codex, Claude Code, Gemini CLI, GitHub Copilot, Cursor, Windsurf, Amp, opencode, and more
    - Usage: `specify init . --here --ai <agent>` after overlay setup
- **`claude-code` overlay** — Anthropic Claude Code CLI (`@anthropic-ai/claude-code`) for AI-powered terminal development
- **`gemini-cli` overlay** — Google Gemini CLI (`@google/gemini-cli`) for AI-powered terminal development
- **`amp` overlay** — Sourcegraph Amp CLI (`@sourcegraph/amp`) for AI-powered terminal development
- **`windsurf-cli` overlay** — Codeium Windsurf CLI for AI-powered terminal development
- **`opencode` overlay** — opencode AI coding agent (`opencode-ai`) for multi-provider terminal development
- **`sdd` preset** — Spec-Driven Development meta-preset bundling `spec-kit` with a user-selectable AI agent CLI
    - Prompts users to choose from: Codex, Claude Code, Gemini CLI, Amp, Windsurf, opencode, or GitHub Copilot (IDE-integrated)
    - Sets `SPECIFY_AI_AGENT` environment variable automatically to match the chosen agent
- **`hash` command** — Deterministic environment fingerprint for drift detection and reproducibility
    - Produces a stable SHA-256 fingerprint from stack, resolved overlays, preset, base image, and tool version
    - Auto-resolves overlay dependencies (same logic as `plan`) so the hash includes transitively required overlays
    - Works standalone (`--stack`/`--overlays` flags) or reads directly from an existing `superposition.json` manifest
    - `--json` flag emits machine-readable JSON with both a short 8-character `hash` (for display/badges) and the full 64-character `hashFull` (for CI comparison)
    - `--write` flag writes the full hash to `.devcontainer/superposition.hash` alongside the manifest
    - Hash is version-stable across patch releases (uses `major.minor` of the tool version only)
    - Full documentation at [`docs/hash.md`](docs/hash.md)
- **`adopt` command** — Adopt an existing `.devcontainer/` into the overlay-based model
    - Reads `devcontainer.json` and any linked `docker-compose.yml` files and analyses their contents
    - Resolves the `dockerComposeFile` field (string or array, relative paths) to support Docker Compose-based devcontainers where the compose file lives outside the `.devcontainer/` directory
    - Maps detected devcontainer features, Docker Compose service images, VS Code extensions, and `remoteEnv` variables to equivalent overlay IDs
    - Detection tables are **built dynamically from the overlay registry** — no hardcoded overlay names, every overlay is automatically supported
    - Best-match scoring ensures a feature used by multiple overlays (e.g. the Node.js feature shared by `nodejs` and `bun`) is assigned to the most appropriate one
    - Displays a table showing each detected signal → suggested overlay with a confidence level (`exact` or `heuristic`)
    - Prints the equivalent `container-superposition init` command to reproduce the configuration, using correct CLI flags per overlay category (`--language`, `--database`, `--observability`, `--cloud-tools`, `--dev-tools`)
    - **Unmatched items** (features, services, extensions not covered by any overlay) are surfaced separately; a `custom/devcontainer.patch.json` / `custom/docker-compose.patch.yml` is written to preserve them across regenerations
    - Backup support using the same auto-detect logic as `regen` — skipped in git repos by default; use `--backup` / `--no-backup` / `--backup-dir` to override
    - `--dry-run` flag prints the analysis without writing any files
    - Prompts to generate `superposition.json` (and optionally `custom/` patch files) from the suggestions
    - `--force` flag allows overwriting existing generated files
    - `--json` flag for machine-readable output (suitable for scripting)
    - Gracefully handles configs with no recognisable overlay patterns
    - Full documentation at [`docs/adopt.md`](docs/adopt.md)

## [0.1.4] - 2026-02-26

### Added

- **Keycloak overlay** — Open-source identity and access management for local OAuth2/OIDC development
    - Runs as a Docker Compose service on port 8180 (avoids collision with common app servers)
    - Automatically requires and integrates with the `postgres` overlay as its database backend
    - Exposes OIDC discovery at `/realms/master/.well-known/openid-configuration`
    - `KEYCLOAK_HOST`, `KEYCLOAK_PORT`, and `KEYCLOAK_ISSUER` wired into the dev container via `remoteEnv`
- **Mailpit overlay** — Email testing tool that captures all outbound email locally
    - SMTP server on port 1025 (no authentication required in dev mode)
    - Web UI on port 8025 for browsing captured emails
    - REST API at `/api/v1/messages` for automated test assertions
    - `SMTP_HOST`, `SMTP_PORT`, and `MAILPIT_URL` wired into the dev container via `remoteEnv`
- **gRPC Tools overlay** — Protocol Buffers and gRPC development toolchain
    - Installs `protoc` (via system packages), `buf` CLI, and `grpcurl` (from official GitHub releases, multi-arch)
    - VS Code extensions: `vscode-proto3` and `vscode-buf`
    - Works with all base stacks (plain and compose)
- **Cloudflared overlay** — Cloudflare Tunnel for securely exposing local services to the internet
    - Anonymous tunnels work immediately with no account required
    - Named tunnels support persistent URLs with a Cloudflare account
    - Conflicts with `ngrok` overlay (bidirectional — both overlays declare the conflict)
    - Pinned to a specific release version for reproducibility

- **Service reference exports** — Two convenience files are now auto-generated during `init` and `regen` for projects that include service overlays
    - `services.md` — Consolidated service reference with connection info, connection strings (URIs), code examples (Node.js, Python) for common services, common CLI commands, port offset documentation, and a troubleshooting section
    - `env.local.example` — Optional-overrides template derived from each overlay's `.env.example`, with all values commented out and grouped by service — copy to `.env` and uncomment only what you need to customize
    - Both files are tracked in the file registry and cleaned up on regeneration alongside other generated files

- **Git-aware backup defaults** — Backups are now skipped automatically when the target directory is inside a git repository (git already tracks history), and created by default when it is not
    - `--backup` flag forces a backup even inside a git repo
    - `--no-backup` flag suppresses a backup even outside a git repo
    - Auto-detection uses `git rev-parse --git-dir`; falls back to walking up the directory tree looking for a `.git` folder when the `git` command is unavailable
- **Automatic `.gitignore` management** — Generated projects now include tool-specific `.gitignore` entries automatically; overlay-provided patterns are merged into your project root `.gitignore` at generation time
    - Entries from each overlay are grouped under a labelled comment for easy identification
    - Running generation again never duplicates patterns already in your `.gitignore`
    - Overlay-provided ignore rules are always applied to the project root `.gitignore` (never to files inside `.devcontainer/`), keeping generated configuration isolated from your application's source ignores
- **direnv overlay: secrets and env files are gitignored automatically** — `.envrc.local`, `.env`, `.env.local`, and `.direnv/` are now excluded from git immediately after generation — no need to start the container first
- **Python overlay: workspace virtual environment (`.venv`)** — The Python overlay now sets up a `.venv` virtual environment in your project root on container creation
    - VS Code automatically uses the workspace `.venv` as the Python interpreter
    - All project dependencies are installed into the venv (`requirements.txt`, `requirements-dev.txt`, `pyproject.toml`, `setup.py`)
    - `.venv/`, `__pycache__/`, `*.pyc`, and other Python artifacts are added to `.gitignore` automatically
- **Preset parameterization** — Customize presets with high-level choices without micro-managing individual overlays
    - New `parameters` field in preset definitions maps choices to sets of overlays
    - `web-api` preset now parameterized: `database`, `cache`, `broker`, `observability` slots
    - `microservice` preset now parameterized: `broker`, `observability` slots
    - Interactive questionnaire asks for each parameter value with descriptions and defaults
    - `--preset <id>` CLI flag pre-selects a preset and skips the preset selection prompt
    - `--preset-param <key=value>` CLI flag pre-fills parameter values (repeatable)
    - Pre-filled parameters skip their interactive prompt; unfilled ones are still asked
    - Invalid parameter values produce helpful error messages listing valid options
    - `explain <preset-id>` now shows parameters, options, defaults, and usage examples
    - Example: `container-superposition init --preset web-api --preset-param broker=nats --preset-param observability=full`
- **`plan --diff`** — Compare planned output vs existing `.devcontainer/` configuration before applying changes
    - Shows files to be created, modified, unchanged, and removed
    - Generates colored unified diff for `devcontainer.json` (loads base template + applies overlay patches)
    - Detects overlay changes (added/removed) by comparing with existing `superposition.json` manifest
    - Detects port changes (added/removed) derived from overlay comparison
    - Lists preserved custom files in `custom/` directory
    - `--output <path>` to compare against a custom existing config path (default: `./.devcontainer`)
    - `--diff-format json` for machine-readable output (also via `--json`)
    - `--diff-context <lines>` to control diff context lines (default: 3)
    - Example: `container-superposition plan --stack compose --overlays postgres,redis --diff`

## [0.1.3] - 2026-02-17

### Note

Re-release of version 0.1.2 as non-beta release

## [0.1.2] - 2026-02-17 [RECALLED]

### Note

This version was recalled as it was inadvertently tagged beta.

### Added

- **Team collaboration workflow** — Manifest-first workflow for standardizing dev environments across teams
    - `--write-manifest-only` flag generates only `superposition.json` without creating `.devcontainer/` files
    - Enables version control pattern: commit manifest, gitignore generated files
    - `regen` command now searches current directory for manifest (team workflow pattern)
    - New comprehensive guide at `docs/team-workflow.md` with CI examples
    - README updated with team collaboration quick start
    - Supports personal customizations via `.devcontainer/custom/` (can be committed)
    - One-command onboarding: `npx container-superposition regen`
    - No lock-in - generated files remain plain JSON/YAML
- **Manifest versioning system** — Separate schema version from tool version for better compatibility
    - New `manifestVersion` field tracks schema version (increments on breaking changes)
    - New `generatedBy` field tracks tool version that created the manifest
    - Legacy `version` field maintained for backward compatibility
    - Automatic migration framework migrates old manifests transparently
    - Support window: Current version + N-1 (e.g., v1 supports legacy format)
    - Migration happens automatically during manifest loading
    - Doctor command validates manifest versions and migration status
    - JSON schema for manifest validation (`superposition-manifest.schema.json`)
- **Merge strategy specification** — Formalized and documented merge behavior for deterministic composition
    - New comprehensive specification document at `docs/merge-strategy.md`
    - Extracted merge utilities to `tool/utils/merge.ts` with full documentation
    - Comprehensive test suite in `tool/__tests__/merge-strategy.test.ts`
    - Documents exact merge rules for devcontainer.json, docker-compose.yml, and .env files
    - References RFC 7386 (JSON Merge Patch) and relevant standards
    - 100% deterministic merge behavior with no undocumented special cases
    - Field-specific strategies for arrays (features, extensions, mounts, forwardPorts)
    - Intelligent PATH variable merging in remoteEnv
    - Package list merging with deduplication (apt, apk)
    - Service dependency filtering (depends_on)
- **New infrastructure overlays** — Cloud and development tooling for modern workflows
    - `duckdb` — In-process analytical database for OLAP workloads and data analysis
    - `jupyter` — Jupyter notebook server for interactive computing and data science (compose only, requires Python)
    - `kind` — Kubernetes in Docker for local K8s development and testing (requires docker-in-docker)
    - `localstack` — Local AWS cloud stack for development without real AWS resources (compose only, ports 4566, 4571)
    - `openapi-tools` — OpenAPI/Swagger tooling for API development and documentation
    - `tilt` — Live update and orchestration for Kubernetes development (port 10350, suggests kind + kubectl-helm)
- **Code quality enforcement** — Automatic linting in development and CI
    - `npm run lint` — Runs TypeScript type checking and Prettier format validation
    - `npm run lint:fix` — Auto-formats all code with Prettier
    - Linting integrated into all CI workflows (runs before build)
    - Documentation generation now auto-formats output with Prettier
    - Linting failures block PRs and npm publish
- **Overlay imports** — Overlays can now import shared configuration from `overlays/.shared/`
    - Supports JSON, YAML, and ENV file imports
    - Reduces duplication across overlays with common patterns
    - Example shared configs for OTEL, healthchecks, and VS Code extensions
- **Enhanced port metadata system** — Ports now support rich metadata with service names, protocols, descriptions, and connection details
    - Port definitions can include service name, protocol (http/https/tcp/udp/grpc), description, path, and onAutoForward behavior
    - Connection string templates for common services (PostgreSQL, Redis, MongoDB, MySQL, RabbitMQ, NATS)
    - Backward compatible with simple numeric port definitions
    - `ports.json` documentation file automatically generated with all port details, connection strings, and URLs
    - Environment variables from `.env.example` used to populate connection string templates
    - HTTP/HTTPS services get auto-generated URLs with correct ports and paths
    - onAutoForward port configuration controls VS Code port forwarding behavior (notify, openBrowser, openPreview, silent, ignore)
    - Service summaries displayed during generation for better discoverability
    - Supports multi-repo microservice development with clear port documentation
- **`--minimal` flag** — Skip optional/nice-to-have overlays for lean configurations
    - Useful for CI/CD environments, Codespaces, or learning
    - Marked overlays: `modern-cli-tools`, `git-helpers`, `codex`
    - Works with both `init` and `regen` commands
    - Use: `container-superposition init --minimal` or `container-superposition regen --minimal`
- **`--editor` flag** — Choose editor profile for customizations
    - `vscode` (default): Include VS Code extensions and settings
    - `none`: CLI-only, no editor customizations
    - `jetbrains`: Skip VS Code customizations (reserved for future JetBrains-specific settings)
    - Works with both `init` and `regen` commands
    - Use: `container-superposition init --editor none` or `container-superposition regen --editor none`
- **Preset directory reorganization** — Moved `overlays/presets` to `overlays/.presets` for consistency with `.registry` and `.shared` directories
- **Regen command enhancements** — `regen` command now supports `--minimal` and `--editor` flags
    - Regenerate existing configurations without optional features
    - Change editor profile without recreating from scratch
    - Example: `container-superposition regen --minimal --editor none`
- **Deployment target support** — Environment-specific optimizations and validation
    - `--target` flag supports: local (default), codespaces, gitpod, devpod
    - Automatic compatibility validation for selected overlays
    - Environment-specific recommendations (e.g., docker-in-docker for cloud IDEs)
    - Interactive target selection when incompatible overlays detected
    - Extensible system for adding new deployment environments
    - Port forwarding behavior adapts to target environment
    - Target-specific constraints (Docker access, privileged containers)
    - Configuration stored in `overlays/.registry/deployment-targets.yml`
- **GitHub Actions workflows** — Automated validation and documentation checks
    - `validate-overlays.yml` — Runs on pull requests to validate overlay changes
        - Executes `doctor` command for environment validation
        - Runs full test suite
        - Executes smoke tests to ensure overlay combinations work
        - Uses Node.js LTS version
    - `generate-docs.yml` — Validates generated documentation on pull requests
        - Runs when overlays or docs generation scripts change
        - Fails if generated docs are out of sync (prevents drift)
        - Ensures documentation is committed before merge
    - Workflow status badges added to README
- **Environment validation command** — Comprehensive `doctor` command for diagnostics
    - Node.js version check (>= 18 required)
    - Docker daemon accessibility verification
    - Docker Compose v2 detection (only for compose stack)
    - Overlay integrity validation (YAML syntax, required files, broken symlinks)
    - Manifest compatibility checks
    - Port conflict detection (best-effort)
    - `--json` flag for programmatic output
    - `--fix` flag for automatic corrections (placeholder for future fixes)
    - Run `container-superposition doctor` to validate your environment
- **Discovery commands** — New commands to explore available overlays before generating
    - `container-superposition list` — Browse all overlays with filtering options
        - Filter by category: `--category language`, `--category database`, etc.
        - Filter by tags: `--tags observability,metrics`
        - Filter by stack support: `--supports compose`
        - JSON output for scripting: `--json`
    - `container-superposition explain <overlay>` — Deep dive into any overlay
        - Shows description, category, ports, and dependencies
        - Lists files that will be created/modified
        - Displays devcontainer patch content with syntax highlighting
        - Shows docker-compose services (if applicable)
        - JSON output available: `--json`
    - `container-superposition plan` — Preview generation without creating files
        - Shows overlays that will be used (including auto-resolved dependencies)
        - Displays port mappings with offset applied
        - Lists files that will be created
        - Detects and reports conflicts
        - Validates overlay compatibility with selected stack
        - Example: `container-superposition plan --stack compose --overlays nodejs,postgres,grafana --port-offset 100`

### Changed

- **Port schema extended** — overlay.yml ports field now accepts both numbers and rich port objects
    - Legacy format (array of numbers) still fully supported for backward compatibility
    - New format includes service, protocol, description, path, onAutoForward, and connectionStringTemplate fields
    - Schema validation in `overlay-manifest.schema.json` supports both formats via oneOf
- **Updated key overlays with rich port metadata** — PostgreSQL, Redis, Grafana, Jaeger, and Prometheus
    - Proper onAutoForward settings (openBrowser for UIs, notify for APIs, ignore for internal ports)
    - Connection string templates for databases
    - Service descriptions for better discoverability
- Overlay manifests now support `imports` field for shared file references
- Overlay manifests now support `minimal` boolean field to mark optional overlays
- Regen command can now accept CLI overrides while preserving manifest configuration
- Improved overlay information display with better formatting and colors
- Enhanced error messages with actionable suggestions
- **Output structure documentation** — Updated `tool/README.md` to reflect the current merged compose output and overlay-suffixed copied files

### Fixed

- **Grafana dashboard auto-import** — Dashboard provisioning now uses non-overlapping mount paths so default JSON dashboards load reliably on first startup
- **Compose dependency filtering** — `depends_on` cleanup now supports both list and object syntax during compose merge
- **Overlay manifest ports parsing** — Numeric string port values in `overlay.yml` are now accepted and normalized

---

## [0.1.1] - 2026-02-11

### Fixed

- **Package corruption issue** — Removed accidentally included `.tgz` tarball file that caused installation failures
- Added `"!**/*.tgz"` exclusion to `package.json` files array to prevent future tarball inclusion
- Updated publishing documentation with tarball cleanup step

### Changed

- Publishing workflow now includes explicit tarball removal step before publishing

---

## [0.1.0] - 2026-02-11 [RECALLED]

### Note

This version was recalled due to a packaging issue (included `.tgz` tarball). Use version 0.1.1 or later.

### Added

- **Initial npm package publication** — `container-superposition` available via `npx`
- **CLI subcommands** — `init`, `regen`, `list`, `doctor` commands
- **Automated publishing workflow** — GitHub Actions workflow for releases
- **Publishing documentation** — Comprehensive guide at `docs/publishing.md`

### Changed

- **Converted to proper npm package** — From template repo to installable CLI tool
- **Command structure** — `container-superposition <command>` instead of `npm run init`
- **Binary entry point** — Properly configured bin field in package.json
- **Package configuration** — Explicit files array for controlled publishing

### Technical Details

- Entry point: `dist/scripts/init.js`
- Package size: ~327 KB compressed, 1.2 MB unpacked
- 327 files included (overlays, templates, features, docs)
- Supports Node.js 18+

---

<!-- Links -->

[Unreleased]: https://github.com/veggerby/container-superposition/compare/v0.1.9...HEAD
[0.1.9]: https://github.com/veggerby/container-superposition/compare/v0.1.8...v0.1.9
[0.1.8]: https://github.com/veggerby/container-superposition/compare/v0.1.7...v0.1.8
[0.1.7]: https://github.com/veggerby/container-superposition/compare/v0.1.6...v0.1.7
[0.1.6]: https://github.com/veggerby/container-superposition/compare/v0.1.5...v0.1.6
[0.1.5]: https://github.com/veggerby/container-superposition/compare/v0.1.4...v0.1.5
[0.1.4]: https://github.com/veggerby/container-superposition/compare/v0.1.3...v0.1.4
[0.1.3]: https://github.com/veggerby/container-superposition/compare/v0.1.2...v0.1.3
[0.1.2]: https://github.com/veggerby/container-superposition/compare/v0.1.1...v0.1.2
[0.1.1]: https://github.com/veggerby/container-superposition/compare/v0.1.0...v0.1.1
[0.1.0]: https://github.com/veggerby/container-superposition/releases/tag/v0.1.0
