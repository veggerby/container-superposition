# Go Overlay

Adds Go latest stable version with tooling for cloud-native development, microservices, and CLI applications.

## Features

- **Go** - Latest stable version from official Go team
- **gopls** - Official Go language server for IntelliSense
- **delve** - Powerful Go debugger
- **golangci-lint** - Fast linters aggregator
- **VS Code Extension:** Go (golang.go) - Complete Go development experience
- **Automatic module management** - Runs `go mod download` on container creation

## How It Works

This overlay uses the official devcontainers Go feature to install the latest stable Go version. The setup script installs essential Go development tools including gopls (language server), delve (debugger), and golangci-lint (linter).

**Installation method:**
- Go runtime via official devcontainer feature
- Development tools via `go install`
- Tools accessible in $GOPATH/bin

## Common Commands

### Project Initialization

```bash
# Create new module
go mod init github.com/username/project

# Add dependency
go get github.com/gin-gonic/gin@latest

# Update dependencies
go get -u ./...

# Tidy modules (remove unused)
go mod tidy
```

### Building and Running

```bash
# Run application
go run main.go

# Build binary
go build -o myapp

# Build with optimizations
go build -ldflags="-s -w" -o myapp

# Cross-compile for Linux
GOOS=linux GOARCH=amd64 go build -o myapp-linux

# Install binary to $GOPATH/bin
go install
```

### Testing

```bash
# Run tests
go test ./...

# Run with coverage
go test -cover ./...

# Generate coverage report
go test -coverprofile=coverage.out ./...
go tool cover -html=coverage.out

# Run benchmarks
go test -bench=. ./...

# Verbose output
go test -v ./...
```

### Code Quality

```bash
# Format code
go fmt ./...
# or with gofumpt (stricter)
gofumpt -l -w .

# Lint with golangci-lint
golangci-lint run

# Vet (detect suspicious code)
go vet ./...

# Static analysis with staticcheck
staticcheck ./...
```

### Dependency Management

```bash
# List dependencies
go list -m all

# View dependency graph
go mod graph

# Vendor dependencies (optional)
go mod vendor

# Check for updates
go list -u -m all
```

## Use Cases

- **Microservices** - Cloud-native services with gRPC or REST APIs
- **CLI tools** - Command-line applications (Cobra, urfave/cli)
- **Cloud infrastructure** - Kubernetes operators, Terraform providers
- **Web servers** - HTTP APIs (Gin, Echo, Fiber)
- **Systems programming** - High-performance networked services
- **DevOps tools** - Build tools, deployment automation

**Integrates well with:**
- `postgres`, `redis`, `mysql` - Database drivers (pq, go-redis, mysql)
- `docker-sock` - Docker SDK for Go
- `kubectl-helm` - Kubernetes client libraries
- `otel-collector`, `jaeger` - OpenTelemetry Go SDK
- `prometheus` - Prometheus Go client

## Configuration

### Go Version

The overlay installs the **latest stable** Go version. To use a specific version, modify `devcontainer.patch.json`:

```json
{
  "features": {
    "ghcr.io/devcontainers/features/go:1": {
      "version": "1.21"  // Specify exact version
    }
  }
}
```

### golangci-lint Configuration

Create `.golangci.yml` in project root:

```yaml
linters:
  enable:
    - gofmt
    - gofumpt
    - govet
    - staticcheck
    - errcheck
    - gosimple
    - unused

linters-settings:
  gofumpt:
    extra-rules: true
```

## Application Integration

### HTTP Server with Gin

```go
package main

import (
    "github.com/gin-gonic/gin"
    "net/http"
)

func main() {
    r := gin.Default()
    
    r.GET("/", func(c *gin.Context) {
        c.JSON(http.StatusOK, gin.H{
            "message": "Hello from Go!",
        })
    })
    
    r.Run(":8080") // Listen on port 8080
}
```

**Run:**
```bash
go mod init myapp
go get github.com/gin-gonic/gin
go run main.go
# Access at http://localhost:8080
```

### PostgreSQL Integration

```go
package main

import (
    "database/sql"
    _ "github.com/lib/pq"
)

func main() {
    connStr := "host=postgres port=5432 user=postgres password=postgres dbname=mydb sslmode=disable"
    db, err := sql.Open("postgres", connStr)
    if err != nil {
        panic(err)
    }
    defer db.Close()

    // Use database
    rows, err := db.Query("SELECT * FROM users")
    // ...
}
```

## Troubleshooting

### Issue: gopls not found

**Symptoms:**
- IntelliSense not working
- "gopls not found" error

**Solution:**
```bash
# Install gopls manually
go install golang.org/x/tools/gopls@latest

# Verify installation
gopls version
```

### Issue: Module not found

**Symptoms:**
- `cannot find module` errors
- Import errors

**Solution:**
```bash
# Initialize module if not done
go mod init github.com/yourname/project

# Download dependencies
go mod download

# Tidy dependencies
go mod tidy
```

### Issue: GOPATH/GOROOT issues

**Solution:**
```bash
# Check environment
go env GOPATH
go env GOROOT

# Should output:
# GOPATH=/go
# GOROOT=/usr/local/go
```

## References

- [Official Go Documentation](https://go.dev/doc/) - Complete Go documentation
- [Go by Example](https://gobyexample.com/) - Hands-on introduction
- [Effective Go](https://go.dev/doc/effective_go) - Best practices
- [Go Extension for VS Code](https://marketplace.visualstudio.com/items?itemName=golang.Go)
- [golangci-lint](https://golangci-lint.run/) - Linters aggregator

**Related Overlays:**
- `postgres` - PostgreSQL database (lib/pq driver)
- `redis` - Redis cache (go-redis library)
- `docker-sock` - Docker SDK for Go
- `kubectl-helm` - Kubernetes client-go
- `prometheus` - Prometheus Go client
