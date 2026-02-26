# Security Considerations

Container Superposition is designed for **development environments only**. Use these guardrails to avoid common pitfalls.

## Docker Socket Access (`docker-sock`)

**Risk**: Mounting `/var/run/docker.sock` gives the container full control of the host Docker daemon.

Recommended usage:

- Use `docker-sock` only on local machines with trusted code.
- Prefer `docker-in-docker` for isolation or cloud IDEs.
- Never use `docker-sock` in multi-tenant or production environments.

## Database Defaults

Database overlays ship with **development-only defaults** (e.g., `postgres/postgres`).

Recommended usage:

- Rotate credentials for any shared or networked environment.
- Keep services on private networks.
- Put real credentials in `.env` (gitignored), not `.env.example`.

## Environment Files

- `.env.example` is committed and contains templates.
- `.env` is gitignored and contains real values.

Recommended usage:

- Copy `.env.example` to `.env` and customize.
- Keep `.env` out of version control.
- Use placeholder values in `.env.example`.

## General Principles

- Treat generated configs as dev-only.
- Avoid exposing devcontainer ports publicly.
- Keep base images and overlays updated.
- Audit dependencies in your devcontainer.

For overlay-specific notes, see each overlay README (for example, `overlays/docker-sock/README.md`).
