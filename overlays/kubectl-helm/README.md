# kubectl + Helm Overlay

Kubernetes command-line tools for managing containerized applications and Helm package manager for Kubernetes.

## Features

- **kubectl** - Kubernetes command-line interface
- **Helm 3** - Kubernetes package manager
- **Auto-completion** - Command completion for kubectl and helm
- **Multiple cluster support** - Switch between different Kubernetes contexts
- **YAML validation** - Kubernetes manifest validation

## Getting Started

### Connecting to a Cluster

Before using kubectl, you need to configure access to your Kubernetes cluster.

#### Local Clusters

```bash
# For minikube
minikube start
kubectl config use-context minikube

# For kind (Kubernetes in Docker)
kind create cluster
kubectl config use-context kind-kind

# For Docker Desktop
kubectl config use-context docker-desktop
```

#### Cloud-Managed Clusters

```bash
# AWS EKS (requires aws-cli overlay)
aws eks update-kubeconfig --region us-east-1 --name my-cluster

# Google GKE (requires gcloud overlay)
gcloud container clusters get-credentials my-cluster --zone us-central1-a

# Azure AKS (requires azure-cli overlay)
az aks get-credentials --resource-group myResourceGroup --name myAKSCluster
```

#### Manual Configuration

Add cluster to `~/.kube/config`:
```yaml
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: <base64-cert>
    server: https://kubernetes.example.com:6443
  name: my-cluster
contexts:
- context:
    cluster: my-cluster
    user: my-user
  name: my-cluster-context
current-context: my-cluster-context
users:
- name: my-user
  user:
    token: <bearer-token>
```

## kubectl Common Commands

### Cluster Information

```bash
# View cluster info
kubectl cluster-info

# View cluster nodes
kubectl get nodes

# View node details
kubectl describe node <node-name>

# Get cluster version
kubectl version
```

### Working with Contexts

```bash
# List contexts
kubectl config get-contexts

# View current context
kubectl config current-context

# Switch context
kubectl config use-context my-cluster

# Set default namespace for context
kubectl config set-context --current --namespace=my-namespace
```

### Pods

```bash
# List pods in current namespace
kubectl get pods

# List pods in all namespaces
kubectl get pods --all-namespaces
kubectl get pods -A

# Get pod details
kubectl describe pod my-pod

# View pod logs
kubectl logs my-pod

# Follow pod logs
kubectl logs -f my-pod

# Logs from specific container in pod
kubectl logs my-pod -c my-container

# Execute command in pod
kubectl exec -it my-pod -- bash

# Execute in specific container
kubectl exec -it my-pod -c my-container -- sh

# Port forward to pod
kubectl port-forward my-pod 8080:80
```

### Deployments

```bash
# List deployments
kubectl get deployments

# Create deployment
kubectl create deployment my-app --image=nginx:latest

# Get deployment details
kubectl describe deployment my-app

# Scale deployment
kubectl scale deployment my-app --replicas=3

# Update deployment image
kubectl set image deployment/my-app nginx=nginx:1.21

# Rollout status
kubectl rollout status deployment/my-app

# Rollout history
kubectl rollout history deployment/my-app

# Rollback to previous version
kubectl rollout undo deployment/my-app

# Rollback to specific revision
kubectl rollout undo deployment/my-app --to-revision=2
```

### Services

```bash
# List services
kubectl get services
kubectl get svc

# Expose deployment as service
kubectl expose deployment my-app --port=80 --target-port=8080 --type=LoadBalancer

# Get service details
kubectl describe service my-app

# Port forward to service
kubectl port-forward service/my-app 8080:80
```

### ConfigMaps and Secrets

```bash
# Create ConfigMap from literal
kubectl create configmap my-config --from-literal=key1=value1

# Create ConfigMap from file
kubectl create configmap my-config --from-file=config.yaml

# List ConfigMaps
kubectl get configmaps

# View ConfigMap
kubectl describe configmap my-config

# Create Secret
kubectl create secret generic my-secret --from-literal=password=s3cr3t

# Create Secret from file
kubectl create secret generic my-secret --from-file=ssh-key=/path/to/key

# List secrets
kubectl get secrets

# View secret (base64 encoded)
kubectl get secret my-secret -o yaml
```

### Namespaces

```bash
# List namespaces
kubectl get namespaces
kubectl get ns

# Create namespace
kubectl create namespace my-namespace

# Delete namespace (deletes all resources)
kubectl delete namespace my-namespace

# Set default namespace
kubectl config set-context --current --namespace=my-namespace
```

### Applying Manifests

```bash
# Apply YAML file
kubectl apply -f deployment.yaml

# Apply multiple files
kubectl apply -f deployment.yaml -f service.yaml

# Apply directory
kubectl apply -f ./manifests/

# Delete resources from file
kubectl delete -f deployment.yaml

# Dry run (validate without applying)
kubectl apply -f deployment.yaml --dry-run=client
kubectl apply -f deployment.yaml --dry-run=server
```

### Resource Debugging

```bash
# Get events
kubectl get events --sort-by=.metadata.creationTimestamp

# Get events for specific resource
kubectl get events --field-selector involvedObject.name=my-pod

# View resource usage
kubectl top nodes
kubectl top pods

# Describe any resource
kubectl describe <resource-type> <resource-name>

# Get resource in YAML format
kubectl get pod my-pod -o yaml

# Get resource in JSON format
kubectl get pod my-pod -o json

# Use JSONPath queries
kubectl get pods -o jsonpath='{.items[*].metadata.name}'
```

## Helm Common Commands

### Repository Management

```bash
# Add repository
helm repo add stable https://charts.helm.sh/stable
helm repo add bitnami https://charts.bitnami.com/bitnami

# Update repositories
helm repo update

# List repositories
helm repo list

# Search for charts
helm search repo nginx

# Search Helm Hub
helm search hub wordpress
```

### Installing Charts

```bash
# Install chart
helm install my-release bitnami/nginx

# Install with custom values
helm install my-release bitnami/nginx --set replicaCount=3

# Install with values file
helm install my-release bitnami/nginx -f values.yaml

# Install in specific namespace
helm install my-release bitnami/nginx --namespace my-namespace --create-namespace

# Dry run (template without installing)
helm install my-release bitnami/nginx --dry-run --debug
```

### Managing Releases

```bash
# List releases
helm list

# List releases in all namespaces
helm list --all-namespaces

# Get release status
helm status my-release

# Upgrade release
helm upgrade my-release bitnami/nginx

# Upgrade with new values
helm upgrade my-release bitnami/nginx -f new-values.yaml

# Upgrade or install (if doesn't exist)
helm upgrade --install my-release bitnami/nginx

# Rollback release
helm rollback my-release

# Rollback to specific revision
helm rollback my-release 2

# Uninstall release
helm uninstall my-release

# Uninstall but keep history
helm uninstall my-release --keep-history
```

### Working with Charts

```bash
# Show chart values
helm show values bitnami/nginx

# Show chart readme
helm show readme bitnami/nginx

# Show all chart information
helm show all bitnami/nginx

# Download chart
helm pull bitnami/nginx

# Download and extract chart
helm pull bitnami/nginx --untar

# Template chart (render locally)
helm template my-release bitnami/nginx

# Template with values
helm template my-release bitnami/nginx -f values.yaml
```

### Creating Charts

```bash
# Create new chart
helm create my-chart

# Lint chart
helm lint my-chart/

# Package chart
helm package my-chart/

# Install local chart
helm install my-release ./my-chart

# Test release
helm test my-release
```

## Configuration

### kubectl Config File

Location: `~/.kube/config`

```yaml
apiVersion: v1
kind: Config
clusters:
- cluster:
    certificate-authority-data: ...
    server: https://kubernetes.example.com:6443
  name: production
- cluster:
    server: https://dev.kubernetes.example.com:6443
  name: development
contexts:
- context:
    cluster: production
    namespace: default
    user: admin
  name: prod-context
- context:
    cluster: development
    namespace: dev
    user: developer
  name: dev-context
current-context: dev-context
users:
- name: admin
  user:
    client-certificate-data: ...
    client-key-data: ...
- name: developer
  user:
    token: ...
```

### Helm Values Files

**values.yaml:**
```yaml
replicaCount: 3

image:
  repository: nginx
  tag: "1.21"
  pullPolicy: IfNotPresent

service:
  type: LoadBalancer
  port: 80

ingress:
  enabled: true
  hosts:
    - host: myapp.example.com
      paths:
        - path: /
          pathType: Prefix

resources:
  limits:
    cpu: 100m
    memory: 128Mi
  requests:
    cpu: 100m
    memory: 128Mi
```

## Use Cases

### Application Deployment
- Deploy containerized applications
- Manage multi-tier applications with Helm charts
- Roll out updates and rollback when needed

### Cluster Management
- Monitor cluster health
- Scale applications
- Manage resources across namespaces

### Development Workflows
- Port forward for local testing
- Debug pods and containers
- View logs and events

### CI/CD Integration
- Automated deployments
- Helm chart releases
- Environment-specific configurations

## Best Practices

### kubectl

1. **Use namespaces** - Organize resources logically
2. **Label resources** - Enable better filtering and selection
3. **Use declarative configs** - Prefer `kubectl apply` over `kubectl create`
4. **Version control manifests** - Track changes in git
5. **Use dry-run** - Validate before applying
6. **Set resource limits** - Prevent resource starvation
7. **Use health checks** - Configure liveness and readiness probes

### Helm

1. **Use values files** - Don't hardcode in templates
2. **Version charts** - Use semantic versioning
3. **Lint charts** - Run `helm lint` before packaging
4. **Document values** - Add comments in values.yaml
5. **Test releases** - Use `helm test` for validation
6. **Use dependencies** - Leverage existing charts
7. **Keep charts simple** - Don't over-template

## Security Considerations

### RBAC (Role-Based Access Control)

```bash
# Create service account
kubectl create serviceaccount my-service-account

# Create role
kubectl create role pod-reader \
  --verb=get,list,watch \
  --resource=pods

# Bind role to service account
kubectl create rolebinding pod-reader-binding \
  --role=pod-reader \
  --serviceaccount=default:my-service-account
```

### Secrets Management

⚠️ **Best Practices:**

1. **Never commit secrets to git**
2. **Use external secret management** (Vault, AWS Secrets Manager)
3. **Encrypt secrets at rest** - Enable encryption in etcd
4. **Use RBAC** - Limit who can read secrets
5. **Rotate secrets regularly**

```bash
# Create secret from file (not in git)
kubectl create secret generic db-password --from-file=./password.txt

# Use sealed secrets (encrypted in git)
# Requires sealed-secrets controller
kubeseal -f secret.yaml -w sealed-secret.yaml
```

## Troubleshooting

### kubectl/helm command not found

Rebuild container:
- **VS Code:** `Cmd+Shift+P` → "Dev Containers: Rebuild Container"

### Connection refused

```bash
# Verify cluster is accessible
kubectl cluster-info

# Check kubeconfig
kubectl config view

# Test specific context
kubectl config use-context my-cluster
kubectl get nodes
```

### Authentication errors

```bash
# Verify credentials
kubectl auth can-i get pods

# Update cluster credentials (cloud providers)
aws eks update-kubeconfig --name my-cluster  # EKS
gcloud container clusters get-credentials my-cluster  # GKE
az aks get-credentials --name my-cluster  # AKS
```

### Pod not starting

```bash
# Check pod status
kubectl get pods

# Describe pod for events
kubectl describe pod my-pod

# Check logs
kubectl logs my-pod

# Check previous logs (if crashed)
kubectl logs my-pod --previous
```

### Helm installation fails

```bash
# Debug with dry-run
helm install my-release bitnami/nginx --dry-run --debug

# Check release history
helm history my-release

# View rendered templates
helm template my-release bitnami/nginx

# Check values
helm get values my-release
```

## Useful Aliases

Add to `.bashrc` or `.zshrc`:

```bash
# kubectl aliases
alias k='kubectl'
alias kgp='kubectl get pods'
alias kgs='kubectl get svc'
alias kgd='kubectl get deployments'
alias kga='kubectl get all'
alias kdp='kubectl describe pod'
alias kl='kubectl logs'
alias kx='kubectl exec -it'
alias kaf='kubectl apply -f'
alias kdf='kubectl delete -f'

# Helm aliases
alias h='helm'
alias hls='helm list'
alias hi='helm install'
alias hu='helm upgrade'
alias hr='helm rollback'
alias hun='helm uninstall'
```

## Related Overlays

- **gcloud** - For Google GKE cluster authentication
- **aws-cli** - For Amazon EKS cluster authentication
- **azure-cli** - For Azure AKS cluster authentication
- **docker-sock/docker-in-docker** - For building container images
- **terraform** - Infrastructure as Code for cluster provisioning
- **pulumi** - Modern IaC for Kubernetes resources

## Additional Resources

- [kubectl Documentation](https://kubernetes.io/docs/reference/kubectl/)
- [kubectl Cheat Sheet](https://kubernetes.io/docs/reference/kubectl/cheatsheet/)
- [Helm Documentation](https://helm.sh/docs/)
- [Helm Charts Repository](https://artifacthub.io/)
- [Kubernetes Best Practices](https://kubernetes.io/docs/concepts/configuration/overview/)
