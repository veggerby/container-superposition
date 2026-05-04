# Ansible Overlay

Adds Ansible tooling for configuration management and automation workflows.

## Features

- **Ansible CLI** — `ansible`, `ansible-playbook`, `ansible-galaxy`
- **ansible-lint** — Best-practice and style checks for playbooks and roles
- **VS Code Extension:** Red Hat Ansible (`redhat.ansible`)

## Quick Start

```bash
ansible --version
ansible-lint --version
```

Create a minimal local playbook:

```yaml
# playbook.yml
- name: Local test
  hosts: localhost
  connection: local
  gather_facts: false
  tasks:
      - name: Ping localhost
        ansible.builtin.ping:
```

Run it:

```bash
ansible-playbook playbook.yml
```

Lint it:

```bash
ansible-lint playbook.yml
```

## Suggested Pairings

- `aws-cli`, `azure-cli`, `gcloud` — cloud target automation
- `terraform` — infra provisioning + configuration workflow
