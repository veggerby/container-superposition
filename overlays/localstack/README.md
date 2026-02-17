# LocalStack Overlay

Local AWS cloud stack for development and testing without requiring an AWS account.

## Features

- **LocalStack** - Full AWS cloud emulator running locally
- **Multiple AWS Services** - S3, DynamoDB, SQS, SNS, Lambda, CloudFormation, and more
- **Docker Compose service** - Runs as separate container
- **Persistent storage** - Data survives container restarts
- **Pre-configured environment** - AWS CLI ready to use with LocalStack endpoints

## How It Works

This overlay adds LocalStack as a Docker Compose service that emulates AWS cloud services locally. The service runs in its own container and is accessible from your development container via the hostname `localstack`.

**Architecture:**

- Edge API endpoint: `http://localstack:4566` (all services)
- S3 endpoint: `http://localstack:4571` (S3-specific)
- Services run inside LocalStack container
- Data persisted to Docker volume

## Configuration

### Environment Variables

The overlay includes a `.env.example` file. Copy it to `.env` and customize:

```bash
cd .devcontainer
cp .env.example .env
```

**Default values (.env.example):**

```bash
# LocalStack Configuration
LOCALSTACK_VERSION=latest
LOCALSTACK_SERVICES=s3,sqs,sns,dynamodb,lambda,cloudformation
LOCALSTACK_DEBUG=0
LOCALSTACK_EDGE_PORT=4566
LOCALSTACK_S3_PORT=4571
```

### Available Services

LocalStack supports many AWS services. Common ones include:

- **Storage**: S3, EFS
- **Databases**: DynamoDB, RDS, Redshift
- **Messaging**: SQS, SNS, Kinesis
- **Compute**: Lambda, ECS, Batch
- **Infrastructure**: CloudFormation, CloudWatch

Set `LOCALSTACK_SERVICES` to enable specific services or use `LOCALSTACK_SERVICES=` (empty) to enable all.

### Port Configuration

The default ports (4566, 4571) can be changed via the `--port-offset` option when initializing the devcontainer:

```bash
npm run init -- --port-offset 100 --stack compose --cloud localstack
# LocalStack Edge will be on port 4666, S3 on port 4671
```

## Common Commands

### AWS CLI Usage

The `aws-cli` overlay integrates seamlessly with LocalStack:

```bash
# AWS CLI automatically uses LocalStack endpoints via AWS_ENDPOINT_URL
aws s3 ls
aws s3 mb s3://my-bucket
aws s3 cp myfile.txt s3://my-bucket/

# DynamoDB
aws dynamodb list-tables
aws dynamodb create-table --table-name MyTable \
  --attribute-definitions AttributeName=id,AttributeType=S \
  --key-schema AttributeName=id,KeyType=HASH \
  --billing-mode PAY_PER_REQUEST

# SQS
aws sqs list-queues
aws sqs create-queue --queue-name my-queue
aws sqs send-message --queue-url http://localstack:4566/000000000000/my-queue \
  --message-body "Hello LocalStack"

# Lambda
aws lambda list-functions
```

### Health Check

```bash
# Check LocalStack health
curl http://localstack:4566/_localstack/health

# Check specific service
curl http://localstack:4566/_localstack/health | jq '.services.s3'
```

### Direct API Calls

```bash
# S3 via REST API
curl http://localstack:4566/my-bucket

# List buckets
aws --endpoint-url=http://localstack:4566 s3 ls
```

## Use Cases

- **Cloud development without AWS account** - Develop and test AWS-based applications locally
- **Integration testing** - Test cloud integrations without external dependencies
- **Learning AWS services** - Experiment with AWS APIs without cost
- **CI/CD pipelines** - Run AWS-dependent tests in CI without credentials
- **Event-driven architectures** - Test SQS, SNS, Lambda workflows locally

**Integrates well with:**

- `aws-cli` - AWS command-line interface (suggested)
- `terraform` - Infrastructure as Code testing
- `pulumi` - Infrastructure as Code testing
- Node.js, Python, .NET - Application development with AWS SDK

## Differences from Real AWS

LocalStack aims for high fidelity but has some differences:

- **Authentication** - Uses test credentials (no real IAM)
- **Performance** - May be faster or slower than real AWS
- **Feature parity** - Not all AWS features supported
- **Behavior** - Some edge cases may differ

For production deployments, always test on real AWS.

## Troubleshooting

### Service Not Ready

If LocalStack takes time to start:

```bash
# Check logs
docker-compose logs localstack

# Wait for health check
curl http://localstack:4566/_localstack/health
```

### Connection Refused

Ensure the service is running:

```bash
# Check service status
docker-compose ps localstack

# Restart if needed
docker-compose restart localstack
```

### Services Not Available

Enable specific services in `.env`:

```bash
LOCALSTACK_SERVICES=s3,dynamodb,sqs,sns,lambda
```

## References

- [LocalStack Documentation](https://docs.localstack.cloud/)
- [LocalStack GitHub](https://github.com/localstack/localstack)
- [Supported AWS Services](https://docs.localstack.cloud/user-guide/aws/feature-coverage/)
- [AWS CLI with LocalStack](https://docs.localstack.cloud/user-guide/integrations/aws-cli/)

**Related Overlays:**

- `aws-cli` - AWS command-line interface
- `terraform` - Infrastructure as Code
- `pulumi` - Infrastructure as Code
- `nodejs`, `python`, `dotnet` - Application development
