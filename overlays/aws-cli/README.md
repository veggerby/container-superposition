# AWS CLI Overlay

AWS Command Line Interface for managing Amazon Web Services from your development container.

## Features

- **AWS CLI v2** - Latest AWS command-line interface
- **Pre-configured** - Ready to use with your AWS credentials
- **Multi-service support** - Manage EC2, S3, Lambda, RDS, and 200+ AWS services
- **JSON/YAML output** - Flexible output formats for scripting
- **Auto-completion** - Command completion for faster workflows

## Authentication

### Interactive Login (SSO)

For organizations using AWS IAM Identity Center (formerly AWS SSO):

```bash
# Configure SSO profile
aws configure sso

# Login with SSO
aws sso login --profile my-profile

# Set as default profile
export AWS_PROFILE=my-profile
```

### Access Keys (IAM User)

```bash
# Configure credentials interactively
aws configure

# Or set via environment variables
export AWS_ACCESS_KEY_ID=AKIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_DEFAULT_REGION=us-east-1
```

### Credential Files

Create `~/.aws/credentials`:

```ini
[default]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY

[dev]
aws_access_key_id = AKIAIOSFODNN7EXAMPLE
aws_secret_access_key = wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
```

Create `~/.aws/config`:

```ini
[default]
region = us-east-1
output = json

[profile dev]
region = us-west-2
output = yaml
```

### Instance/Container Roles

When running in EC2 or ECS, credentials are automatically provided by the instance metadata service.

```bash
# Verify credentials
aws sts get-caller-identity
```

## Common Commands

### Identity and Access Management (IAM)

```bash
# Get current identity
aws sts get-caller-identity

# List IAM users
aws iam list-users

# Create IAM user
aws iam create-user --user-name john-doe

# Attach policy to user
aws iam attach-user-policy \
  --user-name john-doe \
  --policy-arn arn:aws:iam::aws:policy/ReadOnlyAccess
```

### S3 (Simple Storage Service)

```bash
# List buckets
aws s3 ls

# Create bucket
aws s3 mb s3://my-unique-bucket-name

# Upload file
aws s3 cp file.txt s3://my-bucket/

# Download file
aws s3 cp s3://my-bucket/file.txt ./

# Sync directory
aws s3 sync ./local-dir s3://my-bucket/remote-dir

# Delete bucket (must be empty)
aws s3 rb s3://my-bucket
```

### EC2 (Elastic Compute Cloud)

```bash
# List instances
aws ec2 describe-instances

# List instances with query filter
aws ec2 describe-instances \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name,InstanceType]' \
  --output table

# Start instance
aws ec2 start-instances --instance-ids i-1234567890abcdef0

# Stop instance
aws ec2 stop-instances --instance-ids i-1234567890abcdef0

# Create key pair
aws ec2 create-key-pair --key-name MyKeyPair --query 'KeyMaterial' --output text > MyKeyPair.pem
chmod 400 MyKeyPair.pem
```

### Lambda

```bash
# List functions
aws lambda list-functions

# Invoke function
aws lambda invoke \
  --function-name my-function \
  --payload '{"key":"value"}' \
  response.json

# Update function code
aws lambda update-function-code \
  --function-name my-function \
  --zip-file fileb://function.zip

# Get function configuration
aws lambda get-function-configuration --function-name my-function
```

### CloudFormation

```bash
# List stacks
aws cloudformation list-stacks

# Create stack
aws cloudformation create-stack \
  --stack-name my-stack \
  --template-body file://template.yaml \
  --parameters ParameterKey=KeyName,ParameterValue=MyKey

# Update stack
aws cloudformation update-stack \
  --stack-name my-stack \
  --template-body file://template.yaml

# Delete stack
aws cloudformation delete-stack --stack-name my-stack

# Describe stack events
aws cloudformation describe-stack-events --stack-name my-stack
```

### RDS (Relational Database Service)

```bash
# List database instances
aws rds describe-db-instances

# Create database instance
aws rds create-db-instance \
  --db-instance-identifier mydb \
  --db-instance-class db.t3.micro \
  --engine postgres \
  --master-username admin \
  --master-user-password MyPassword123 \
  --allocated-storage 20

# Modify database instance
aws rds modify-db-instance \
  --db-instance-identifier mydb \
  --allocated-storage 30 \
  --apply-immediately
```

### ECS (Elastic Container Service)

```bash
# List clusters
aws ecs list-clusters

# List services
aws ecs list-services --cluster my-cluster

# Describe service
aws ecs describe-services \
  --cluster my-cluster \
  --services my-service

# Update service (e.g., force new deployment)
aws ecs update-service \
  --cluster my-cluster \
  --service my-service \
  --force-new-deployment
```

## Configuration

### Named Profiles

```bash
# Use specific profile
aws s3 ls --profile dev

# Set default profile for session
export AWS_PROFILE=dev

# Configure new profile
aws configure --profile prod
```

### Output Formats

```bash
# JSON (default)
aws ec2 describe-instances --output json

# YAML
aws ec2 describe-instances --output yaml

# Table
aws ec2 describe-instances --output table

# Text (for scripting)
aws ec2 describe-instances --output text
```

### Query Filtering

```bash
# JMESPath query examples
aws ec2 describe-instances \
  --query 'Reservations[*].Instances[*].[InstanceId,State.Name]'

# Filter by tag
aws ec2 describe-instances \
  --filters "Name=tag:Environment,Values=production" \
  --query 'Reservations[*].Instances[*].[InstanceId,Tags[?Key==`Name`].Value|[0]]'
```

## Use Cases

### Infrastructure Management

- Launch and manage EC2 instances
- Configure load balancers and auto-scaling
- Manage VPCs and security groups

### Application Deployment

- Deploy Lambda functions
- Update ECS services
- Manage CloudFormation stacks

### Data Management

- Upload/download files to S3
- Backup RDS databases
- Manage DynamoDB tables

### CI/CD Integration

- Automated deployments
- Infrastructure provisioning
- Credential management in pipelines

## Credential Management

### Security Best Practices

⚠️ **Never commit AWS credentials to version control**

**Secure Methods:**

1. **Environment Variables** - Set in `.env` (excluded from git)

    ```bash
    AWS_ACCESS_KEY_ID=xxxxx
    AWS_SECRET_ACCESS_KEY=xxxxx
    AWS_DEFAULT_REGION=us-east-1
    ```

2. **AWS SSO** - Use for organizational accounts

    ```bash
    aws configure sso
    aws sso login
    ```

3. **IAM Roles** - Use when running in AWS (EC2, ECS, Lambda)
    - No credentials needed
    - Automatically rotated

4. **AWS Vault** - Secure credential storage
    ```bash
    aws-vault exec dev -- aws s3 ls
    ```

### Least Privilege

Always grant minimum required permissions:

```json
{
    "Version": "2012-10-17",
    "Statement": [
        {
            "Effect": "Allow",
            "Action": ["s3:GetObject", "s3:PutObject"],
            "Resource": "arn:aws:s3:::my-bucket/*"
        }
    ]
}
```

### MFA (Multi-Factor Authentication)

For enhanced security with temporary credentials:

```bash
# Get session token with MFA
aws sts get-session-token \
  --serial-number arn:aws:iam::123456789012:mfa/user \
  --token-code 123456

# Use temporary credentials
export AWS_ACCESS_KEY_ID=ASIAIOSFODNN7EXAMPLE
export AWS_SECRET_ACCESS_KEY=wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY
export AWS_SESSION_TOKEN=FwoGZXIvYXdzEBYaD...
```

## Troubleshooting

### aws command not found

Rebuild container:

- **VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### Invalid credentials

```bash
# Verify credentials are set
aws sts get-caller-identity

# Check credential configuration
cat ~/.aws/credentials
cat ~/.aws/config

# Re-configure
aws configure
```

### Region errors

```bash
# Set default region
export AWS_DEFAULT_REGION=us-east-1

# Or specify in each command
aws s3 ls --region us-west-2
```

### Permission denied errors

```bash
# Check what actions you're allowed to perform
aws iam get-user

# Review attached policies
aws iam list-attached-user-policies --user-name your-username
```

### Rate limiting

AWS API has rate limits. Use pagination and delays:

```bash
# Paginate results
aws s3api list-objects-v2 \
  --bucket my-bucket \
  --max-items 100 \
  --starting-token <token-from-previous-call>

# Add delay between calls in scripts
sleep 1
```

## CLI Configuration Tips

### Enable Auto-completion

```bash
# For bash
complete -C '/usr/local/bin/aws_completer' aws

# For zsh (add to ~/.zshrc)
autoload bashcompinit && bashcompinit
complete -C '/usr/local/bin/aws_completer' aws
```

### Useful Aliases

Add to `.bashrc` or `.zshrc`:

```bash
alias awswho='aws sts get-caller-identity'
alias awsregions='aws ec2 describe-regions --output table'
alias awsprofile='echo $AWS_PROFILE'
```

### Default Settings

Set CLI defaults in `~/.aws/config`:

```ini
[default]
region = us-east-1
output = json
cli_pager =

[profile dev]
region = us-west-2
output = yaml
```

## Related Overlays

- **terraform** - Infrastructure as Code for AWS resources
- **pulumi** - Modern IaC using TypeScript/Python/Go
- **kubectl-helm** - For EKS (Elastic Kubernetes Service) management
- **nodejs/python/dotnet** - For Lambda function development
- **docker-sock/docker-in-docker** - For ECS container development

## Additional Resources

- [AWS CLI Documentation](https://docs.aws.amazon.com/cli/)
- [AWS CLI Command Reference](https://awscli.amazonaws.com/v2/documentation/api/latest/index.html)
- [AWS CLI Configuration Guide](https://docs.aws.amazon.com/cli/latest/userguide/cli-chap-configure.html)
- [AWS Security Best Practices](https://docs.aws.amazon.com/IAM/latest/UserGuide/best-practices.html)
- [JMESPath Tutorial](https://jmespath.org/tutorial.html) - For query filtering
