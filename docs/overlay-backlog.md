# Overlay Backlog

Capture early overlay ideas here when they are useful to preserve for discovery or later implementation, but are not yet native tool specs under `docs/specs/`.

## Semantic web / knowledge graph workflow set

- **captured**: 2026-07-21
- **source**: `/overlay-spec` requirements capture
- **status**: enriched brief captured from working repo examples
- **recommended next step**: `/overlay-discover`

### Scope

Multiple overlays plus one existing-overlay extension:

1. `copilot-cli`
2. `ontop`
3. `comunica`
4. extend `fuseki` with generic RDF seed loading

### Why this backlog item exists

The repo already contains a working semantic-web playground under `data/graph/**` with Ontop config, RDF seed data, load scripts, and verification scripts. This backlog entry preserves the overlay-level requirements implied by that working example so later discovery and implementation do not have to reverse-engineer them again.

### Working example evidence

- `data/graph/docs/ontop.md` — explains Ontop’s role, file model, runtime model, limitations, and operational concerns
- `data/graph/input/ontology.ttl` — example ontology file expected by Ontop
- `data/graph/input/mapping.obda` — example Ontop OBDA mapping file
- `data/graph/input/ontop.properties` — example JDBC configuration
- `data/graph/scripts/verify-ontop.sh` — concrete health/verification flow against `http://ontop:8080/sparql`
- `data/graph/fuseki/data.ttl` and `data/graph/data.ttl` — example RDF seed assets
- `data/graph/scripts/load-fuseki-data.sh` — concrete Fuseki seed-load flow
- `data/graph/scripts/verify-fuseki.sh` — concrete Fuseki readiness/dataset verification flow
- `data/graph/.bin/comunica-sparql`, `data/graph/.bin/comunica-run`, `data/graph/.bin/comunica-dynamic-sparql` — evidence of actual Comunica CLI usage shape
- `overlays/fuseki/overlay.yml`, `overlays/fuseki/docker-compose.yml`, `overlays/fuseki/README.md` — existing repo-native semantic-web base to extend

---

## 1. `copilot-cli`

### Intent

Add a lightweight overlay that installs a standalone Copilot CLI/package for terminal-first AI assistance workflows.

### Likely overlay shape

- **shape**: single overlay
- **likely support**: `[]`
- **category**: `dev`
- **service model**: no sidecar service expected

### Minimum useful capability

- install the CLI in the devcontainer
- expose a simple verification command
- document auth/setup expectations without hardcoding project-specific secrets

### Likely files/artifacts

- `overlay.yml`
- `devcontainer.patch.json`
- `README.md`
- optional `setup.sh`
- optional `verify.sh`

### Likely parameters

- package/version/channel
- optional auth mode or host integration note

### Validation expectations

- `command -v <cli>` succeeds
- version/help command succeeds

### Open implementation questions

- exact package name and distribution channel
- whether host auth reuse is expected or whether the overlay should stay install-only

---

## 2. `ontop`

### Intent

Add an Ontop overlay for ontology-based knowledge graph virtualization: expose a SPARQL endpoint over a live relational database without copying source data.

### Likely overlay shape

- **shape**: single overlay
- **likely support**: `[compose]`
- **category**: likely `database` or `dev` depending on repo conventions discovered later
- **service model**: Ontop sidecar service plus mounted config assets

### Minimum useful capability

- run Ontop as a local SPARQL endpoint
- mount user-supplied ontology, mapping, and properties files
- connect to a selected relational database overlay
- provide a working verification flow against the SPARQL endpoint

### Working-example requirements to preserve

From `data/graph/docs/ontop.md`, `data/graph/input/mapping.obda`, and `data/graph/input/ontop.properties`:

- Ontop needs three main config artifacts:
    - ontology file (`.ttl`)
    - OBDA mapping file (`.obda`)
    - JDBC properties file (`.properties`)
- Ontop should expose a SPARQL endpoint at a path like `/sparql`
- Ontop may need lazy startup behavior (`ONTOP_LAZY_INIT=true`) so DB readiness does not break initial container startup
- Ontop should be modeled as a virtual knowledge graph over a live DB, not as a triplestore

### Likely files/artifacts

- `overlay.yml`
- `docker-compose.yml`
- `devcontainer.patch.json`
- `README.md`
- `.env.example`
- possibly template/example config files or support docs
- optional `verify.sh`

### Likely parameters

- `ONTOP_VERSION`
- `ONTOP_PORT`
- `ONTOP_MAPPING_FILE`
- `ONTOP_ONTOLOGY_FILE`
- `ONTOP_PROPERTIES_FILE`
- optional `ONTOP_LAZY_INIT`
- optional direct DB override variables (`ONTOP_DB_*`) if the image supports them

### Likely dependencies and compatibility

- likely suggests or requires `java`
- likely expects one SQL database overlay such as `postgres`
- likely works well with `comunica` as an upstream federation/query tool
- may coexist with `fuseki`, but as a different semantic-web role

### Healthcheck / verification expectations

Working example in `data/graph/scripts/verify-ontop.sh` implies:

- `curl` must be available
- readiness check should target `http://ontop:8080/sparql`
- verification query can be `ASK { ?s ?p ?o }`
- startup may take time; verification should retry rather than fail instantly

### Known limitations that should be preserved in docs

From `data/graph/docs/ontop.md`:

- no SPARQL `SERVICE` support inside Ontop itself
- OBDA mapping syntax is fragile / whitespace-sensitive
- ontology and mappings must stay aligned
- schema changes may require restart
- SQL NULLs do not materialize as RDF triples
- generated IRIs need safe identifier columns

### Open implementation questions

- whether v1 should ship only service wiring or also helper bootstrap commands
- whether to bundle sample config templates or require user-supplied files only
- which DB overlay should be the documented happy-path pair
- whether to capture advanced authz/proxy patterns now or defer to README-only guidance

---

## 3. `comunica`

### Intent

Add a Comunica overlay for terminal-first SPARQL querying, federation, and mediation across one or more RDF/SPARQL sources.

### Likely overlay shape

- **shape**: single overlay
- **likely support**: `[]`
- **category**: `dev`
- **service model**: CLI/tooling only

### Minimum useful capability

- install Comunica CLI commands
- enable local querying against Fuseki, Ontop, or other SPARQL endpoints
- document example usage for single-endpoint and federated queries

### Working-example requirements to preserve

Evidence under `data/graph/.bin/` and `data/graph/@comunica/**` suggests likely command surface such as:

- `comunica-sparql`
- `comunica-run`
- `comunica-dynamic-sparql`
- `comunica-sparql-http`

The overlay should at minimum decide which of these user-facing commands are installed and documented.

### Likely files/artifacts

- `overlay.yml`
- `devcontainer.patch.json`
- `README.md`
- optional `setup.sh`
- optional `verify.sh`

### Likely parameters

- `COMUNICA_VERSION`
- optional default endpoint/config path
- optional preset query/example file path only if the repo wants batteries included

### Likely dependencies and compatibility

- likely suggests `nodejs`
- likely suggests `fuseki`
- likely pairs especially well with `ontop` because Ontop lacks `SERVICE` support and Comunica can own federation

### Validation expectations

- verify one or more CLI binaries are installed
- help/version command succeeds
- optional smoke query against a local SPARQL endpoint if paired with `fuseki` or `ontop`

### Open implementation questions

- whether the overlay should install global CLI only or also local libraries/config helpers
- which exact Comunica package/entrypoint should define the public overlay contract
- whether federation examples belong in README only or as copied example assets

---

## 4. Extend `fuseki` with generic RDF seed loading

### Intent

Enhance the existing `fuseki` overlay so it can load user-provided RDF seed data automatically and generically, instead of relying on ad hoc project scripts.

### Existing repo-native base

`overlays/fuseki/**` already provides:

- a compose service on port `3030`
- admin password and dataset parameters
- a healthcheck using `/$/ping`
- devcontainer env values like `FUSEKI_HOST`, `FUSEKI_URL`, and `FUSEKI_DATASET`

### Working-example requirements to preserve

From `data/graph/scripts/load-fuseki-data.sh` and `data/graph/scripts/verify-fuseki.sh`:

- wait for `/$/ping` before attempting seed load
- authenticate with `admin:${FUSEKI_ADMIN_PASSWORD}`
- load data into `/${FUSEKI_DATASET}/data`
- use `text/turtle` for `.ttl` in the example case
- verify both service readiness and dataset existence

### Minimum useful capability

- let users provide one seed file or seed directory
- support at least Turtle (`.ttl`) in v1
- load data into the configured dataset automatically
- document whether loading is append or replace
- keep behavior opt-in so plain Fuseki usage remains simple

### Likely implementation shape

- extend existing `fuseki` overlay, not a new overlay
- likely add one or more copied seed asset paths plus a setup/load script
- likely add a verification path that confirms both server readiness and dataset availability

### Likely parameters

- `FUSEKI_SEED_FILE`
- or `FUSEKI_SEED_DIR`
- optional `FUSEKI_SEED_MODE` (`append` / `replace`)
- optional `FUSEKI_SEED_GRAPH`
- optional `FUSEKI_SEED_CONTENT_TYPE`

### Constraints

- must stay generic, not hardcoded to `fuseki/data.ttl`
- should not assume exactly one repo layout
- should preserve current overlay behavior when no seed inputs are configured

### Validation expectations

- service readiness check via `/$/ping`
- dataset existence check via `/$/datasets/${FUSEKI_DATASET}`
- successful load request returns 200 or 204

### Open implementation questions

- startup-only import vs repeatable reseed command
- file-only v1 vs file-and-directory support in v1
- Turtle-only v1 vs multiple RDF syntaxes in v1
- append default vs replace default

---

## Cross-overlay workflow expectations

### Intended combined workflow

The working `data/graph/**` example implies this stack shape:

- `fuseki` acts as a triplestore and SPARQL server for materialized RDF
- `ontop` exposes a SPARQL endpoint over live relational data
- `comunica` can act as the terminal-first federation/query layer across one or more endpoints
- `copilot-cli` is orthogonal developer tooling for working in this space

### Acceptance signals

- semantic-web developers can compose a local graph workflow from reusable overlays instead of bespoke project setup
- `fuseki` can ingest seed RDF files during setup/startup without manual repeated curl steps
- `ontop` can run against a live DB using mounted ontology/mapping/properties artifacts and expose a queryable SPARQL endpoint
- `comunica` provides a usable local CLI for querying/federating against Fuseki and Ontop
- the overlay docs preserve the important operational caveats already learned in `data/graph/docs/ontop.md`

### Remaining cross-cutting questions

- should this set eventually become a preset after the individual overlays stabilize?
- should Ontop config templates be shipped in-overlay or documented as user-provided assets?
- should Fuseki seeding be documented as generic RDF import for all semantic-web use cases, not just this one example?
