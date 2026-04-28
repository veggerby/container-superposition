# Apache Jena Fuseki Overlay

SPARQL 1.1 server and RDF triplestore powered by Apache Jena TDB2, with a built-in web administration UI.

## Features

- **Apache Jena Fuseki** — SPARQL 1.1 server supporting queries, updates, and the Graph Store Protocol
- **TDB2 triplestore** — High-performance persistent RDF storage with better concurrency than TDB1
- **Admin web UI** — Browser-based interface for managing datasets, running ad-hoc queries, and monitoring the server (port 3030)
- **REST management API** — Create, list, and delete datasets without restarting the server
- **Dataset auto-creation** — A default dataset is created automatically on first start
- **Persistent storage** — RDF data is stored in a named Docker volume (`fuseki-data`) and survives container restarts
- **Docker Compose service** — Runs as an isolated sidecar container accessible on the `devnet` network

## How It Works

This overlay adds Fuseki as a separate Docker Compose service. Fuseki runs inside its own container and is reachable from your development container using the hostname `fuseki`.

**Service configuration:**

- Image: `ghcr.io/stain/jena-fuseki`
- Network: `devnet` (shared with the dev container)
- Persistence: `fuseki-data` volume for TDB2 database files
- Port: 3030 (customizable via `FUSEKI_PORT` host mapping)

**Environment variables set in the dev container:**

| Variable                | Value                | Description                               |
| ----------------------- | -------------------- | ----------------------------------------- |
| `FUSEKI_HOST`           | `fuseki`             | Container hostname for internal access    |
| `FUSEKI_PORT`           | `3030`               | Container-internal port for SPARQL access |
| `FUSEKI_URL`            | `http://fuseki:3030` | Base URL for SPARQL requests              |
| `FUSEKI_DATASET`        | `ds` (default)       | Name of the default dataset               |
| `FUSEKI_ADMIN_PASSWORD` | see `.env`           | Admin user password (set in `.env`)       |

## Common Commands

### SPARQL Queries

```bash
# Simple SELECT query
curl -X POST \
  -H "Content-Type: application/sparql-query" \
  -d "SELECT * WHERE { ?s ?p ?o } LIMIT 10" \
  "$FUSEKI_URL/$FUSEKI_DATASET/query"

# Query with URL encoding (GET request)
curl -G "$FUSEKI_URL/$FUSEKI_DATASET/query" \
  --data-urlencode "query=SELECT * WHERE { ?s ?p ?o } LIMIT 10"
```

### Loading RDF Data

```bash
# Load a Turtle file into the default graph
curl -X PUT \
  -H "Content-Type: text/turtle" \
  --data-binary @data.ttl \
  "$FUSEKI_URL/$FUSEKI_DATASET/data"

# Add data without replacing existing triples (POST)
curl -X POST \
  -H "Content-Type: text/turtle" \
  --data-binary @more-data.ttl \
  "$FUSEKI_URL/$FUSEKI_DATASET/data"

# Load into a named graph
curl -X PUT \
  -H "Content-Type: text/turtle" \
  --data-binary @data.ttl \
  "$FUSEKI_URL/$FUSEKI_DATASET/data?graph=http://example.org/mygraph"
```

### SPARQL Update

```bash
# Insert triples via SPARQL Update
curl -X POST \
  -H "Content-Type: application/sparql-update" \
  -d "INSERT DATA { <http://example.org/s> <http://example.org/p> \"o\" . }" \
  "$FUSEKI_URL/$FUSEKI_DATASET/update"
```

### Dataset Management

```bash
# List all datasets (requires admin credentials)
curl -u "admin:$FUSEKI_ADMIN_PASSWORD" "$FUSEKI_URL/\$/datasets"

# Create a new TDB2-backed dataset
curl -X POST \
  -u "admin:$FUSEKI_ADMIN_PASSWORD" \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "dbName=mydata&dbType=tdb2" \
  "$FUSEKI_URL/\$/datasets"

# Delete a dataset
curl -X DELETE \
  -u "admin:$FUSEKI_ADMIN_PASSWORD" \
  "$FUSEKI_URL/\$/datasets/mydata"
```

### Admin UI

```bash
# Open in browser (from the host machine)
open http://localhost:3030
```

Log in with username `admin` and the configured `FUSEKI_ADMIN_PASSWORD`. From the UI you can browse and query datasets, upload RDF files, create/delete datasets, and monitor server statistics.

## Use Cases

- **Semantic web development** — Prototype and test OWL/RDFS ontologies and SPARQL queries locally
- **Linked data applications** — Build applications that consume or publish RDF data
- **Knowledge graph projects** — Store, update, and query knowledge graphs during development
- **Data integration** — Use SPARQL Federation or CONSTRUCT queries to merge heterogeneous data sources
- **Research and education** — Run SPARQL 1.1 workloads without a cloud account

**Integrates well with:**

- `java` — Use Apache Jena client library (`jena-arq`) for typed SPARQL queries
- `python` — Use `SPARQLWrapper` or `rdflib-endpoint` for data science workflows
- `nodejs` — Use `n3` or `comunica` for JavaScript/TypeScript SPARQL clients

## Configuration

### Environment Variables

The overlay includes a `.env.example` file. Copy and customize:

```bash
cd .devcontainer
cp .env.example .env
```

**Default values (`.devcontainer/.env.example`):**

```bash
FUSEKI_VERSION=latest
FUSEKI_PORT=3030
FUSEKI_ADMIN_PASSWORD=admin   # ⚠ Change this for any shared environment
FUSEKI_DATASET=ds
```

⚠️ **Security:** The default `FUSEKI_ADMIN_PASSWORD=admin` must be changed for any environment accessible beyond localhost.

### SPARQL Endpoints

Default dataset `ds` endpoints (from inside the dev container):

| Endpoint          | URL                            |
| ----------------- | ------------------------------ |
| SPARQL Query      | `http://fuseki:3030/ds/query`  |
| SPARQL Update     | `http://fuseki:3030/ds/update` |
| Graph Store (GSP) | `http://fuseki:3030/ds/data`   |
| Admin UI          | `http://fuseki:3030`           |

All endpoints are also forwarded to `localhost:3030` on the host machine.

## References

- [Apache Jena Fuseki Documentation](https://jena.apache.org/documentation/fuseki2/)
- [SPARQL 1.1 Query Language](https://www.w3.org/TR/sparql11-query/)
- [SPARQL 1.1 Update](https://www.w3.org/TR/sparql11-update/)
- [Fuseki Docker Image (stain/jena-docker)](https://github.com/stain/jena-docker)
- [Apache Jena TDB2](https://jena.apache.org/documentation/tdb2/)

**Related Overlays:**

- `java` — Develop JVM applications using Apache Jena client libraries
- `python` — Use RDFLib or SPARQLWrapper for Python-based SPARQL workflows
- `nodejs` — Build JavaScript SPARQL clients with Comunica or N3.js
