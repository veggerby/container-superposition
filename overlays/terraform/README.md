# Terraform Overlay

Adds Terraform CLI with HashiCorp language server and linting for Infrastructure as Code.

## Features

- **Terraform CLI** - Latest version of Terraform/OpenTofu
- **tflint** - Terraform linter for best practices
- **VS Code Extension:** HashiCorp Terraform (hashicorp.terraform)
  - Syntax highlighting
  - Terraform language server (terraform-ls)
  - IntelliSense and autocomplete
  - Validation and formatting

## Getting Started

### Initialize Terraform

```bash
# Create main.tf
cat > main.tf << 'EOF'
terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = "us-east-1"
}
EOF

# Initialize
terraform init
```

### Basic Commands

```bash
# Format code
terraform fmt

# Validate configuration
terraform validate

# Plan changes
terraform plan

# Apply changes
terraform apply

# Destroy resources
terraform destroy
```

## Backend Configuration

### Local Backend (Default)

```hcl
# No configuration needed - state stored in terraform.tfstate
```

### S3 Backend (AWS)

```hcl
terraform {
  backend "s3" {
    bucket         = "my-terraform-state"
    key            = "project/terraform.tfstate"
    region         = "us-east-1"
    encrypt        = true
    dynamodb_table = "terraform-locks"
  }
}
```

**Initialize with backend:**
```bash
terraform init
```

### GCS Backend (Google Cloud)

```hcl
terraform {
  backend "gcs" {
    bucket = "my-terraform-state"
    prefix = "project"
  }
}
```

### Azure Blob Storage Backend

```hcl
terraform {
  backend "azurerm" {
    resource_group_name  = "tfstate-rg"
    storage_account_name = "tfstatestore"
    container_name       = "tfstate"
    key                  = "project.terraform.tfstate"
  }
}
```

### Terraform Cloud

```hcl
terraform {
  cloud {
    organization = "my-org"
    
    workspaces {
      name = "my-workspace"
    }
  }
}
```

**Authenticate:**
```bash
terraform login
```

## Provider Configuration

### AWS

```hcl
provider "aws" {
  region = var.aws_region
  
  # Optional: Profile from ~/.aws/credentials
  profile = "default"
  
  # Optional: Assume role
  assume_role {
    role_arn = "arn:aws:iam::ACCOUNT_ID:role/TerraformRole"
  }
}
```

**Authentication:**
- Environment variables: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`
- AWS CLI profile (recommended)
- IAM role (for EC2/ECS)

### Google Cloud

```hcl
provider "google" {
  project = var.project_id
  region  = var.region
  
  # Optional: Service account
  credentials = file("service-account-key.json")
}
```

**Authentication:**
- `GOOGLE_APPLICATION_CREDENTIALS` environment variable
- `gcloud auth application-default login`
- Service account key file

### Azure

```hcl
provider "azurerm" {
  features {}
  
  subscription_id = var.subscription_id
}
```

**Authentication:**
- `az login`
- Service principal
- Managed identity (for Azure VMs)

## Secret Management

### Environment Variables

```bash
# Export secrets (add to .env, never commit)
export AWS_ACCESS_KEY_ID="..."
export AWS_SECRET_ACCESS_KEY="..."
export TF_VAR_db_password="secret123"
```

### Variable Files

**variables.tf:**
```hcl
variable "db_password" {
  description = "Database password"
  type        = string
  sensitive   = true
}
```

**terraform.tfvars** (add to .gitignore):
```hcl
db_password = "secret123"
```

### External Secret Stores

```hcl
# AWS Secrets Manager
data "aws_secretsmanager_secret_version" "db_password" {
  secret_id = "prod/db/password"
}

resource "aws_db_instance" "example" {
  password = data.aws_secretsmanager_secret_version.db_password.secret_string
}
```

## Common Workflows

### Multi-Environment Setup

**Directory structure:**
```
terraform/
├── modules/
│   └── vpc/
│       ├── main.tf
│       ├── variables.tf
│       └── outputs.tf
├── environments/
│   ├── dev/
│   │   ├── main.tf
│   │   └── terraform.tfvars
│   └── prod/
│       ├── main.tf
│       └── terraform.tfvars
```

**Using modules:**
```hcl
module "vpc" {
  source = "../../modules/vpc"
  
  environment = "dev"
  cidr_block  = "10.0.0.0/16"
}
```

### Linting with tflint

```bash
# Initialize tflint
tflint --init

# Run linter
tflint

# With AWS rules
tflint --enable-rule=terraform_deprecated_syntax
```

### Format and Validate

```bash
# Format all .tf files recursively
terraform fmt -recursive

# Validate configuration
terraform validate

# Check for security issues (requires external tool)
# tfsec .
```

## Best Practices

1. **Use remote state** - Collaborate safely with team
2. **Enable state locking** - Prevent concurrent modifications
3. **Encrypt state** - Protect sensitive data
4. **Use modules** - Reusable, maintainable code
5. **Pin provider versions** - Avoid breaking changes
6. **Separate environments** - Use workspaces or directories
7. **Use .gitignore** - Exclude `.terraform/`, `*.tfstate`, `*.tfvars`
8. **Variables for secrets** - Never hardcode credentials
9. **Run `terraform plan`** - Always review before apply
10. **Use `terraform-docs`** - Auto-generate documentation

## Example .gitignore

```gitignore
# Terraform files
.terraform/
*.tfstate
*.tfstate.*
.terraform.lock.hcl
terraform.tfvars
override.tf
override.tf.json

# Crash logs
crash.log
crash.*.log

# Secrets
*.pem
*.key
service-account*.json
```

## Troubleshooting

### terraform command not found

Rebuild container:
- **VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### State lock errors

```bash
# Force unlock (use with caution)
terraform force-unlock LOCK_ID
```

### Provider authentication issues

```bash
# AWS
aws sts get-caller-identity

# GCP
gcloud auth application-default print-access-token

# Azure
az account show
```

### Backend initialization

```bash
# Reconfigure backend
terraform init -reconfigure

# Migrate state
terraform init -migrate-state
```

## OpenTofu Alternative

To use OpenTofu (open-source Terraform fork):

1. Update `devcontainer.patch.json`:
```json
{
  "features": {
    "ghcr.io/devcontainers/features/terraform:1": {
      "version": "latest",
      "installOpenTofu": true
    }
  }
}
```

2. Use `tofu` command instead of `terraform`

## Related Overlays

- **aws-cli** - AWS resource management
- **gcloud** - Google Cloud resource management
- **azure-cli** - Azure resource management
- **kubectl-helm** - Kubernetes deployments
- **pulumi** - Alternative IaC tool with programming languages
