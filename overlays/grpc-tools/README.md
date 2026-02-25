# gRPC Tools Overlay

Protocol Buffers compiler, Buf schema management CLI, and grpcurl for gRPC API development.

## Features

- **protoc** - Protocol Buffers compiler (from system packages)
- **buf** - Modern schema management, linting, and breaking change detection
- **grpcurl** - Command-line tool for interacting with gRPC servers (like curl for gRPC)
- **VS Code Extensions:**
    - [vscode-proto3](https://marketplace.visualstudio.com/items?itemName=zxh404.vscode-proto3) - Proto3 syntax highlighting and validation
    - [vscode-buf](https://marketplace.visualstudio.com/items?itemName=bufbuild.vscode-buf) - Buf integration for VS Code

## How It Works

This overlay installs the gRPC development toolchain into the dev container. `protoc` is installed via system packages, while `buf` and `grpcurl` are downloaded from their official GitHub releases.

## Common Commands

### protoc (Protocol Buffers Compiler)

```bash
# Compile .proto files to Go
protoc --go_out=. --go-grpc_out=. api/v1/service.proto

# Compile to Python
protoc --python_out=. api/v1/service.proto

# Compile to JavaScript/TypeScript
protoc --js_out=import_style=commonjs,binary:. api/v1/service.proto

# Check version
protoc --version
```

### buf (Schema Management)

```bash
# Initialize buf workspace
buf config init

# Lint .proto files
buf lint

# Detect breaking changes
buf breaking --against .git#branch=main

# Generate code from .proto files
buf generate

# Format .proto files
buf format -w

# Push schema to Buf Schema Registry
buf push

# Check version
buf --version
```

### grpcurl (gRPC Testing)

```bash
# List all services on a gRPC server
grpcurl -plaintext localhost:50051 list

# List methods on a service
grpcurl -plaintext localhost:50051 list mypackage.MyService

# Describe a method
grpcurl -plaintext localhost:50051 describe mypackage.MyService.MyMethod

# Call a method
grpcurl -plaintext -d '{"name": "World"}' localhost:50051 mypackage.MyService/SayHello

# Call with headers
grpcurl -plaintext \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"id": 1}' \
  localhost:50051 mypackage.MyService/GetUser

# Stream response
grpcurl -plaintext localhost:50051 mypackage.MyService/ListUsers
```

## Example .proto File

```protobuf
syntax = "proto3";

package myservice.v1;

option go_package = "github.com/myorg/myservice/gen/go/myservice/v1";

service UserService {
    rpc GetUser(GetUserRequest) returns (GetUserResponse);
    rpc ListUsers(ListUsersRequest) returns (stream User);
    rpc CreateUser(CreateUserRequest) returns (CreateUserResponse);
}

message User {
    string id = 1;
    string name = 2;
    string email = 3;
}

message GetUserRequest {
    string id = 1;
}

message GetUserResponse {
    User user = 1;
}

message ListUsersRequest {}

message CreateUserRequest {
    string name = 1;
    string email = 2;
}

message CreateUserResponse {
    User user = 1;
}
```

## buf.yaml Configuration

```yaml
version: v2
modules:
    - path: proto
lint:
    use:
        - DEFAULT
breaking:
    use:
        - FILE
```

## buf.gen.yaml (Code Generation)

```yaml
version: v2
plugins:
    # Go
    - remote: buf.build/protocolbuffers/go
      out: gen/go
      opt:
          - paths=source_relative
    - remote: buf.build/grpc/go
      out: gen/go
      opt:
          - paths=source_relative

    # Python
    - remote: buf.build/protocolbuffers/python
      out: gen/python

    # TypeScript (Node.js)
    - remote: buf.build/connectrpc/node
      out: gen/typescript
```

## Language-Specific Setup

### Go

```bash
# Install Go gRPC plugins
go install google.golang.org/protobuf/cmd/protoc-gen-go@latest
go install google.golang.org/grpc/cmd/protoc-gen-go-grpc@latest
```

### Node.js

```bash
# Install grpc-tools for Node.js
npm install --save-dev grpc-tools @grpc/grpc-js @grpc/proto-loader
```

### Python

```bash
# Install Python gRPC tools
pip install grpcio grpcio-tools
```

## Use Cases

- **gRPC API development** - Design, implement, and test gRPC services
- **Protocol Buffers schema management** - Lint, format, and version schemas
- **gRPC endpoint testing** - Test services without a full client implementation
- **Microservice communication** - Develop services that communicate via gRPC
- **API documentation** - Describe and explore gRPC service contracts

## Troubleshooting

### protoc plugins not found

After installing language-specific plugins, ensure they are in your `PATH`:

```bash
# Go plugins
export PATH="$PATH:$(go env GOPATH)/bin"

# Verify
which protoc-gen-go
which protoc-gen-go-grpc
```

### buf lint errors

Run `buf lint` to see all lint errors:

```bash
buf lint
# proto/api/v1/service.proto:10:1:Service name "userService" should be PascalCase
```

### grpcurl: server does not support the reflection API

Enable gRPC server reflection in your service:

```go
// Go example
import "google.golang.org/grpc/reflection"
reflection.Register(grpcServer)
```

## References

- [Protocol Buffers Documentation](https://protobuf.dev/)
- [Buf Documentation](https://buf.build/docs/)
- [grpcurl GitHub](https://github.com/fullstorydev/grpcurl)
- [gRPC Documentation](https://grpc.io/docs/)

**Related Overlays:**

- `go` - Go language runtime
- `nodejs` - Node.js runtime
- `python` - Python runtime
