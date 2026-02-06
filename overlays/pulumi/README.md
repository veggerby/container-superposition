# Pulumi Overlay

Adds Pulumi CLI for modern Infrastructure as Code using familiar programming languages.

## Features

- **Pulumi CLI** - Latest version of Pulumi
- **Multi-language Support** - Use TypeScript, Python, Go, .NET, Java, or YAML
- **VS Code Extension:** Pulumi LSP Client (pulumi.pulumi-lsp-client)
  - IntelliSense and autocomplete
  - Error detection
  - Resource documentation

## Getting Started

### Prerequisites

Pulumi works with programming languages. Select appropriate language overlay:
- **nodejs** - For TypeScript/JavaScript
- **python** - For Python
- **dotnet** - For C#/F#
- **Go** - (requires additional setup)

### Login to Pulumi

```bash
# Login to Pulumi Cloud (free tier available)
pulumi login

# Or use local backend
pulumi login file://~/.pulumi

# Or use AWS S3
pulumi login s3://my-pulumi-state-bucket
```

### Create New Project

```bash
# TypeScript/JavaScript (requires nodejs overlay)
pulumi new aws-typescript

# Python (requires python overlay)
pulumi new aws-python

# C# (requires dotnet overlay)
pulumi new aws-csharp

# YAML (no language overlay needed)
pulumi new aws-yaml

# Go
pulumi new aws-go
```

### Basic Commands

```bash
# Install dependencies (language-specific)
npm install  # TypeScript
pip install -r requirements.txt  # Python

# Preview changes
pulumi preview

# Deploy infrastructure
pulumi up

# Update stack configuration
pulumi config set aws:region us-west-2

# View stack outputs
pulumi stack output

# Destroy infrastructure
pulumi destroy
```

## Stack Management

### Create and Select Stacks

```bash
# Create new stack
pulumi stack init dev

# List stacks
pulumi stack ls

# Select stack
pulumi stack select prod

# View current stack
pulumi stack
```

### Configuration

```bash
# Set configuration values
pulumi config set databasePassword S3cret! --secret

# Get configuration values
pulumi config get databasePassword

# View all config
pulumi config
```

## Language-Specific Examples

### TypeScript

**index.ts:**
```typescript
import * as pulumi from "@pulumi/pulumi";
import * as aws from "@pulumi/aws";

// Create an S3 bucket
const bucket = new aws.s3.Bucket("my-bucket", {
    acl: "private",
    tags: {
        Environment: "dev",
    },
});

// Export bucket name
export const bucketName = bucket.id;
```

**Run:**
```bash
npm install @pulumi/aws @pulumi/pulumi
pulumi up
```

### Python

**__main__.py:**
```python
import pulumi
import pulumi_aws as aws

# Create an S3 bucket
bucket = aws.s3.Bucket('my-bucket',
    acl='private',
    tags={
        'Environment': 'dev',
    })

# Export bucket name
pulumi.export('bucket_name', bucket.id)
```

**Run:**
```bash
pip install pulumi pulumi-aws
pulumi up
```

### YAML

**Pulumi.yaml:**
```yaml
name: my-project
runtime: yaml
description: Infrastructure as YAML

resources:
  my-bucket:
    type: aws:s3:Bucket
    properties:
      acl: private
      tags:
        Environment: dev

outputs:
  bucketName: ${my-bucket.id}
```

**Run:**
```bash
pulumi up
```

## Backend Configuration

### Pulumi Cloud (Default)

```bash
# Login
pulumi login

# Automatic state management, secrets encryption, and team collaboration
```

### Local Backend

```bash
# Login to local filesystem
pulumi login file://~/.pulumi

# State stored in ~/.pulumi directory
```

### AWS S3 Backend

```bash
# Login to S3 bucket
pulumi login s3://my-pulumi-state-bucket

# Optional: Set region
export AWS_REGION=us-east-1
```

### Azure Blob Storage

```bash
pulumi login azblob://my-container
```

### Google Cloud Storage

```bash
pulumi login gs://my-pulumi-state-bucket
```

## Provider Configuration

### AWS

```typescript
import * as aws from "@pulumi/aws";

const provider = new aws.Provider("my-provider", {
    region: "us-west-2",
    profile: "dev",
});

const bucket = new aws.s3.Bucket("my-bucket", {}, {
    provider: provider,
});
```

**Authentication:**
- AWS CLI credentials
- Environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- IAM roles

### Google Cloud

```typescript
import * as gcp from "@pulumi/gcp";

const provider = new gcp.Provider("my-provider", {
    project: "my-project-id",
    region: "us-central1",
    credentials: process.env.GOOGLE_APPLICATION_CREDENTIALS,
});
```

### Azure

```typescript
import * as azure from "@pulumi/azure-native";

const provider = new azure.Provider("my-provider", {
    location: "eastus",
});
```

## Secrets Management

### Stack Secrets

```bash
# Set secret configuration
pulumi config set --secret dbPassword S3cret!

# Access in code (TypeScript)
```
```typescript
import * as pulumi from "@pulumi/pulumi";

const config = new pulumi.Config();
const dbPassword = config.requireSecret("dbPassword");
```

### External Secrets

```typescript
// AWS Secrets Manager
import * as aws from "@pulumi/aws";

const secret = aws.secretsmanager.getSecretVersion({
    secretId: "prod/db/password",
});

const db = new aws.rds.Instance("db", {
    password: secret.then(s => s.secretString),
});
```

## Common Use Cases

### Multi-Cloud Infrastructure

```typescript
import * as aws from "@pulumi/aws";
import * as gcp from "@pulumi/gcp";
import * as azure from "@pulumi/azure-native";

// AWS resources
const awsBucket = new aws.s3.Bucket("aws-bucket");

// GCP resources
const gcpBucket = new gcp.storage.Bucket("gcp-bucket");

// Azure resources
const azureStorage = new azure.storage.StorageAccount("azure-storage");
```

### Kubernetes Deployment

```typescript
import * as k8s from "@pulumi/kubernetes";

const deployment = new k8s.apps.v1.Deployment("app", {
    spec: {
        selector: { matchLabels: { app: "nginx" } },
        replicas: 3,
        template: {
            metadata: { labels: { app: "nginx" } },
            spec: {
                containers: [{
                    name: "nginx",
                    image: "nginx:latest",
                }],
            },
        },
    },
});
```

## Best Practices

1. **Use strong typing** - Leverage TypeScript/C# for type safety
2. **Organize code** - Separate resources into modules/components
3. **Stack per environment** - dev, staging, prod stacks
4. **Secrets in config** - Use `pulumi config set --secret`
5. **Export outputs** - Make important values accessible
6. **CI/CD integration** - Automate deployments
7. **Version lock** - Pin package versions
8. **Review previews** - Always run `pulumi preview` first
9. **Tag resources** - Add metadata for organization
10. **Use components** - Create reusable infrastructure components

## CI/CD Integration

### GitHub Actions

```yaml
- name: Install Pulumi
  uses: pulumi/actions@v4

- name: Pulumi Preview
  run: pulumi preview
  env:
    PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}

- name: Pulumi Up
  run: pulumi up --yes
  env:
    PULUMI_ACCESS_TOKEN: ${{ secrets.PULUMI_ACCESS_TOKEN }}
```

### Environment Variables

```bash
# Pulumi access token
export PULUMI_ACCESS_TOKEN=pul-xxxxx

# AWS credentials
export AWS_ACCESS_KEY_ID=xxxxx
export AWS_SECRET_ACCESS_KEY=xxxxx

# GCP credentials
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json

# Azure credentials
export ARM_CLIENT_ID=xxxxx
export ARM_CLIENT_SECRET=xxxxx
export ARM_SUBSCRIPTION_ID=xxxxx
export ARM_TENANT_ID=xxxxx
```

## Troubleshooting

### pulumi command not found

Rebuild container:
- **VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### Login issues

```bash
# Re-login
pulumi logout
pulumi login
```

### State conflicts

```bash
# Refresh state
pulumi refresh

# Export/import state
pulumi stack export > stack.json
pulumi stack import < stack.json
```

### Provider authentication

```bash
# AWS
aws sts get-caller-identity

# GCP
gcloud auth application-default login

# Azure
az login
```

## Pulumi vs Terraform

| Feature | Pulumi | Terraform |
|---------|--------|-----------|
| **Language** | TypeScript, Python, Go, C#, Java, YAML | HCL |
| **Type Safety** | ✅ Strong typing (TS/C#) | ⚠️ Limited |
| **Learning Curve** | Familiar languages | New DSL |
| **Testing** | Unit tests with language frameworks | Limited |
| **State** | Managed service or self-hosted | Self-hosted |
| **Ecosystem** | Growing | Mature |

## Related Overlays

- **nodejs** - Required for TypeScript/JavaScript Pulumi programs
- **python** - Required for Python Pulumi programs
- **dotnet** - Required for C#/F# Pulumi programs
- **aws-cli** - AWS resource management
- **gcloud** - Google Cloud resource management
- **azure-cli** - Azure resource management
- **kubectl-helm** - Kubernetes management
- **terraform** - Alternative IaC tool
