# Compose Overlay Audit for Repeatability Rollout

Prepared for spec `051-repeatable-compose-overlay-rollout`.

## Current compose-capable catalog

| Overlay          | Category      | Services in compose file           | Repeatable today | Notable coupling/risk signals                                                                                |
| ---------------- | ------------- | ---------------------------------- | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| alertmanager     | observability | 1                                  | no               | requires `prometheus`                                                                                        |
| comfyui          | dev           | 2 (`devcontainer`, `comfyui`)      | no               | overlay-owned app stack, sidecar-style compose shape                                                         |
| fuseki           | database      | 1                                  | no               | self-contained single service                                                                                |
| grafana          | observability | 1                                  | no               | requires `prometheus`; copies provisioning files with overlay-specific names                                 |
| jaeger           | observability | 2 (`jaeger`, `devcontainer`)       | no               | overlay-owned `devcontainer` service name                                                                    |
| jupyter          | language      | 1                                  | no               | app-style service, user-facing URL contract                                                                  |
| keycloak         | dev           | 1                                  | no               | requires `postgres`; compose file hard-codes `jdbc:postgresql://postgres:5432/...` and `depends_on.postgres` |
| localstack       | cloud         | 1                                  | no               | multiple exposed ports; cloud endpoint env contract                                                          |
| loki             | observability | 1                                  | no               | log-stack coupling with `promtail`                                                                           |
| mailpit          | dev           | 1                                  | no               | two exposed ports, SMTP/UI env contract                                                                      |
| minio            | database      | 1                                  | no               | API + console ports; credential env contract                                                                 |
| mongodb          | database      | 2 (`mongodb`, `mongo-express`)     | no               | sidecar service references `mongodb` by name                                                                 |
| mysql            | database      | 2 (`mysql`, `phpmyadmin`)          | no               | sidecar service references `mysql` by name                                                                   |
| nats             | messaging     | 1                                  | no               | self-contained single service, multi-port                                                                    |
| ollama           | dev           | 1                                  | no               | single service but tool/UI clients may assume singleton endpoint                                             |
| open-webui       | dev           | 1                                  | no               | default `OLLAMA_BASE_URL` assumes singleton `ollama` host                                                    |
| otel-collector   | observability | 1                                  | no               | central endpoint for demo overlays                                                                           |
| otel-demo-nodejs | observability | 1                                  | no               | requires `otel-collector`; sample app semantics                                                              |
| otel-demo-python | observability | 1                                  | no               | requires `otel-collector`; sample app semantics                                                              |
| pgvector         | database      | 1                                  | no               | conflicts with `postgres`; adjacent but distinct database family                                             |
| postgres         | database      | 1                                  | yes              | tokenized for `CS_INSTANCE` / `CS_INSTANCE_SUFFIX`                                                           |
| prometheus       | observability | 1                                  | no               | copied config file and downstream dependencies                                                               |
| promtail         | observability | 1                                  | no               | requires `loki`; log shipping target contract                                                                |
| qdrant           | database      | 1                                  | no               | REST + gRPC ports                                                                                            |
| rabbitmq         | messaging     | 1                                  | no               | hostname set to `rabbitmq`; AMQP + management UI                                                             |
| redis            | database      | 1                                  | no               | self-contained single service                                                                                |
| redpanda         | messaging     | 2 (`redpanda`, `redpanda-console`) | no               | console references broker service names; 5 ports                                                             |
| sqlserver        | database      | 1                                  | no               | self-contained single service                                                                                |
| tempo            | observability | 1                                  | no               | conflicts with `jaeger`; tracing backend role                                                                |

## Likely rollout groupings

### Group 1 — self-contained single-service infrastructure overlays

Best fit for the first follow-on rollout because they are compose-only, mostly stateful infrastructure, and do not obviously depend on another overlay family or sidecar service.

Candidate overlays:

- `redis`
- `fuseki`
- `sqlserver`
- `nats`

Possible stretch candidates if audit stays clean:

- `mailpit`
- `ollama`
- `qdrant`
- `minio`
- `rabbitmq`
- `localstack`

### Group 2 — overlays with internal sidecars or multi-service identity

Need stronger audit because one overlay instance fans out into more than one service or admin surface and internal references must all namespace together.

Candidate overlays:

- `mongodb`
- `mysql`
- `redpanda`
- `comfyui`
- `jaeger`
- `jupyter`

### Group 3 — dependency-bound overlays and observability stacks

Need explicit product/architecture decisions because repeated instances raise “which dependency instance do I bind to?” and “how are copied config files and dashboards namespaced?” questions.

Candidate overlays:

- `keycloak` (depends on `postgres` and hard-codes the singleton hostname)
- `grafana`
- `prometheus`
- `alertmanager`
- `loki`
- `promtail`
- `tempo`
- `otel-collector`
- `otel-demo-nodejs`
- `otel-demo-python`
- `open-webui`

## Key product implications

1. The catalog is not uniform: some overlays are close to the `postgres` repeatability pattern, while others embed singleton peer contracts.
2. The next spec should prefer phased enablement over “all compose overlays become repeatable.”
3. Dependency-bound overlays are the main blocker for broad rollout because current repeatable behavior is family-level, not instance-targeted.
4. User-facing docs should continue to describe repeatability as an audited overlay capability, not a compose-wide guarantee.
