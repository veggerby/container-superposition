# Qdrant Overlay

Adds [Qdrant](https://qdrant.tech) as a Docker Compose service, providing a high-performance vector database for similarity search and embedding-based retrieval.

## Features

- **Qdrant vector database** — Store, index, and query high-dimensional embedding vectors at scale
- **REST API on port 6333** — Full-featured HTTP API for collections, points, and search
- **gRPC API on port 6334** — High-throughput binary protocol for production workloads
- **Persistent storage** — Named Docker volume preserves data across container rebuilds
- **Pre-configured `QDRANT_URL`** — Container environment variable set for easy SDK usage
- **Health check** — Compose readiness check against `/readyz` before dependent services start

## How It Works

Qdrant runs as a Docker Compose service alongside your devcontainer. The devcontainer connects to it using the hostname `qdrant` on port `6333` (REST) or `6334` (gRPC).

**Service configuration:**

- Image: `qdrant/qdrant:latest`
- Network: `devnet` (shared with the dev container)
- Ports: `6333` (REST API), `6334` (gRPC)
- Volume: `qdrant-data` for persistent vector storage

The following environment variables are pre-set in the devcontainer:

| Variable      | Value                |
| ------------- | -------------------- |
| `QDRANT_HOST` | `qdrant`             |
| `QDRANT_PORT` | `6333`               |
| `QDRANT_URL`  | `http://qdrant:6333` |

## Common Commands

### REST API

```bash
# Health check
curl http://qdrant:6333/healthz

# Create a collection
curl -X PUT http://qdrant:6333/collections/my_collection \
  -H "Content-Type: application/json" \
  -d '{
    "vectors": {
      "size": 1536,
      "distance": "Cosine"
    }
  }'

# Insert points
curl -X PUT http://qdrant:6333/collections/my_collection/points \
  -H "Content-Type: application/json" \
  -d '{
    "points": [
      {
        "id": 1,
        "vector": [0.1, 0.2, 0.3],
        "payload": {"text": "example document"}
      }
    ]
  }'

# Search for similar vectors
curl -X POST http://qdrant:6333/collections/my_collection/points/search \
  -H "Content-Type: application/json" \
  -d '{
    "vector": [0.1, 0.2, 0.3],
    "limit": 5
  }'

# List collections
curl http://qdrant:6333/collections
```

### Python SDK

```bash
pip install qdrant-client

python - <<'EOF'
from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct

client = QdrantClient(url="http://qdrant:6333")

# Create collection
client.create_collection(
    collection_name="my_collection",
    vectors_config=VectorParams(size=1536, distance=Distance.COSINE),
)

# Insert vectors
client.upsert(
    collection_name="my_collection",
    points=[
        PointStruct(id=1, vector=[0.1] * 1536, payload={"text": "hello"})
    ],
)

# Search
results = client.search(
    collection_name="my_collection",
    query_vector=[0.1] * 1536,
    limit=5,
)
print(results)
EOF
```

### Node.js SDK

```bash
npm install @qdrant/js-client-rest

node - <<'EOF'
import { QdrantClient } from "@qdrant/js-client-rest";

const client = new QdrantClient({ url: "http://qdrant:6333" });

await client.createCollection("my_collection", {
  vectors: { size: 1536, distance: "Cosine" },
});

const results = await client.search("my_collection", {
  vector: Array(1536).fill(0.1),
  limit: 5,
});
console.log(results);
EOF
```

## Configuration

### Environment Variables

| Variable           | Default  | Description             |
| ------------------ | -------- | ----------------------- |
| `QDRANT_VERSION`   | `latest` | Qdrant Docker image tag |
| `QDRANT_PORT`      | `6333`   | Host port for REST API  |
| `QDRANT_GRPC_PORT` | `6334`   | Host port for gRPC API  |

### Port Customization

```bash
# .devcontainer/.env
QDRANT_PORT=6335
QDRANT_GRPC_PORT=6336
```

## Use Cases

- **RAG (Retrieval-Augmented Generation)** — Store embeddings for document chunks; retrieve context for LLM queries
- **Semantic search** — Find similar documents, images, or code snippets by embedding similarity
- **Recommendation systems** — Surface similar items based on learned embeddings
- **Anomaly detection** — Identify outliers in high-dimensional embedding spaces
- **Local AI pipelines** — Pair with `ollama` for fully offline embedding + retrieval workflows

**Integrates well with:**

- `ollama` — Generate embeddings locally (`ollama pull nomic-embed-text`)
- `python` — LangChain, LlamaIndex, or raw `qdrant-client` integrations
- `nodejs` — `@qdrant/js-client-rest` for JavaScript embeddings workflows

## Troubleshooting

### Service Not Ready

```bash
# Check service status
docker compose ps qdrant

# View Qdrant logs
docker compose logs qdrant

# Test health endpoint
curl http://qdrant:6333/healthz
```

### Port Conflict

If ports 6333 or 6334 are already in use:

```bash
# .devcontainer/.env
QDRANT_PORT=6335
QDRANT_GRPC_PORT=6336
```

### Data Persistence

Qdrant data is stored in the `qdrant-data` named Docker volume. It persists across container rebuilds but is scoped to the Docker environment:

```bash
# Inspect the volume
docker volume inspect qdrant-data

# Backup data
docker run --rm -v qdrant-data:/data -v $(pwd):/backup alpine \
  tar czf /backup/qdrant-backup.tar.gz /data
```

## References

- [Qdrant Documentation](https://qdrant.tech/documentation/)
- [Qdrant REST API Reference](https://qdrant.github.io/qdrant/redoc/index.html)
- [Qdrant Docker Hub](https://hub.docker.com/r/qdrant/qdrant)
- [Python SDK](https://python-client.qdrant.tech/)
- [JavaScript SDK](https://github.com/qdrant/qdrant-js)

**Related Overlays:**

- [`pgvector`](../pgvector/README.md) — PostgreSQL-native vector storage (alternative; conflicts with `postgres`)
- [`ollama`](../ollama/README.md) — Local LLM and embedding generation
- [`python`](../python/README.md) — Python development environment
- [`nodejs`](../nodejs/README.md) — Node.js development environment
