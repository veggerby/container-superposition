# Messaging Overlays Quick Start

Messaging overlays use the same project-file-first workflow as every other
selection. `superposition.yml` is the shared team input; use a flat
`overlays:` list. Generated `superposition.json` is a compatibility receipt,
not a messaging configuration file to hand-edit.

## Discover, inspect, and preview

```bash
npx container-superposition list --category messaging
npx container-superposition explain rabbitmq
npx container-superposition explain redpanda
npx container-superposition explain nats

npx container-superposition plan --stack compose --overlays nodejs,rabbitmq
npx container-superposition plan --stack compose --overlays nodejs,rabbitmq --verbose
npx container-superposition plan --stack compose --overlays nodejs,rabbitmq --diff
```

Use `--verbose` to inspect dependencies and inclusion reasons. Use `--diff`
before replacing existing generated output. Messaging overlays require the
`compose` stack; `explain <id>` is the current source for parameters, ports,
and compatibility.

## RabbitMQ

```yaml
# superposition.yml
stack: compose
overlays:
    - nodejs
    - rabbitmq
```

```bash
npx container-superposition init --no-interactive
# Later, after editing the project file:
npx container-superposition regen
```

RabbitMQ provides AMQP and a management UI. Its default credentials and port
parameters are shown by `explain rabbitmq`; use project-file parameters or
normal secret-management practices rather than placing production credentials
in documentation examples.

## Redpanda

```yaml
# superposition.yml
stack: compose
overlays:
    - redpanda
```

```bash
npx container-superposition plan --stack compose --overlays redpanda --diff
npx container-superposition init --no-interactive
```

Redpanda provides Kafka-compatible event streaming and a web console. It
conflicts with some language and demo overlays, so inspect it with
`explain redpanda` before combining it with another stack.

## NATS

```yaml
# superposition.yml
stack: compose
overlays:
    - nodejs
    - nats
    - postgres
```

```bash
npx container-superposition plan --stack compose --overlays nodejs,nats,postgres --verbose
npx container-superposition init --no-interactive
```

NATS provides pub/sub messaging with JetStream. `explain nats` reports its
client, monitoring, and clustering ports.

## Change a messaging stack safely

1. Edit the committed `superposition.yml` overlay list.
2. Run `plan --stack compose --overlays <the intended comma-separated list>`.
3. Run `plan --diff` to review the generated-output change.
4. Run `regen` only after the preview is acceptable.

For a common job, a preset may be a useful starting shortcut, but keep the
resulting shared project file as the team-reviewed source of truth. For a
legacy manifest-only repository, run `migrate` once before normal `regen`
workflows.

## Verify the generated environment

After generation, reopen the project in a Dev Container and use the connection
information reported by `explain <overlay>` or the generated configuration.
For service diagnostics, inspect the Compose services with your normal Docker
or Dev Container tooling. Do not treat edits to generated `.devcontainer/`
files as durable shared intent: update `superposition.yml` and regenerate.

See [Quick reference](quick-reference.md),
[Authoring `superposition.yml`](superposition-yml.md), and the individual
overlay READMEs for full parameter details.
