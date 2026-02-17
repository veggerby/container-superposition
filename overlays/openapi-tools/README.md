# OpenAPI Tools Overlay

OpenAPI/Swagger tooling for API development, documentation, and validation.

## Features

- **swagger-cli** - OpenAPI/Swagger validation
- **spectral** - OpenAPI linting with customizable rules
- **redocly** - Documentation generation and API bundling
- **npm-based** - Easy to install and update

## How It Works

This overlay installs OpenAPI development tools as global npm packages. These tools help you create, validate, lint, and document APIs using the OpenAPI Specification (formerly Swagger).

**Suggested overlays:**

- `nodejs` - Node.js runtime for running OpenAPI tools

## Installation

OpenAPI tools are installed automatically during devcontainer creation via `setup.sh`:

- `@apidevtools/swagger-cli` - OpenAPI validation
- `@stoplight/spectral-cli` - OpenAPI linting
- `@redocly/cli` - Documentation and bundling

## Common Commands

### Validation

```bash
# Validate OpenAPI specification
swagger-cli validate openapi.yaml

# Validate with detailed output
swagger-cli validate openapi.yaml --debug

# Bundle multiple files into one
swagger-cli bundle openapi.yaml --outfile bundled.yaml --type yaml
```

### Linting

```bash
# Lint OpenAPI spec with spectral
spectral lint openapi.yaml

# Use custom ruleset
spectral lint openapi.yaml --ruleset .spectral.yaml

# Output as JSON
spectral lint openapi.yaml --format json
```

### Redocly CLI

```bash
# Lint with redocly
redocly lint openapi.yaml

# Bundle specification
redocly bundle openapi.yaml -o bundled.yaml

# Build documentation
redocly build-docs openapi.yaml

# Preview documentation locally
redocly preview-docs openapi.yaml
```

## Configuration

### Spectral Ruleset

Create `.spectral.yaml` for custom linting rules:

```yaml
extends: [[spectral:oas, all]]

rules:
    operation-description: error
    operation-tags: error
    operation-operationId: error

    # Custom rules
    my-custom-rule:
        description: Ensure all operations have examples
        given: $.paths[*][*].responses[*].content[*]
        severity: warn
        then:
            field: example
            function: truthy
```

### Redocly Configuration

Create `redocly.yaml`:

```yaml
apis:
    main:
        root: ./openapi.yaml

lint:
    extends:
        - recommended

    rules:
        operation-description: error
        operation-tags: error
```

## Use Cases

- **API design** - Design and validate OpenAPI specifications
- **Documentation** - Generate beautiful API documentation
- **Quality assurance** - Lint APIs for best practices
- **Code generation** - Validate specs before code generation
- **CI/CD** - Automated API validation in pipelines

**Integrates well with:**

- `nodejs` - Node.js runtime (suggested)
- Any REST API framework (Express, FastAPI, ASP.NET Core, etc.)
- `docker-in-docker` or `docker-sock` - For containerized API testing

## OpenAPI Specification Basics

### Minimal Example

```yaml
openapi: 3.0.0
info:
    title: My API
    version: 1.0.0
    description: API description

servers:
    - url: http://localhost:3000
      description: Development server

paths:
    /users:
        get:
            summary: Get all users
            operationId: getUsers
            tags:
                - users
            responses:
                '200':
                    description: Successful response
                    content:
                        application/json:
                            schema:
                                type: array
                                items:
                                    $ref: '#/components/schemas/User'

components:
    schemas:
        User:
            type: object
            required:
                - id
                - name
            properties:
                id:
                    type: integer
                name:
                    type: string
                email:
                    type: string
                    format: email
```

## Workflow

### Development Workflow

1. **Design**: Create OpenAPI spec (YAML or JSON)
2. **Validate**: `swagger-cli validate openapi.yaml`
3. **Lint**: `spectral lint openapi.yaml`
4. **Preview**: `redocly preview-docs openapi.yaml`
5. **Iterate**: Fix issues and repeat

### CI/CD Integration

```bash
# In CI pipeline
swagger-cli validate openapi.yaml
spectral lint openapi.yaml --fail-severity warn
redocly lint openapi.yaml
```

## Troubleshooting

### swagger-cli Not Found

Ensure Node.js and npm are installed:

```bash
node --version
npm --version
```

Reinstall if needed:

```bash
npm install -g @apidevtools/swagger-cli
```

### Validation Errors

Common OpenAPI errors:

- **Missing required fields**: Add `info`, `paths`, `openapi` version
- **Invalid references**: Ensure `$ref` paths are correct
- **Schema errors**: Validate against OpenAPI 3.0/3.1 schema

### Spectral Errors

```bash
# Run with debugging
spectral lint openapi.yaml --verbose

# Ignore specific rules
spectral lint openapi.yaml --ignore-unknown-format
```

## References

- [OpenAPI Specification](https://spec.openapis.org/oas/latest.html)
- [Swagger CLI Documentation](https://github.com/APIDevTools/swagger-cli)
- [Spectral Documentation](https://stoplight.io/open-source/spectral)
- [Redocly CLI Documentation](https://redocly.com/docs/cli/)
- [OpenAPI Examples](https://github.com/OAI/OpenAPI-Specification/tree/main/examples)

**Related Overlays:**

- `nodejs` - Node.js runtime (suggested)
- `python` - For OpenAPI code generation with frameworks
- `dotnet` - For ASP.NET Core OpenAPI integration
