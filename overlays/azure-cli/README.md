# Azure CLI Overlay

Azure Command Line Interface for managing Microsoft Azure resources from your development container.

## Features

- **Azure CLI** - Latest Azure command-line interface (az)
- **Multi-service support** - Manage VMs, Storage, App Service, AKS, and 100+ Azure services
- **Interactive mode** - `az interactive` for easier command discovery
- **Cloud Shell parity** - Same experience as Azure Cloud Shell
- **JSON/YAML/Table output** - Flexible output formats

## Authentication

### Interactive Login

```bash
# Login with browser-based authentication
az login

# Login with device code (for remote/SSH scenarios)
az login --use-device-code

# Verify authentication
az account show
```

### Service Principal (CI/CD)

```bash
# Create service principal
az ad sp create-for-rbac --name myapp --role Contributor

# Login with service principal
az login --service-principal \
  --username <app-id> \
  --password <password-or-cert> \
  --tenant <tenant-id>

# Or use environment variables
export ARM_CLIENT_ID=<app-id>
export ARM_CLIENT_SECRET=<password>
export ARM_SUBSCRIPTION_ID=<subscription-id>
export ARM_TENANT_ID=<tenant-id>
```

### Managed Identity

When running in Azure (VM, App Service, Functions):

```bash
# Login with system-assigned managed identity
az login --identity

# Login with user-assigned managed identity
az login --identity --username <client-id>
```

## Common Commands

### Account and Subscription Management

```bash
# List subscriptions
az account list --output table

# Show current subscription
az account show

# Set active subscription
az account set --subscription "My Subscription"

# Get access token (useful for API calls)
az account get-access-token
```

### Resource Groups

```bash
# List resource groups
az group list --output table

# Create resource group
az group create \
  --name myResourceGroup \
  --location eastus

# Delete resource group (deletes all resources)
az group delete --name myResourceGroup --yes --no-wait

# Export resource group template
az group export --name myResourceGroup
```

### Virtual Machines

```bash
# List VMs
az vm list --output table

# Create VM
az vm create \
  --resource-group myResourceGroup \
  --name myVM \
  --image Ubuntu2204 \
  --size Standard_B2s \
  --admin-username azureuser \
  --generate-ssh-keys

# Start VM
az vm start --resource-group myResourceGroup --name myVM

# Stop VM (deallocate to stop billing)
az vm deallocate --resource-group myResourceGroup --name myVM

# Get VM IP address
az vm show \
  --resource-group myResourceGroup \
  --name myVM \
  --show-details \
  --query publicIps \
  --output tsv

# SSH into VM
ssh azureuser@<vm-ip>
```

### Storage Accounts

```bash
# List storage accounts
az storage account list --output table

# Create storage account
az storage account create \
  --name mystorageaccount \
  --resource-group myResourceGroup \
  --location eastus \
  --sku Standard_LRS

# Get storage account keys
az storage account keys list \
  --account-name mystorageaccount \
  --resource-group myResourceGroup

# Create blob container
az storage container create \
  --name mycontainer \
  --account-name mystorageaccount

# Upload file to blob storage
az storage blob upload \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name myfile.txt \
  --file ./local-file.txt

# Download blob
az storage blob download \
  --account-name mystorageaccount \
  --container-name mycontainer \
  --name myfile.txt \
  --file ./downloaded-file.txt
```

### App Service (Web Apps)

```bash
# List app service plans
az appservice plan list --output table

# Create app service plan
az appservice plan create \
  --name myAppServicePlan \
  --resource-group myResourceGroup \
  --sku B1

# Create web app
az webapp create \
  --name myWebApp \
  --resource-group myResourceGroup \
  --plan myAppServicePlan \
  --runtime "NODE:20-lts"

# Deploy from GitHub
az webapp deployment source config \
  --name myWebApp \
  --resource-group myResourceGroup \
  --repo-url https://github.com/user/repo \
  --branch main \
  --manual-integration

# View logs
az webapp log tail --name myWebApp --resource-group myResourceGroup

# Restart web app
az webapp restart --name myWebApp --resource-group myResourceGroup
```

### AKS (Azure Kubernetes Service)

```bash
# List AKS clusters
az aks list --output table

# Create AKS cluster
az aks create \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --node-count 2 \
  --enable-addons monitoring \
  --generate-ssh-keys

# Get credentials for kubectl
az aks get-credentials \
  --resource-group myResourceGroup \
  --name myAKSCluster

# Verify kubectl context
kubectl config current-context

# Scale cluster
az aks scale \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --node-count 3

# Upgrade cluster
az aks upgrade \
  --resource-group myResourceGroup \
  --name myAKSCluster \
  --kubernetes-version 1.28.0
```

### Azure Functions

```bash
# Create function app
az functionapp create \
  --resource-group myResourceGroup \
  --consumption-plan-location eastus \
  --runtime node \
  --runtime-version 20 \
  --functions-version 4 \
  --name myFunctionApp \
  --storage-account mystorageaccount

# Deploy function code
az functionapp deployment source config-zip \
  --resource-group myResourceGroup \
  --name myFunctionApp \
  --src function.zip

# List functions
az functionapp function show \
  --resource-group myResourceGroup \
  --name myFunctionApp
```

### Azure SQL Database

```bash
# Create SQL server
az sql server create \
  --name myserver \
  --resource-group myResourceGroup \
  --location eastus \
  --admin-user myadmin \
  --admin-password MyP@ssw0rd!

# Create SQL database
az sql db create \
  --resource-group myResourceGroup \
  --server myserver \
  --name mydb \
  --service-objective S0

# Configure firewall rule
az sql server firewall-rule create \
  --resource-group myResourceGroup \
  --server myserver \
  --name AllowMyIP \
  --start-ip-address 1.2.3.4 \
  --end-ip-address 1.2.3.4
```

### Container Instances (ACI)

```bash
# Create container instance
az container create \
  --resource-group myResourceGroup \
  --name mycontainer \
  --image mcr.microsoft.com/azuredocs/aci-helloworld \
  --dns-name-label mycontainer-demo \
  --ports 80

# Show container details
az container show \
  --resource-group myResourceGroup \
  --name mycontainer

# View logs
az container logs \
  --resource-group myResourceGroup \
  --name mycontainer

# Delete container
az container delete \
  --resource-group myResourceGroup \
  --name mycontainer \
  --yes
```

## Configuration

### Set Default Values

```bash
# Set default resource group
az configure --defaults group=myResourceGroup

# Set default location
az configure --defaults location=eastus

# View all defaults
az configure --list-defaults
```

### Output Formats

```bash
# JSON (default)
az vm list --output json

# Table (human-readable)
az vm list --output table

# TSV (tab-separated, good for scripting)
az vm list --output tsv

# YAML
az vm list --output yaml

# JSONC (JSON with comments)
az vm list --output jsonc
```

### Query with JMESPath

```bash
# Filter VMs by name
az vm list --query "[?name=='myVM']"

# Get specific fields
az vm list --query "[].{Name:name, ResourceGroup:resourceGroup}" --output table

# Filter by location
az vm list --query "[?location=='eastus']" --output table
```

## Use Cases

### Cloud Infrastructure Management

- Deploy and manage virtual machines
- Configure load balancers and networking
- Manage storage accounts and databases

### Container and Kubernetes Operations

- Deploy to Azure Container Instances
- Manage AKS clusters
- Push images to Azure Container Registry

### Application Deployment

- Deploy web apps and functions
- Configure CI/CD pipelines
- Manage application settings

### DevOps and Automation

- Infrastructure as Code with ARM templates
- Automated resource provisioning
- Integration with CI/CD pipelines

## Interactive Mode

For easier command discovery and auto-completion:

```bash
# Start interactive mode
az interactive

# Features:
# - Auto-completion
# - Command descriptions
# - Example snippets
# - Parameter help
```

## Security Best Practices

### Credential Management

⚠️ **Never commit Azure credentials to version control**

**Secure Methods:**

1. **Interactive Login** - For development

    ```bash
    az login
    ```

2. **Service Principal** - For automation

    ```bash
    # Create with limited permissions
    az ad sp create-for-rbac \
      --name myapp \
      --role Reader \
      --scopes /subscriptions/{subscription-id}/resourceGroups/{resource-group}
    ```

3. **Managed Identity** - For Azure resources
    - No credentials needed
    - Automatically managed by Azure

4. **Azure Key Vault** - Store secrets

    ```bash
    # Create key vault
    az keyvault create --name myKeyVault --resource-group myResourceGroup

    # Store secret
    az keyvault secret set --vault-name myKeyVault --name mySecret --value "secretValue"

    # Retrieve secret
    az keyvault secret show --vault-name myKeyVault --name mySecret --query value -o tsv
    ```

### Least Privilege

Always use role-based access control (RBAC) with minimal permissions:

```bash
# Assign role to service principal
az role assignment create \
  --assignee <app-id> \
  --role "Storage Blob Data Contributor" \
  --scope /subscriptions/{subscription-id}/resourceGroups/{resource-group}

# List available roles
az role definition list --output table
```

## Troubleshooting

### az command not found

Rebuild container:

- **VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### Authentication failures

```bash
# Clear cached credentials
az account clear

# Re-login
az login

# Verify authentication
az account show
```

### Wrong subscription active

```bash
# List all subscriptions
az account list --output table

# Set correct subscription
az account set --subscription "My Subscription"
```

### Permission errors

```bash
# Check current identity
az account show

# List role assignments
az role assignment list --assignee <your-email> --output table
```

### Resource already exists

Azure resource names often need to be globally unique (e.g., storage accounts, web apps):

```bash
# Check name availability
az storage account check-name --name mystorageaccount

# Use unique suffix
UNIQUE_SUFFIX=$RANDOM
az storage account create --name mystorageaccount$UNIQUE_SUFFIX ...
```

## Azure CLI Extensions

Install additional functionality:

```bash
# List available extensions
az extension list-available --output table

# Install extension
az extension add --name azure-devops

# Update extension
az extension update --name azure-devops

# List installed extensions
az extension list
```

Popular extensions:

- **azure-devops** - Azure DevOps integration
- **aks-preview** - AKS preview features
- **application-insights** - Application Insights management

## Related Overlays

- **terraform** - Infrastructure as Code for Azure resources
- **pulumi** - Modern IaC using TypeScript/Python/Go
- **kubectl-helm** - For AKS cluster management
- **nodejs/python/dotnet** - For Azure Functions development
- **docker-sock/docker-in-docker** - For container development

## Additional Resources

- [Azure CLI Documentation](https://docs.microsoft.com/en-us/cli/azure/)
- [Azure CLI Command Reference](https://docs.microsoft.com/en-us/cli/azure/reference-index)
- [Azure CLI Interactive Mode](https://docs.microsoft.com/en-us/cli/azure/interactive-azure-cli)
- [Azure RBAC Documentation](https://docs.microsoft.com/en-us/azure/role-based-access-control/)
- [JMESPath Tutorial](https://jmespath.org/tutorial.html) - For query filtering
