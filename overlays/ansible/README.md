# Ansible Overlay

Adds [Ansible](https://www.ansible.com/) tooling for automation, configuration management, and infrastructure provisioning workflows inside your devcontainer.

## Features

- **Ansible CLI** — `ansible`, `ansible-playbook`, `ansible-galaxy`, `ansible-vault`, `ansible-doc`
- **ansible-lint** — Best-practice and style checks for playbooks, roles, and collections
- **VS Code Extension:** Red Hat Ansible (`redhat.ansible`) — syntax highlighting, autocomplete, and validation powered by the Ansible Language Server

## How It Works

Ansible and ansible-lint are installed via the shared `cross-distro-packages` feature during devcontainer creation:

- **Debian/Ubuntu**: installs `ansible` (or `ansible-core`) and `ansible-lint` (or `python3-ansible-lint`) via `apt`
- **Alpine**: installs `ansible` and `ansible-lint` via `apk`

No extra services are started — Ansible runs entirely inside the devcontainer and connects to remote hosts (or `localhost`) over SSH or WinRM.

**Dependencies:** None required. Combine with cloud CLI overlays (`aws-cli`, `azure-cli`, `gcloud`) for cloud target automation, or `terraform` for hybrid IaC workflows.

## Common Commands

### Inventory & Connectivity

```bash
# Ping all hosts in the default inventory
ansible all -m ping

# Ping using an explicit inventory file
ansible all -i inventory/hosts.ini -m ping

# Gather facts from a host group
ansible webservers -m gather_facts -i inventory/hosts.ini

# List all hosts in an inventory
ansible-inventory -i inventory/hosts.ini --list
```

### Running Playbooks

```bash
# Run a playbook against all hosts in inventory
ansible-playbook playbook.yml

# Run with an explicit inventory
ansible-playbook -i inventory/hosts.ini playbook.yml

# Run with extra variables
ansible-playbook playbook.yml -e "env=production db_host=db.example.com"

# Limit execution to a specific host group
ansible-playbook playbook.yml --limit webservers

# Dry-run (check mode) — show changes without applying them
ansible-playbook playbook.yml --check

# Verbose output for debugging
ansible-playbook playbook.yml -vvv
```

### Ansible Galaxy

```bash
# Install a collection from Galaxy
ansible-galaxy collection install community.general

# Install a role from Galaxy
ansible-galaxy role install geerlingguy.nginx

# Install from a requirements file
ansible-galaxy install -r requirements.yml

# List installed collections
ansible-galaxy collection list
```

### Vault (Secrets Management)

```bash
# Encrypt a file
ansible-vault encrypt secrets.yml

# Decrypt a file
ansible-vault decrypt secrets.yml

# View an encrypted file without decrypting on disk
ansible-vault view secrets.yml

# Edit an encrypted file in place
ansible-vault edit secrets.yml

# Run a playbook with an encrypted vault
ansible-playbook playbook.yml --ask-vault-pass
```

### Linting

```bash
# Lint a playbook
ansible-lint playbook.yml

# Lint all playbooks and roles in the current project
ansible-lint

# Show lint violations with profile info
ansible-lint --profile production playbook.yml
```

## Quick Start

Create a minimal localhost playbook:

```yaml
# playbook.yml
- name: Local test
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
      - name: Ping localhost
        ansible.builtin.ping:

      - name: Print a message
        ansible.builtin.debug:
            msg: 'Ansible is working!'
```

Run and lint it:

```bash
ansible-playbook playbook.yml
ansible-lint playbook.yml
```

## Use Cases

- **Configuration management** — Enforce consistent state across servers (packages, files, services, users)
- **Application deployment** — Orchestrate multi-step deployments to remote hosts or cloud VMs
- **Cloud provisioning** — Combine with cloud modules (`amazon.aws`, `azure.azcollection`, `google.cloud`) to provision infrastructure
- **Kubernetes automation** — Use the `kubernetes.core` collection to manage cluster resources
- **Local development automation** — Run playbooks against `localhost` to set up or reset dev environments

**Integrates well with:**

- `aws-cli`, `azure-cli`, `gcloud` — cloud target automation via provider-specific modules
- `terraform` — use Terraform for infra provisioning, Ansible for configuration of provisioned resources
- `kubectl-helm` — manage Kubernetes workloads with the `kubernetes.core` Ansible collection

## References

- [Ansible Documentation](https://docs.ansible.com/)
- [ansible-lint Documentation](https://ansible.readthedocs.io/projects/lint/)
- [Ansible Galaxy](https://galaxy.ansible.com/)
- [Red Hat Ansible VS Code Extension](https://marketplace.visualstudio.com/items?itemName=redhat.ansible)
- [Ansible Collections Index](https://docs.ansible.com/ansible/latest/collections/index.html)

**Related Overlays:**

- [`aws-cli`](../aws-cli/README.md) — AWS CLI for cloud target automation
- [`azure-cli`](../azure-cli/README.md) — Azure CLI for cloud target automation
- [`gcloud`](../gcloud/README.md) — Google Cloud SDK for cloud target automation
- [`terraform`](../terraform/README.md) — Infrastructure provisioning to pair with Ansible configuration management
