# PowerShell Overlay

Adds PowerShell Core (cross-platform) for scripting, automation, and cloud management tasks.

## Features

- **PowerShell Core** - Latest cross-platform PowerShell (pwsh)
- **PSScriptAnalyzer** - Linting and best practice analyzer
- **Pester** - Testing framework for PowerShell scripts
- **PowerShellGet** - Module management
- **VS Code Extension:** PowerShell (ms-vscode.powershell) - Complete PowerShell IDE
- **Cross-platform** - Works on Linux, macOS, and Windows containers

## How It Works

This overlay installs PowerShell Core via the official devcontainers feature. PowerShell Core is the cross-platform version of PowerShell that runs on Linux, macOS, and Windows. The setup script installs essential modules for development and testing.

**Installation method:**

- PowerShell Core via devcontainer feature
- Modules via PowerShellGet
- Modules stored in user profile

## Common Commands

### Basic PowerShell

```powershell
# Run PowerShell
pwsh

# Run script
pwsh ./script.ps1

# Run command
pwsh -Command "Get-Process"

# Interactive mode
pwsh -NoProfile
```

### Module Management

```powershell
# List installed modules
Get-Module -ListAvailable

# Install module
Install-Module -Name Az -Scope CurrentUser

# Import module
Import-Module Az

# Update module
Update-Module Az

# Find modules
Find-Module -Name "*Azure*"

# Uninstall module
Uninstall-Module Az
```

### Script Development

```powershell
# Create new script
New-Item -Path ./script.ps1 -ItemType File

# Run with parameters
pwsh ./script.ps1 -Parameter1 "value" -Parameter2 42

# Run with execution policy bypass
pwsh -ExecutionPolicy Bypass -File ./script.ps1

# Measure script execution time
Measure-Command { ./script.ps1 }
```

### Testing with Pester

```powershell
# Run all tests
Invoke-Pester

# Run specific test file
Invoke-Pester ./Tests/MyScript.Tests.ps1

# Run with coverage
Invoke-Pester -CodeCoverage ./MyScript.ps1

# Example test file (MyScript.Tests.ps1)
Describe "MyScript Tests" {
    It "Should return true" {
        $result = ./MyScript.ps1
        $result | Should -Be $true
    }
}
```

### Linting with PSScriptAnalyzer

```powershell
# Analyze script
Invoke-ScriptAnalyzer -Path ./script.ps1

# Analyze directory
Invoke-ScriptAnalyzer -Path ./ -Recurse

# Fix issues automatically
Invoke-ScriptAnalyzer -Path ./script.ps1 -Fix

# Check specific rules
Invoke-ScriptAnalyzer -Path ./script.ps1 -IncludeRule PSAvoidUsingCmdletAliases
```

## Use Cases

- **Cross-platform scripting** - Automation scripts that run on Linux/macOS/Windows
- **Azure automation** - Azure resource management (Az module)
- **AWS automation** - AWS resource management (AWS.Tools module)
- **DevOps pipelines** - CI/CD automation scripts
- **System administration** - Server configuration and management
- **Windows interop** - Linux/WSL integration with Windows systems

**Integrates well with:**

- `azure-cli` - Azure CLI + PowerShell Az module
- `aws-cli` - AWS CLI + PowerShell AWS.Tools
- `kubectl-helm` - Kubernetes management scripts
- `docker-sock` - Docker management with PowerShell

## Configuration

### Azure Module

Install Azure PowerShell module:

```powershell
# Install Az module
Install-Module -Name Az -Scope CurrentUser -AllowClobber

# Connect to Azure
Connect-AzAccount

# List subscriptions
Get-AzSubscription

# Set subscription
Set-AzContext -SubscriptionId "subscription-id"
```

### AWS Module

Install AWS Tools for PowerShell:

```powershell
# Install AWS.Tools
Install-Module -Name AWS.Tools.Installer -Scope CurrentUser

# Install specific AWS services
Install-AWSToolsModule AWS.Tools.EC2,AWS.Tools.S3

# Configure credentials
Set-AWSCredential -AccessKey "KEY" -SecretKey "SECRET" -StoreAs "default"

# Set region
Set-DefaultAWSRegion -Region us-east-1
```

### PowerShell Profile

Create profile for startup customization:

```powershell
# Create profile
New-Item -Path $PROFILE -ItemType File -Force

# Edit profile
code $PROFILE

# Example profile content:
# Set default editor
$env:EDITOR = "code"

# Import common modules
Import-Module PSScriptAnalyzer

# Custom aliases
Set-Alias -Name k -Value kubectl
```

## Application Integration

### Azure Resource Management

```powershell
# List all resource groups
Get-AzResourceGroup

# Create resource group
New-AzResourceGroup -Name "MyResourceGroup" -Location "eastus"

# List VMs
Get-AzVM

# Start VM
Start-AzVM -ResourceGroupName "MyResourceGroup" -Name "MyVM"
```

### AWS S3 Operations

```powershell
# List S3 buckets
Get-S3Bucket

# Upload file
Write-S3Object -BucketName "mybucket" -File "./file.txt" -Key "file.txt"

# Download file
Read-S3Object -BucketName "mybucket" -Key "file.txt" -File "./downloaded.txt"

# List objects
Get-S3Object -BucketName "mybucket"
```

### REST API Calls

```powershell
# GET request
$response = Invoke-RestMethod -Uri "https://api.example.com/data" -Method Get

# POST request with JSON
$body = @{
    name = "John"
    age = 30
} | ConvertTo-Json

$response = Invoke-RestMethod -Uri "https://api.example.com/users" -Method Post -Body $body -ContentType "application/json"
```

## Troubleshooting

### Issue: Execution policy error

**Symptoms:**

- "Execution policy does not allow running scripts"

**Solution:**

```powershell
# Check current policy
Get-ExecutionPolicy

# Set policy for current user
Set-ExecutionPolicy -Scope CurrentUser RemoteSigned

# Or bypass for single script
pwsh -ExecutionPolicy Bypass -File ./script.ps1
```

### Issue: Module not found

**Symptoms:**

- "Module not found" error

**Solution:**

```powershell
# Check module path
$env:PSModulePath

# Install module
Install-Module -Name ModuleName -Scope CurrentUser

# Import module explicitly
Import-Module ModuleName
```

### Issue: PowerShell version mismatch

**Solution:**

```powershell
# Check PowerShell version
$PSVersionTable.PSVersion

# Ensure using pwsh (PowerShell Core), not powershell (Windows PowerShell)
which pwsh
```

## References

- [PowerShell Documentation](https://docs.microsoft.com/powershell/) - Official documentation
- [PowerShell Gallery](https://www.powershellgallery.com/) - Module repository
- [Az PowerShell Module](https://docs.microsoft.com/powershell/azure/) - Azure management
- [AWS Tools for PowerShell](https://aws.amazon.com/powershell/) - AWS management
- [Pester Documentation](https://pester.dev/) - Testing framework
- [PSScriptAnalyzer](https://github.com/PowerShell/PSScriptAnalyzer) - Code analyzer

**Related Overlays:**

- `azure-cli` - Azure CLI (complementary to Az module)
- `aws-cli` - AWS CLI (complementary to AWS.Tools)
- `kubectl-helm` - Kubernetes management
- `docker-sock` - Docker management

## Notes

- **PowerShell Core vs Windows PowerShell:** This overlay installs PowerShell Core (pwsh), the cross-platform version
- **Compatibility:** Most Windows PowerShell scripts work with PowerShell Core, but some Windows-specific features may not be available
- **Module Scope:** Modules are installed with `-Scope CurrentUser` to avoid permission issues
