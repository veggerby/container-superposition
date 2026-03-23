# Common Docker Compose Healthcheck Patterns

Reference library of standard healthcheck patterns for common services. This is a **documentation file only** — it cannot be imported via `overlay.yml` `imports:` because it is not a devcontainer patch.

Copy the relevant pattern directly into your overlay's `docker-compose.yml`.

## HTTP

```yaml
healthcheck:
    test: ['CMD-SHELL', 'curl -f http://localhost:${PORT}/health || exit 1']
    interval: 30s
    timeout: 10s
    retries: 3
    start_period: 40s
```

## PostgreSQL

```yaml
healthcheck:
    test: ['CMD-SHELL', 'pg_isready -U ${POSTGRES_USER:-postgres}']
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
```

## Redis

```yaml
healthcheck:
    test: ['CMD', 'redis-cli', 'ping']
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
```

## MongoDB

```yaml
healthcheck:
    test: ['CMD', 'mongosh', '--eval', "db.adminCommand('ping')"]
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
```

## MySQL

```yaml
healthcheck:
    test: ['CMD', 'mysqladmin', 'ping', '-h', 'localhost']
    interval: 10s
    timeout: 5s
    retries: 5
    start_period: 10s
```
