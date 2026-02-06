# Google Cloud SDK Overlay

Adds Google Cloud SDK (gcloud) with comprehensive tooling for GCP development.

## Features

- **gcloud CLI** - Google Cloud command-line interface
- **gsutil** - Cloud Storage management
- **bq** - BigQuery command-line tool
- **GKE gcloud auth plugin** - For Kubernetes cluster authentication
- **VS Code Extension:** Cloud Code (googlecloudtools.cloudcode)

## Authentication

### Interactive Login (Development)

```bash
# Login with browser-based OAuth
gcloud auth login

# Set default project
gcloud config set project YOUR_PROJECT_ID

# Verify authentication
gcloud auth list
```

### Service Account (CI/CD)

```bash
# Using service account JSON key
gcloud auth activate-service-account \
  --key-file=/path/to/service-account-key.json

# Or via environment variable
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
gcloud auth activate-service-account \
  --key-file="${GOOGLE_APPLICATION_CREDENTIALS}"
```

### Application Default Credentials (ADC)

For applications using Google Cloud client libraries:

```bash
# Set ADC for development
gcloud auth application-default login

# Verify ADC is configured
gcloud auth application-default print-access-token
```

**Environment variable approach:**
```bash
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/service-account-key.json
```

## Common Commands

### Project Management

```bash
# List projects
gcloud projects list

# Set active project
gcloud config set project PROJECT_ID

# Get current project
gcloud config get-value project
```

### Compute Engine

```bash
# List VM instances
gcloud compute instances list

# SSH into instance
gcloud compute ssh INSTANCE_NAME

# Create instance
gcloud compute instances create my-instance \
  --zone=us-central1-a \
  --machine-type=e2-medium
```

### Cloud Storage (gsutil)

```bash
# List buckets
gsutil ls

# Create bucket
gsutil mb gs://my-bucket-name

# Copy files
gsutil cp file.txt gs://my-bucket/
gsutil cp gs://my-bucket/file.txt ./

# Sync directory
gsutil rsync -r ./local-dir gs://my-bucket/remote-dir
```

### GKE (Google Kubernetes Engine)

```bash
# List clusters
gcloud container clusters list

# Get cluster credentials
gcloud container clusters get-credentials CLUSTER_NAME \
  --zone=us-central1-a

# Verify kubectl context
kubectl config current-context
```

### BigQuery (bq)

```bash
# List datasets
bq ls

# Query data
bq query --use_legacy_sql=false \
  'SELECT * FROM `project.dataset.table` LIMIT 10'

# Load data
bq load dataset.table data.csv schema.json
```

### Cloud Functions

```bash
# List functions
gcloud functions list

# Deploy function
gcloud functions deploy my-function \
  --runtime=nodejs20 \
  --trigger-http \
  --allow-unauthenticated
```

## Configuration

### Set Defaults

```bash
# Set default region
gcloud config set compute/region us-central1

# Set default zone
gcloud config set compute/zone us-central1-a

# View all config
gcloud config list
```

### Multiple Configurations

```bash
# Create named configuration
gcloud config configurations create dev
gcloud config configurations create prod

# Switch configuration
gcloud config configurations activate dev

# List configurations
gcloud config configurations list
```

## Common Use Cases

### GCP Development
- Deploy Cloud Functions
- Manage Cloud Run services
- Interact with GCS buckets

### GKE Development
- Authenticate to GKE clusters
- Deploy containerized applications
- Manage Kubernetes resources

### Data Engineering
- BigQuery queries and data loading
- Cloud Storage data pipelines
- Dataflow job management

## Best Practices

1. **Use service accounts** for automation and CI/CD
2. **Store credentials securely** - Never commit service account keys
3. **Use ADC** for local development with client libraries
4. **Set default project** to avoid `--project` flags
5. **Use configurations** for multi-environment workflows

## Security Considerations

### Service Account Keys

⚠️ **Never commit service account keys to version control**

Use one of these secure methods:
- **Environment variables** in `.env` (excluded from git)
- **Secret management** (e.g., HashiCorp Vault)
- **Cloud-based secrets** (e.g., Secret Manager)
- **Workload Identity** (for GKE)

### Least Privilege

Grant minimal required permissions to service accounts:
```bash
# Example: Grant Storage Object Viewer role
gcloud projects add-iam-policy-binding PROJECT_ID \
  --member="serviceAccount:SA_EMAIL" \
  --role="roles/storage.objectViewer"
```

## Troubleshooting

### gcloud command not found

Rebuild container:
- **VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### Authentication errors

```bash
# Clear and re-authenticate
gcloud auth revoke
gcloud auth login
```

### Wrong project active

```bash
# Check current project
gcloud config get-value project

# Switch project
gcloud config set project NEW_PROJECT_ID
```

### ADC not working

```bash
# Re-establish ADC
gcloud auth application-default login

# Or set GOOGLE_APPLICATION_CREDENTIALS
export GOOGLE_APPLICATION_CREDENTIALS=/path/to/key.json
```

## Related Overlays

- **kubectl-helm** - Kubernetes management (works with GKE)
- **terraform** - Infrastructure as Code for GCP resources
- **pulumi** - Modern IaC with TypeScript/Python/Go
- **nodejs/python/dotnet** - For Cloud Functions/Run development
