# Compose Overlay Audit for Repeatability Rollout

Prepared for spec `051-repeatable-compose-overlay-rollout`.

## Catalog coverage for this audit

This artifact now serves as the catalog-wide repeatability assessment required by spec `051`.

- Total overlays assessed: 82
- Compose-capable overlays assessed for repeatable enablement/defer/block decisions: 29
- Non-compose overlays assessed as not applicable to the `repeatable` flag in this spec: 53

Assessment outcomes used here:

- **Fixed/enabled in spec 051** — compose-capable and approved for `repeatable: true` in this rollout
- **Not fixed in spec 051 (deferred/blocked compose)** — compose-capable but not approved for `repeatable: true` yet
- **Not applicable in spec 051** — non-compose overlay; repeatable flag out of scope unless a future spec first broadens compose support

## What spec 051 fixed vs did not fix

### Fixed/enabled in spec 051

These overlays were audited, hardened, and shipped with `repeatable: true`:

- `postgres` (existing reference implementation retained)
- `redis`
- `fuseki`
- `sqlserver`
- `nats`

### Not fixed in spec 051 — compose overlays left non-repeatable

These overlays were assessed but intentionally remain non-repeatable after this spec:

- **Deferred Class A / further reassessment needed**: `qdrant`, `minio`, `rabbitmq`, `mailpit`, `localstack`, `ollama`
- **Multi-service / sidecar class not fixed in this slice**: `mongodb`, `mysql`, `redpanda`, `comfyui`, `jaeger`, `jupyter`
- **Dependency-bound / topology-bound and blocked in this slice**: `keycloak`, `grafana`, `prometheus`, `alertmanager`, `loki`, `promtail`, `tempo`, `otel-collector`, `otel-demo-nodejs`, `otel-demo-python`, `open-webui`, `pgvector`

### Not applicable in spec 051

These overlays were assessed but are not compose-capable, so spec 051 did not attempt a `repeatable` rollout for them:

- `all`, `amp`, `ansible`, `argocd`, `aws-cli`, `azure-cli`, `bun`, `claude-code`, `cloudflared`, `codex`, `commitlint`, `copilot-cli`, `cuda`, `devcontainer-cli`, `direnv`, `docker-in-docker`, `docker-sock`, `dotnet`, `duckdb`, `gcloud`, `gemini-cli`, `git-helpers`, `go`, `grpc-tools`, `java`, `just`, `k3d`, `kind`, `kubectl-helm`, `mkdocs`, `mkdocs2`, `modern-cli-tools`, `ngrok`, `nodejs`, `ollama-cli`, `openapi-tools`, `opencode`, `pandoc`, `pi`, `playwright`, `powershell`, `pre-commit`, `pulumi`, `python`, `rocm`, `rust`, `skaffold`, `spec-kit`, `sqlite`, `task`, `terraform`, `tilt`, `windsurf-cli`

## Current compose-capable catalog

| Overlay          | Category      | Services in compose file           | Outcome                                          | Repeatable today | Notable coupling/risk signals                                                                                |
| ---------------- | ------------- | ---------------------------------- | ------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------ |
| alertmanager     | observability | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | requires `prometheus`                                                                                        |
| comfyui          | dev           | 2 (`devcontainer`, `comfyui`)      | Not fixed in spec 051 (deferred/blocked compose) | no               | overlay-owned app stack, sidecar-style compose shape                                                         |
| fuseki           | database      | 1                                  | Fixed/enabled in spec 051                        | yes              | self-contained single service; setup/verify scripts and copied assets now namespace per instance             |
| grafana          | observability | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | requires `prometheus`; copies provisioning files with overlay-specific names                                 |
| jaeger           | observability | 2 (`jaeger`, `devcontainer`)       | Not fixed in spec 051 (deferred/blocked compose) | no               | overlay-owned `devcontainer` service name                                                                    |
| jupyter          | language      | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | app-style service, user-facing URL contract                                                                  |
| keycloak         | dev           | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | requires `postgres`; compose file hard-codes `jdbc:postgresql://postgres:5432/...` and `depends_on.postgres` |
| localstack       | cloud         | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | multiple exposed ports; cloud endpoint env contract                                                          |
| loki             | observability | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | log-stack coupling with `promtail`                                                                           |
| mailpit          | dev           | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | two exposed ports, SMTP/UI env contract                                                                      |
| minio            | database      | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | API + console ports; credential env contract                                                                 |
| mongodb          | database      | 2 (`mongodb`, `mongo-express`)     | Not fixed in spec 051 (deferred/blocked compose) | no               | sidecar service references `mongodb` by name                                                                 |
| mysql            | database      | 2 (`mysql`, `phpmyadmin`)          | Not fixed in spec 051 (deferred/blocked compose) | no               | sidecar service references `mysql` by name                                                                   |
| nats             | messaging     | 1                                  | Fixed/enabled in spec 051                        | yes              | self-contained single service, multi-port, and namespaced monitoring/client identities                       |
| ollama           | dev           | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | single service but tool/UI clients may assume singleton endpoint                                             |
| open-webui       | dev           | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | default `OLLAMA_BASE_URL` assumes singleton `ollama` host                                                    |
| otel-collector   | observability | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | central endpoint for demo overlays                                                                           |
| otel-demo-nodejs | observability | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | requires `otel-collector`; sample app semantics                                                              |
| otel-demo-python | observability | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | requires `otel-collector`; sample app semantics                                                              |
| pgvector         | database      | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | conflicts with `postgres`; adjacent but distinct database family                                             |
| postgres         | database      | 1                                  | Fixed/enabled in spec 051 (existing reference)   | yes              | tokenized for `CS_INSTANCE` / `CS_INSTANCE_SUFFIX`                                                           |
| prometheus       | observability | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | copied config file and downstream dependencies                                                               |
| promtail         | observability | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | requires `loki`; log shipping target contract                                                                |
| qdrant           | database      | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | REST + gRPC ports                                                                                            |
| rabbitmq         | messaging     | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | hostname set to `rabbitmq`; AMQP + management UI                                                             |
| redis            | database      | 1                                  | Fixed/enabled in spec 051                        | yes              | self-contained single service; compose, devcontainer, and verify script identities namespace per instance    |
| redpanda         | messaging     | 2 (`redpanda`, `redpanda-console`) | Not fixed in spec 051 (deferred/blocked compose) | no               | console references broker service names; 5 ports                                                             |
| sqlserver        | database      | 1                                  | Fixed/enabled in spec 051                        | yes              | self-contained single service; compose, devcontainer, and verify script identities namespace per instance    |
| tempo            | observability | 1                                  | Not fixed in spec 051 (deferred/blocked compose) | no               | conflicts with `jaeger`; tracing backend role                                                                |

## Non-compose overlays assessed as not applicable

These overlays were assessed and are out of scope for the `repeatable` flag because they do not currently support compose, so they were not fixed in spec 051:

- `all`, `amp`, `ansible`, `argocd`, `aws-cli`, `azure-cli`, `bun`, `claude-code`, `cloudflared`, `codex`, `commitlint`, `copilot-cli`, `cuda`, `devcontainer-cli`, `direnv`, `docker-in-docker`, `docker-sock`, `dotnet`, `duckdb`, `gcloud`, `gemini-cli`, `git-helpers`, `go`, `grpc-tools`, `java`, `just`, `k3d`, `kind`, `kubectl-helm`, `mkdocs`, `mkdocs2`, `modern-cli-tools`, `ngrok`, `nodejs`, `ollama-cli`, `openapi-tools`, `opencode`, `pandoc`, `pi`, `playwright`, `powershell`, `pre-commit`, `pulumi`, `python`, `rocm`, `rust`, `skaffold`, `spec-kit`, `sqlite`, `task`, `terraform`, `tilt`, `windsurf-cli`

## Likely rollout groupings

### Group 1 — self-contained single-service infrastructure overlays

Best fit for the first follow-on rollout because they are compose-only, mostly stateful infrastructure, and do not obviously depend on another overlay family or sidecar service.

Enabled in this rollout:

- `postgres`
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
