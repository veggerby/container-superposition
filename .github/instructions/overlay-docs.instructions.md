---
applyTo: 'overlays/**/README.md'
---

# GitHub Copilot Instructions: Overlay Documentation

This file provides instructions for GitHub Copilot when generating or improving overlay documentation in the `overlays/` directory.

## Documentation Standard

All overlay README.md files must follow a comprehensive documentation standard to ensure consistency, usability, and professional quality across the project.

**Goals:**

- **Improved onboarding** - Users understand what each overlay does without trial-and-error
- **Better decisions** - Clear use cases help users choose the right overlays
- **Reduced support burden** - Common commands and troubleshooting reduce questions
- **Professional polish** - Consistent documentation demonstrates project maturity
- **Contributor enablement** - Good examples help contributors add new overlays

**Minimum Requirements:**
Every overlay README.md must include at minimum:

1. Title and description
2. Features list
3. How it works (technical explanation)
4. Common commands (practical examples)
5. Use cases
6. References to official documentation

**Additional Sections (as applicable):**

- Authentication/authorization steps
- Configuration (environment variables, settings)
- Benefits vs alternatives (comparison tables)
- Troubleshooting (common issues and solutions)
- Security considerations (for sensitive overlays)

## Required Sections

### 1. Title and Description

**Format:**

```markdown
# [Overlay Name] Overlay

[1-2 sentence description of what this overlay provides]
```

**Example:**

```markdown
# Google Cloud SDK Overlay

Adds Google Cloud SDK (gcloud) with comprehensive tooling for GCP development.
```

### 2. Features

**Format:**

```markdown
## Features

- **[Tool/Feature 1]** - Brief description
- **[Tool/Feature 2]** - Brief description
- **VS Code Extension:** [Extension Name] ([extension.id])
```

**Example:**

```markdown
## Features

- **gcloud CLI** - Google Cloud command-line interface
- **gsutil** - Cloud Storage management
- **bq** - BigQuery command-line tool
- **GKE gcloud auth plugin** - For Kubernetes cluster authentication
- **VS Code Extension:** Cloud Code (googlecloudtools.cloudcode)
```

### 3. How It Works

**Purpose:** Explain the technical implementation or architecture.

**For Service Overlays (postgres, redis, etc.):**

- Docker Compose service configuration
- Network setup (always use `devnet` network)
- Volume mounts and persistence
- Port mappings

**For Tool Overlays (aws-cli, kubectl-helm, etc.):**

- Installation method (apt packages, official installer, etc.)
- Environment setup
- Integration with devcontainer

**Example:**

```markdown
## How It Works

This overlay adds PostgreSQL 16 as a Docker Compose service that runs alongside your development container.

**Service configuration:**
- Image: `postgres:16-alpine`
- Network: `devnet` (shared with dev container)
- Persistence: `postgres-data` volume for database files
- Port: 5432 (customizable via port offset)

The service is accessible from the dev container using the hostname `postgres`.
```

### 4. Authentication (if applicable)

**Include for:** Cloud CLIs, databases with authentication, services requiring credentials.

**Cover:**

- Interactive authentication for development
- Service account/programmatic authentication for CI/CD
- Environment variables and credential files
- Credential storage best practices

**Example:**

```markdown
## Authentication

### Interactive Login (Development)

\```bash
# Login with browser-based OAuth
gcloud auth login

# Set default project
gcloud config set project YOUR_PROJECT_ID
\```

### Service Account (CI/CD)

\```bash
# Using service account JSON key
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
gcloud auth activate-service-account --key-file="${GOOGLE_APPLICATION_CREDENTIALS}"
\```
```

### 5. Common Commands

**Purpose:** Provide practical, copy-paste examples organized by task.

**Format:**

```markdown
## Common Commands

### [Task Category 1]

\```bash
# Comment explaining the command
command --with --flags

# Another example with different options
command --alternative --approach
\```

### [Task Category 2]

\```bash
# More examples
\```
```

**Guidelines:**

- Group commands by logical tasks
- Include comments explaining what each command does
- Show multiple alternatives when relevant
- Use realistic examples (not just placeholders)
- Include common flags and options

**Example:**

```markdown
## Common Commands

### Database Management

\```bash
# Connect to database
psql -h postgres -U postgres -d myapp

# Run SQL file
psql -h postgres -U postgres -d myapp -f schema.sql

# Dump database
pg_dump -h postgres -U postgres myapp > backup.sql
\```

### Query Execution

\```bash
# Interactive shell
psql -h postgres -U postgres -d myapp

# Run single query
psql -h postgres -U postgres -d myapp -c "SELECT * FROM users;"
\```
```

### 6. Use Cases

**Purpose:** Help users decide when to use this overlay.

**Include:**

- Primary use cases (bullet list)
- Integration scenarios with other overlays
- When NOT to use this overlay (if applicable)

**Example:**

```markdown
## Use Cases

- **Backend development** - Applications using PostgreSQL as primary database
- **Microservices** - Shared database for multi-service architectures
- **Testing** - Run integration tests against real database
- **Learning** - Practice SQL and database design

**Integrates well with:**
- Node.js, Python, .NET (application development)
- Grafana (database metrics visualization)
- OTEL Collector (query performance monitoring)
```

### 7. Configuration (if applicable)

**Include when overlay has:**

- Environment variables
- Configuration files
- Customization options
- Port mappings

**Example:**

```markdown
## Configuration

### Environment Variables

The overlay creates `.devcontainer/.env.example`:

\```bash
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=myapp
\```

Copy to `.env` and customize:

\```bash
cd .devcontainer
cp .env.example .env
# Edit .env with your values
\```

### Port Customization

Default port: `5432`

Customize with port offset:
\```bash
npm run init -- --stack compose --db postgres --port-offset 100
# PostgreSQL will be on port 5532
\```
```

### 8. Benefits vs Alternatives (optional but recommended)

**Use when:**

- There are alternative approaches (e.g., Docker-in-Docker vs Docker-outside-of-Docker)
- Comparing with external solutions
- Explaining trade-offs

**Format:** Comparison table with clear pros/cons

**Example:**

```markdown
## Benefits vs Docker-in-Docker

| Feature | Docker-outside-of-Docker (This) | Docker-in-Docker |
|---------|--------------------------------|------------------|
| **Performance** | ✅ Fast (shared cache) | ⚠️ Slower |
| **Disk Usage** | ✅ Efficient (shared images) | ❌ Duplicates images |
| **Security** | ⚠️ Host access | ✅ Isolated |
| **Portability** | ⚠️ Local only | ✅ Works in Codespaces |
```

### 9. Troubleshooting (if applicable)

**Include common issues:**

- Connection problems
- Authentication failures
- Performance issues
- Compatibility problems

**Format:**

```markdown
## Troubleshooting

### Issue: [Problem Description]

**Symptoms:**
- [What the user sees]

**Solution:**
\```bash
# Commands or steps to fix
\```

**Explanation:** [Why this works]
```

### 10. Security Considerations (if applicable)

**Include for:**

- Overlays that mount host resources (docker-sock)
- Cloud CLI tools (mention credential management)
- Database overlays (default passwords, network exposure)

**Example:**

```markdown
## Security Considerations

⚠️ **Warning:** This overlay mounts the host Docker socket, giving the container full control over the host's Docker daemon.

**Risks:**
- Container escape vulnerabilities
- Accidental deletion of host containers
- Access to all Docker resources

**Mitigation:**
- Use only in trusted development environments
- Never expose devcontainer ports publicly
- Consider Docker-in-Docker for untrusted code
```

### 11. References

**Always include:**

- Link to official documentation
- Related overlays
- Useful resources

**Example:**

```markdown
## References

- [Official PostgreSQL Documentation](https://www.postgresql.org/docs/)
- [PostgreSQL Docker Image](https://hub.docker.com/_/postgres)
- [SQL Tutorial](https://www.postgresqltutorial.com/)

**Related Overlays:**
- `nodejs` - Node.js with pg driver
- `python` - Python with psycopg2
- `grafana` - Visualize database metrics
```

## Markdown Formatting Guidelines

### Code Blocks

Always specify the language:

````markdown
```bash
# Bash commands
```

```sql
-- SQL queries
```

```json
// JSON configuration
```

```yaml
# YAML configuration
```
````

### Emphasis

- **Bold** for tool names, important terms, section headers in lists
- *Italic* for file paths, variable names (rarely needed)
- `Code` for commands, file names, environment variables

### Lists

- Use **unordered lists** for features, use cases, general items
- Use **ordered lists** for step-by-step instructions
- Use **nested lists** sparingly

### Tables

Use tables for:

- Comparisons
- Configuration options
- Port mappings
- Feature matrices

## Examples of Well-Documented Overlays

Reference these as templates:

1. **docker-sock** - Comprehensive with security considerations, comparison table, extensive commands
2. **gcloud** - Excellent authentication section, organized commands by service
3. **pulumi** - Good workflow examples, stack management
4. **terraform** - Clear workspace management, provider examples
5. **dotnet** - Clean features list, verification steps
6. **grafana** - Good setup instructions, common tasks

## Context-Specific Guidelines

### For Database Overlays (postgres, redis, etc.)

**Must include:**

- Connection strings/URLs
- Default credentials (and how to change them)
- Common CLI commands (psql, redis-cli, etc.)
- Data persistence information
- Network configuration (hostname = service name)

### For Cloud CLI Overlays (aws-cli, azure-cli, gcloud, etc.)

**Must include:**

- Authentication methods (interactive, service account, environment variables)
- Project/subscription/account setup
- Common service commands (compute, storage, networking)
- Credential management best practices
- Links to official CLI documentation

### For Language Overlays (nodejs, python, dotnet, etc.)

**Must include:**

- Runtime version
- Installed global tools/packages
- VS Code extensions
- Common development commands (build, test, run)
- Package manager usage

### For Observability Overlays (jaeger, prometheus, grafana, etc.)

**Must include:**

- Web UI access (port, URL)
- Integration with other observability tools
- Configuration file locations
- Common queries or dashboard examples
- Data source configuration

### For Dev Tool Overlays (playwright, docker-in-docker, etc.)

**Must include:**

- Tool purpose and use cases
- Setup/initialization steps
- Common workflows
- Integration with CI/CD (if applicable)

## File Location

All overlay documentation files should be located at:

```
overlays/[overlay-id]/README.md
```

## Tone and Style

- **Professional but approachable** - Clear technical writing without jargon overload
- **Practical and actionable** - Focus on what users can DO, not just what exists
- **Concise** - Respect the reader's time, but don't sacrifice clarity
- **Consistent** - Use the same terminology and structure across all overlays

## Quality Checklist

Before considering overlay documentation complete, verify:

- [ ] Title clearly identifies the overlay
- [ ] Description explains what it provides in 1-2 sentences
- [ ] Features section lists key capabilities
- [ ] At least 5 practical command examples provided
- [ ] Code blocks use proper language tags
- [ ] Common use cases listed
- [ ] Authentication documented (if applicable)
- [ ] Security considerations noted (if applicable)
- [ ] Links to official documentation included
- [ ] Formatting is consistent with other overlays
- [ ] No typos or grammar errors

## References

**Example Overlays with Excellent Documentation:**

- `overlays/docker-sock/README.md` - Comprehensive with security considerations, comparison table, extensive commands
- `overlays/gcloud/README.md` - Excellent authentication section, organized commands by service
- `overlays/pulumi/README.md` - Good workflow examples, stack management
- `overlays/terraform/README.md` - Clear workspace management, provider examples
- `overlays/dotnet/README.md` - Clean features list, verification steps
- `overlays/grafana/README.md` - Good setup instructions, common tasks

**Related Instructions:**

- `.github/instructions/overlay-authoring.instructions.md` - Guide for creating overlay files (devcontainer.patch.json, docker-compose.yml, scripts)
- `.github/instructions/overlay-index.instructions.md` - Guide for registering overlays in overlays/index.yml
