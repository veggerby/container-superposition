# Apache Jena Fuseki

Apache Jena Fuseki is a SPARQL 1.1 server that provides REST-style SPARQL HTTP Update, SPARQL Query, and SPARQL Update using the SPARQL protocol over HTTP. It is part of the Apache Jena project and is backed by the TDB2 triplestore for persistent RDF data storage. The server includes a built-in web administration UI for managing datasets, running queries, and monitoring the server.

## Services

| Service | Port | Description                       |
| ------- | ---- | --------------------------------- |
| fuseki  | 3030 | Fuseki SPARQL server and admin UI |

## Configuration

| Parameter               | Default  | Description                                        |
| ----------------------- | -------- | -------------------------------------------------- |
| `FUSEKI_VERSION`        | `latest` | Docker image version tag                           |
| `FUSEKI_PORT`           | `3030`   | Host port mapped to Fuseki (3030 inside container) |
| `FUSEKI_ADMIN_PASSWORD` | `admin`  | Fuseki admin user password                         |
| `FUSEKI_DATASET`        | `ds`     | Name of the default dataset created on first start |

## Connection

From inside the development container, Fuseki is reachable at `http://fuseki:3030`. The default dataset endpoint is at `http://fuseki:3030/ds`.

SPARQL endpoints for the default dataset `ds`:

| Endpoint          | URL                            |
| ----------------- | ------------------------------ |
| SPARQL Query      | `http://fuseki:3030/ds/query`  |
| SPARQL Update     | `http://fuseki:3030/ds/update` |
| Graph Store (GSP) | `http://fuseki:3030/ds/data`   |

The admin UI and REST management API are available at `http://fuseki:3030`.

## Usage

### Running SPARQL Queries with curl

```bash
# Simple SELECT query
curl -X POST \
  -H "Content-Type: application/sparql-query" \
  -d "SELECT * WHERE { ?s ?p ?o } LIMIT 10" \
  http://fuseki:3030/ds/query

# Query with URL encoding
curl -G http://fuseki:3030/ds/query \
  --data-urlencode "query=SELECT * WHERE { ?s ?p ?o } LIMIT 10"
```

### Loading RDF Data

```bash
# Load a Turtle file into the default graph
curl -X PUT \
  -H "Content-Type: text/turtle" \
  --data-binary @data.ttl \
  http://fuseki:3030/ds/data

# Load into a named graph
curl -X PUT \
  -H "Content-Type: text/turtle" \
  --data-binary @data.ttl \
  "http://fuseki:3030/ds/data?graph=http://example.org/mygraph"

# Add data with POST (does not replace existing triples)
curl -X POST \
  -H "Content-Type: text/turtle" \
  --data-binary @more-data.ttl \
  http://fuseki:3030/ds/data
```

### SPARQL Update

```bash
# Insert triples via SPARQL Update
curl -X POST \
  -H "Content-Type: application/sparql-update" \
  -d "INSERT DATA { <http://example.org/subject> <http://example.org/predicate> \"object\" . }" \
  http://fuseki:3030/ds/update
```

### Using Python (SPARQLWrapper)

```bash
pip install SPARQLWrapper
```

```python
from SPARQLWrapper import SPARQLWrapper, JSON

sparql = SPARQLWrapper("http://fuseki:3030/ds/query")
sparql.setReturnFormat(JSON)

sparql.setQuery("""
    PREFIX rdf: <http://www.w3.org/1999/02/22-rdf-syntax-ns#>
    SELECT ?subject ?predicate ?object
    WHERE {
        ?subject ?predicate ?object
    }
    LIMIT 10
""")

results = sparql.query().convert()
for result in results["results"]["bindings"]:
    print(result)
```

### Using Java (Apache Jena)

```xml
<dependency>
    <groupId>org.apache.jena</groupId>
    <artifactId>apache-jena-libs</artifactId>
    <version>5.1.0</version>
    <type>pom</type>
</dependency>
```

```java
import org.apache.jena.query.*;
import org.apache.jena.rdfconnection.RDFConnection;

try (RDFConnection conn = RDFConnection.connect("http://fuseki:3030/ds")) {
    String queryStr = "SELECT * WHERE { ?s ?p ?o } LIMIT 10";
    try (QueryExecution qe = conn.query(queryStr)) {
        ResultSet rs = qe.execSelect();
        ResultSetFormatter.out(System.out, rs);
    }
}
```

### Managing Datasets via REST API

```bash
# List all datasets (requires admin credentials)
curl -u admin:admin http://fuseki:3030/$/datasets

# Create a new TDB2-backed dataset
curl -X POST \
  -u admin:admin \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "dbName=mydata&dbType=tdb2" \
  http://fuseki:3030/$/datasets

# Delete a dataset
curl -X DELETE \
  -u admin:admin \
  http://fuseki:3030/$/datasets/mydata
```

### Admin UI

Open the admin interface at `http://localhost:3030` (forwarded from the container). Log in with username `admin` and the configured `FUSEKI_ADMIN_PASSWORD`. From the UI you can:

- Browse and query datasets
- Upload RDF files
- Create and delete datasets
- Monitor server statistics

## Notes

- This overlay requires the compose stack
- Data is stored in a named Docker volume (`fuseki-data`) and persists across container restarts
- The `FUSEKI_DATASET` parameter sets the dataset name created automatically on the first container start; additional datasets can be created via the admin UI or REST API
- The TDB2 backend is used by default, which offers better concurrency and performance than TDB1
- Use hostname `fuseki` from within the development container; use `localhost` from the host machine
- The `FUSEKI_ADMIN_PASSWORD` should be changed from the default in any shared environment
