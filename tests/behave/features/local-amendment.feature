Feature: Local devcontainer amendment without adoption
  Scenario: JSONC base devcontainer from VS Code can be amended
    Given an inline workspace fixture:
      """
      files:
        README.md:
          text: |
            JSONC base fixture
      """
    And the workspace is a Git repository
    When I write file ".devcontainer/devcontainer.json"
      """
      {
        // VS Code-created devcontainer files may include comments.
        "image": "mcr.microsoft.com/devcontainers/base:bookworm",
        "remoteEnv": {
          "TEAM_ENV": "1",
        },
      }
      """
    And I run the CLI command
      """
      amend init
      """
    Then the command exits successfully
    And the JSON file ".devcontainer/superposition-local/devcontainer.json" should have value at "remoteEnv.TEAM_ENV" equal
      """
      "1"
      """
    And the file ".devcontainer/devcontainer.json" should contain "// VS Code-created devcontainer files may include comments."
    And the file "superposition.yml" should not exist
    And the file "superposition.json" should not exist

  Scenario: Local feature source paths keep base devcontainer semantics in alternate configs
    Given an inline workspace fixture:
      """
      files:
        .devcontainer/devcontainer.json:
          json:
            image: mcr.microsoft.com/devcontainers/base:bookworm
            features:
              ./features/pelm-pipx-package:
                packages:
                  - pelm
              ghcr.io/devcontainers/features/node:1:
                version: lts
        .devcontainer/features/pelm-pipx-package/devcontainer-feature.json:
          json:
            id: pelm-pipx-package
            version: 1.0.0
      """
    And the workspace is a Git repository
    When I run the CLI command
      """
      amend init
      """
    Then the command exits successfully
    And the file ".devcontainer/superposition-local/devcontainer.json" should contain "../features/pelm-pipx-package"
    And the file ".devcontainer/superposition-local/devcontainer.json" should contain "ghcr.io/devcontainers/features/node:1"
    And the file ".devcontainer/superposition-local/devcontainer.json" should contain "pelm"
    And the file ".devcontainer/devcontainer.json" should contain "./features/pelm-pipx-package"

  Scenario: Pi-style personal amendment layers on a team-owned plain devcontainer
    Given an inline workspace fixture:
      """
      files:
        .devcontainer/devcontainer.json:
          json:
            image: mcr.microsoft.com/devcontainers/base:bookworm
            remoteEnv:
              TEAM_ENV: "1"
      """
    And the workspace is a Git repository
    When I run the CLI command
      """
      amend init
      """
    Then the command exits successfully
    And the file ".container-superposition/amendment.yml" should exist
    And Git should ignore ".container-superposition/amendment.yml"
    When I write file ".container-superposition/amendment.yml"
      """
      $schema: https://raw.githubusercontent.com/veggerby/container-superposition/main/tool/schema/superposition.local.schema.json
      env:
        PI_HOME: ${localEnv:HOME}/.pi
      mounts:
        - source=${localEnv:HOME}/.pi,target=/home/vscode/.pi,type=bind
      vscodeExtensions:
        - ms-vscode.test-adapter-converter
      customizations:
        devcontainerPatch:
          customizations:
            vscode:
              settings:
                pi.enabled: true
      """
    And I run the CLI command
      """
      amend refresh
      """
    Then the command exits successfully
    And the JSON file ".devcontainer/superposition-local/devcontainer.json" should have value at "remoteEnv.PI_HOME" equal
      """
      "${localEnv:HOME}/.pi"
      """
    And the JSON file ".devcontainer/superposition-local/devcontainer.json" should contain array item at "mounts" equal
      """
      "source=${localEnv:HOME}/.pi,target=/home/vscode/.pi,type=bind"
      """
    And the file ".devcontainer/superposition-local/devcontainer.json" should contain "pi.enabled"
    And the file "superposition.yml" should not exist
    And the file "superposition.json" should not exist
    And the Git index should be unchanged

  Scenario: Inspect reports drift and remove restores default devcontainer discovery
    Given an inline workspace fixture:
      """
      files:
        .devcontainer/devcontainer.json:
          json:
            image: mcr.microsoft.com/devcontainers/base:bookworm
      """
    And the workspace is a Git repository
    When I run the CLI command
      """
      amend init
      """
    Then the command exits successfully
    When I write file ".container-superposition/amendment.yml"
      """
      mounts:
        - source=pi,target=/pi,type=volume
      """
    And I run the CLI command
      """
      amend inspect --json
      """
    Then the command exits successfully
    And the command JSON output should have value at "status" equal
      """
      "input changed — refresh required"
      """
    When I run the CLI command
      """
      amend refresh
      """
    Then the command exits successfully
    And the file ".devcontainer/superposition-local/devcontainer.json" should exist
    When I run the CLI command
      """
      amend remove
      """
    Then the command exits successfully
    And the file ".devcontainer/superposition-local/devcontainer.json" should not exist
    And the file ".container-superposition/amendment.yml" should exist
    And the file ".devcontainer/devcontainer.json" should exist
    And the Git index should be unchanged

  Scenario: Refresh migrates a missing legacy alternate-config receipt
    Given an inline workspace fixture:
      """
      files:
        .devcontainer/devcontainer.json:
          json:
            image: mcr.microsoft.com/devcontainers/base:bookworm
      """
    And the workspace is a Git repository
    When I run the CLI command
      """
      amend init
      """
    Then the command exits successfully
    When I remove file ".devcontainer/superposition-local/devcontainer.json"
    And I write file ".container-superposition/amendment-state.json"
      """
      {
        "formatVersion": 1,
        "basePath": ".devcontainer/devcontainer.json",
        "baseSha256": "legacy",
        "inputSha256": "legacy",
        "generatedArtifacts": [".devcontainer/devcontainer.superposition-local.json"],
        "generatedArtifactSha256": {
          ".devcontainer/devcontainer.superposition-local.json": "legacy"
        },
        "mode": "plain"
      }
      """
    And I run the CLI command
      """
      amend refresh
      """
    Then the command exits successfully
    And the file ".devcontainer/superposition-local/devcontainer.json" should exist
    And the file ".devcontainer/devcontainer.superposition-local.json" should not exist

  Scenario: Unsupported ambiguous devcontainers stop before local amendment writes
    Given an inline workspace fixture:
      """
      files:
        .devcontainer/devcontainer.json:
          json:
            image: mcr.microsoft.com/devcontainers/base:bookworm
        .devcontainer.json:
          json:
            image: mcr.microsoft.com/devcontainers/base:ubuntu
      """
    When I run the CLI command
      """
      amend init
      """
    Then the command exits with status 1
    And the command stderr should contain "Select one with amend init --base"
    And the file ".container-superposition/amendment.yml" should not exist
    And the file ".devcontainer/superposition-local/devcontainer.json" should not exist
