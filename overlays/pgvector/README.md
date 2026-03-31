# pgvector Overlay

Adds a PostgreSQL 16 database pre-loaded with the [pgvector](https://github.com/pgvector/pgvector) extension, enabling vector similarity search directly within a familiar SQL environment.

> **Note:** This overlay conflicts with the `postgres` overlay because both provide a PostgreSQL service on port 5432. Choose `pgvector` when you need vector search, or `postgres` for a plain database.

## Features

- **pgvector extension** — `CREATE EXTENSION vector;` is available immediately; no manual installation required
- **Full PostgreSQL 16** — All standard SQL features alongside vector operations
- **`psql` client in devcontainer** — `postgresql-client` package installed for interactive SQL sessions
- **Pre-configured environment** — `PGHOST`, `PGPORT`, `PGDATABASE`, and `PGUSER` set automatically
- **Persistent storage** — Named Docker volume preserves data across container rebuilds
- **Health check** — Compose readiness check using `pg_isready` before dependent services start

## How It Works

pgvector runs as a Docker Compose service (`pgvector`) alongside your devcontainer, using the official `pgvector/pgvector:pg16` image, which bundles PostgreSQL 16 with the pgvector extension pre-compiled and ready to use.

**Service configuration:**

- Image: `pgvector/pgvector:pg16`
- Network: `devnet` (shared with the dev container)
- Port: `5432` (customisable via `PGVECTOR_PORT`)
- Volume: `pgvector-data` for persistent data

The following environment variables are pre-set in the devcontainer for seamless `psql` usage:

| Variable     | Value      |
| ------------ | ---------- |
| `PGHOST`     | `pgvector` |
| `PGPORT`     | `5432`     |
| `PGDATABASE` | `devdb`    |
| `PGUSER`     | `postgres` |

## Getting Started

```bash
# Connect to the database
psql -h pgvector -U postgres -d devdb

# Enable the vector extension (run once per database)
psql -h pgvector -U postgres -d devdb -c "CREATE EXTENSION IF NOT EXISTS vector;"

# Verify the extension is installed
psql -h pgvector -U postgres -d devdb -c "SELECT * FROM pg_extension WHERE extname = 'vector';"
```

## Common Commands

### Vector Operations in SQL

```sql
-- Enable the extension in your database
CREATE EXTENSION IF NOT EXISTS vector;

-- Create a table with a vector column (1536 dimensions for OpenAI embeddings)
CREATE TABLE documents (
    id       SERIAL PRIMARY KEY,
    content  TEXT,
    embedding vector(1536)
);

-- Insert a record with an embedding
INSERT INTO documents (content, embedding)
VALUES ('Hello, world!', '[0.1, 0.2, 0.3, ...]');

-- Cosine similarity search (find closest neighbours)
SELECT id, content, 1 - (embedding <=> '[0.1, 0.2, 0.3, ...]') AS similarity
FROM documents
ORDER BY embedding <=> '[0.1, 0.2, 0.3, ...]'
LIMIT 5;

-- Create an HNSW index for faster approximate search
CREATE INDEX ON documents USING hnsw (embedding vector_cosine_ops);

-- Create an IVFFlat index for large datasets
CREATE INDEX ON documents USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
```

### Database Management

```bash
# Connect interactively
psql

# Run a SQL file
psql -f schema.sql

# Dump the database
pg_dump -h pgvector -U postgres devdb > backup.sql

# Restore from dump
psql -h pgvector -U postgres devdb < backup.sql
```

### Python Integration

```bash
pip install psycopg2-binary pgvector

python - <<'EOF'
import psycopg2
from pgvector.psycopg2 import register_vector
import numpy as np

conn = psycopg2.connect(
    host="pgvector", port=5432,
    dbname="devdb", user="postgres", password="postgres"
)
register_vector(conn)
cur = conn.cursor()

cur.execute("CREATE EXTENSION IF NOT EXISTS vector")
cur.execute("CREATE TABLE IF NOT EXISTS items (id serial PRIMARY KEY, embedding vector(3))")
cur.execute("INSERT INTO items (embedding) VALUES (%s)", (np.array([1, 2, 3]),))
conn.commit()

cur.execute("SELECT * FROM items ORDER BY embedding <-> %s LIMIT 5", (np.array([1, 2, 4]),))
print(cur.fetchall())
conn.close()
EOF
```

## Configuration

### Environment Variables

| Variable            | Default    | Description                                |
| ------------------- | ---------- | ------------------------------------------ |
| `PGVECTOR_VERSION`  | `pg16`     | pgvector image tag (e.g. `pg16`, `pg17`)   |
| `PGVECTOR_DB`       | `devdb`    | Name of the database to create             |
| `PGVECTOR_USER`     | `postgres` | PostgreSQL superuser name                  |
| `PGVECTOR_PASSWORD` | `postgres` | PostgreSQL superuser password              |
| `PGVECTOR_PORT`     | `5432`     | Host port mapped to the PostgreSQL service |

Copy `.devcontainer/.env.example` to `.devcontainer/.env` and customize.

## pgvector vs Qdrant

| Feature              | pgvector (this overlay)         | Qdrant                   |
| -------------------- | ------------------------------- | ------------------------ |
| **Storage model**    | ✅ Relational + vector          | Vector-only              |
| **SQL support**      | ✅ Full PostgreSQL SQL          | ❌ REST/gRPC API only    |
| **Familiar tooling** | ✅ psql, ORMs, existing schema  | New client SDKs required |
| **Query language**   | ✅ SQL with `<->`, `<=>`, `<#>` | ⚠️ JSON query DSL        |
| **Filtering**        | ✅ SQL WHERE clause             | ✅ Payload-based filters |
| **Scale**            | ⚠️ Vertical scaling preferred   | ✅ Distributed by design |
| **Index types**      | IVFFlat, HNSW                   | HNSW                     |

**Choose pgvector when:**

- You already use PostgreSQL and want to add vectors to existing tables
- You need to join vector results with relational data
- Your team is comfortable with SQL

**Choose Qdrant when:**

- Vectors are your primary data model
- You need purpose-built vector search performance at scale
- You want advanced filtering and payload storage

## Use Cases

- **RAG pipelines** — Store document embeddings alongside metadata; retrieve context with SQL joins
- **Semantic search** — Add vector search to an existing PostgreSQL application without a second database
- **Hybrid search** — Combine full-text search (`tsvector`) with vector similarity in a single query
- **Recommendation systems** — Store and query user or item embeddings with familiar SQL tooling

**Integrates well with:**

- `ollama` — Generate embeddings locally with `nomic-embed-text` or similar models
- `python` — `psycopg2` + `pgvector` Python package for seamless integration
- `nodejs` — `pg` driver with raw SQL for vector operations

## Troubleshooting

### Extension Not Found

If `CREATE EXTENSION vector` fails:

```bash
# Confirm pgvector image (not plain postgres) is in use
docker compose ps pgvector

# Check available extensions
psql -h pgvector -U postgres -c "SELECT name FROM pg_available_extensions WHERE name = 'vector';"
```

### Port Conflict with postgres Overlay

The `pgvector` and `postgres` overlays both bind port 5432 and conflict with each other. Select only one.

### Connection Refused

```bash
# Check service health
docker compose ps pgvector
docker compose logs pgvector
```

## References

- [pgvector GitHub](https://github.com/pgvector/pgvector)
- [pgvector Docker Image](https://hub.docker.com/r/pgvector/pgvector)
- [PostgreSQL Documentation](https://www.postgresql.org/docs/16/)
- [pgvector Python package](https://github.com/pgvector/pgvector-python)
- [pgvector Node.js package](https://github.com/pgvector/pgvector-node)

**Related Overlays:**

- [`postgres`](../postgres/README.md) — Plain PostgreSQL without pgvector (conflicts)
- [`qdrant`](../qdrant/README.md) — Purpose-built vector database (alternative)
- [`ollama`](../ollama/README.md) — Local embedding generation
- [`python`](../python/README.md) — Python development environment
