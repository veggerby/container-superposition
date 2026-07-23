# Apache Jena Fuseki

Apache Jena Fuseki provides a local SPARQL 1.1 server and TDB-backed triplestore for semantic-web development, with optional opt-in RDF seed loading during devcontainer creation.

## Services

| Service  | Port   | Description                                       |
| -------- | ------ | ------------------------------------------------- |
| `fuseki` | `3030` | SPARQL server, Graph Store endpoint, and admin UI |

## Configuration

| Parameter                  | Default  | Description                                                                 |
| -------------------------- | -------- | --------------------------------------------------------------------------- |
| `FUSEKI_VERSION`           | `5.4.0`  | Fuseki image tag                                                            |
| `FUSEKI_PORT`              | `3030`   | Host port mapped to Fuseki                                                  |
| `FUSEKI_ADMIN_PASSWORD`    | `admin`  | Admin password used by the management API and seed loader                   |
| `FUSEKI_DATASET`           | `ds`     | Default dataset created on first start                                      |
| `FUSEKI_SEED_FILE`         | ``       | Relative or absolute path to one RDF file to load automatically             |
| `FUSEKI_SEED_DIR`          | ``       | Relative or absolute path to a directory of RDF files to load automatically |
| `FUSEKI_SEED_MODE`         | `append` | `append` keeps existing triples; `replace` clears the target graph first    |
| `FUSEKI_SEED_GRAPH`        | ``       | Optional named graph URI; when unset the default graph is used              |
| `FUSEKI_SEED_CONTENT_TYPE` | `auto`   | Auto-detect from file extension or force one RDF media type                 |

## Connection

From the devcontainer:

```text
SPARQL query:  http://fuseki:3030/ds/query
SPARQL update: http://fuseki:3030/ds/update
Graph Store:   http://fuseki:3030/ds/data
Admin UI:      http://fuseki:3030
```

Typical connection values:

```text
FUSEKI_HOST=fuseki
FUSEKI_PORT=3030
FUSEKI_URL=http://fuseki:3030
FUSEKI_DATASET=ds
```

## Usage

### Basic SPARQL query

```bash
curl -G "$FUSEKI_URL/$FUSEKI_DATASET/query" \
  --data-urlencode 'query=SELECT * WHERE { ?s ?p ?o } LIMIT 10'
```

### Automatic RDF seeding

Copy `.devcontainer/.env.example` to `.devcontainer/.env` and set one of the seed inputs:

```bash
FUSEKI_SEED_FILE=data/graph/data.ttl
# or
FUSEKI_SEED_DIR=data/graph/seeds
```

Seed loading is opt-in and runs during `postCreateCommand` after Fuseki answers `/$/ping` and the configured dataset exists.

- `append` mode POSTs all seed files into the target graph
- `replace` mode clears the target graph once, then POSTs all seed files
- relative paths are resolved from the workspace root during setup
- auto-detection currently supports `.ttl`, `.nt`, `.nq`, `.trig`, `.rdf`, `.xml`, `.owl`, and `.jsonld`
- when both `FUSEKI_SEED_FILE` and `FUSEKI_SEED_DIR` are empty, the overlay behaves exactly like plain Fuseki

To rerun the import manually:

```bash
bash .devcontainer/seed-fuseki.sh
```

### Example named-graph seed

```bash
FUSEKI_SEED_FILE=data/graph/data.ttl
FUSEKI_SEED_MODE=replace
FUSEKI_SEED_GRAPH=http://example.org/graph/dev
```

## Verification

The overlay ships a `verify.sh` health check that confirms:

- `curl` is available
- `http://fuseki:3030/$/ping` responds
- `/$/datasets/$FUSEKI_DATASET` exists

## References

- [Apache Jena Fuseki Documentation](https://jena.apache.org/documentation/fuseki2/)
- [SPARQL 1.1 Query Language](https://www.w3.org/TR/sparql11-query/)
- [SPARQL 1.1 Update](https://www.w3.org/TR/sparql11-update/)
- [stain/jena-docker](https://github.com/stain/jena-docker)
