Feature: Core CLI tooling workflows
  Scenario Outline: Every executable command advertises silent mode
    Given an inline workspace fixture:
      """
      files:
        README.md:
          text: silent mode workspace
      """
    When I run the CLI command
      """
      <command> --help
      """
    Then the command exits successfully
    And the command stdout should contain "--silent"

    Examples:
      | command  |
      | init     |
      | regen    |
      | list     |
      | defaults |
      | explain  |
      | plan     |
      | doctor   |
      | adopt    |
      | hash         |
      | migrate      |
      | amend init   |
      | amend refresh |
      | amend inspect |
      | amend remove |

  Scenario: Silent mode preserves read-only list behavior without routine output
    Given an inline workspace fixture:
      """
      files:
        README.md:
          text: silent mode workspace
      """
    When I run the CLI command
      """
      list --silent
      """
    Then the command exits successfully
    And the command stdout should be empty
    And the command stderr should be empty

  Scenario: Silent mode suppresses routine output while preserving init writes
    Given an inline workspace fixture:
      """
      files:
        README.md:
          text: silent mode workspace
      """
    When I run the CLI command
      """
      init --stack plain --language nodejs --no-interactive --silent
      """
    Then the command exits successfully
    And the command stdout should be empty
    And the command stderr should be empty
    And the file ".superposition.yml" should exist
    And the file ".devcontainer/devcontainer.json" should exist
    When I run the CLI command
      """
      regen --silent
      """
    Then the command exits successfully
    And the command stdout should be empty
    And the command stderr should be empty
    And the file ".devcontainer/devcontainer.json" should exist

  Scenario: Silent doctor failures retain a concise diagnostic
    Given an inline workspace fixture:
      """
      files:
        superposition.yml:
          yaml:
            stack: plain
            overlays:
              - nodejs
            outputPath: .devcontainer
        .devcontainer/devcontainer.json:
          json: {}
      """
    When I run the CLI command
      """
      doctor --silent
      """
    Then the command exits with status 1
    And the command stdout should be empty
    And the command stderr should contain "Doctor found issues requiring attention"

  Scenario: Silent migrate writes canonical intent without changing routine output
    Given an inline workspace fixture:
      """
      files:
        .devcontainer/superposition.json:
          json:
            manifestVersion: "1"
            generatedBy: test
            generated: "2026-01-01T00:00:00.000Z"
            baseTemplate: plain
            baseImage: bookworm
            overlays:
              - nodejs
      """
    When I run the CLI command
      """
      migrate --silent
      """
    Then the command exits successfully
    And the command stdout should be empty
    And the command stderr should be empty
    And the file ".superposition.yml" should exist

  Scenario: Silent JSON conflicts fail before hash writes
    Given an inline workspace fixture:
      """
      files:
        README.md:
          text: silent mode workspace
      """
    When I run the CLI command
      """
      hash --stack plain --overlays nodejs --write --output .devcontainer --silent --json
      """
    Then the command exits with status 1
    And the command stderr should contain "--silent cannot be used with --json"
    And the file ".devcontainer/superposition.hash" should not exist

  Scenario: Init writes canonical shared intent and generated output from flags
    Given an inline workspace fixture:
      """
      files:
        README.md:
          text: |
            core tooling smoke workspace
      """
    When I run the CLI command
      """
      init --stack plain --language nodejs --no-interactive
      """
    Then the command exits successfully
    And the file ".superposition.yml" should exist
    And the file ".devcontainer/devcontainer.json" should exist
    And the JSON file ".devcontainer/devcontainer.json" should contain array item at "customizations.vscode.extensions" equal:
      """
      christian-kohler.npm-intellisense
      """

  Scenario: Init preserves existing project overlays while adding CLI selections
    Given an inline workspace fixture:
      """
      files:
        superposition.yml:
          yaml:
            stack: compose
            overlays:
              - postgres
            outputPath: ./old-output
      """
    When I run the CLI command
      """
      init --stack compose --language nodejs --output ./generated --no-interactive
      """
    Then the command exits successfully
    And the file ".superposition.yml" should not exist
    And the YAML file "superposition.yml" should have value at "stack" equal:
      """
      compose
      """
    And the YAML file "superposition.yml" should have value at "outputPath" equal:
      """
      ./generated
      """
    And the YAML file "superposition.yml" should contain array item at "overlays" equal:
      """
      postgres
      """
    And the YAML file "superposition.yml" should contain array item at "overlays" equal:
      """
      nodejs
      """
    And the file "generated/devcontainer.json" should exist

  Scenario: List exposes discovery categories and recommended starts
    Given an inline workspace fixture:
      """
      files:
        README.md:
          text: |
            discovery workspace
      """
    When I run the CLI command
      """
      list --json
      """
    Then the command exits successfully
    And the command JSON output should have value at "source.kind" equal:
      """
      cli
      """
    And the command JSON output should have value at "recommendedStarts[0].label" equal:
      """
      web-api
      """
    And the command JSON output should contain array item at "categories" equal:
      """
      language
      """

  Scenario: External path catalogs stay namespace-qualified across discovery and replay
    Given an inline workspace fixture:
      """
      files:
        catalogs/acme/web-api/overlay.yml:
          text: |
            id: web-api
            name: Acme Web API
            description: External web API overlay
            category: dev
            supports:
              - plain
              - compose
        superposition.yml:
          yaml:
            stack: plain
            outputPath: .devcontainer
            catalogs:
              - id: acme-platform
                namespace: acme
                source:
                  type: path
                  path: catalogs/acme
            overlays:
              - acme/web-api
      """
    When I run the CLI command
      """
      explain acme/web-api --json
      """
    Then the command exits successfully
    And the command JSON output should have value at "overlay.id" equal:
      """
      acme/web-api
      """
    When I run the CLI command
      """
      init --from-project --no-interactive
      """
    Then the command exits successfully
    And the JSON file ".devcontainer/superposition.json" should have value at "catalogs[0].namespace" equal:
      """
      acme
      """
    When I run the CLI command
      """
      regen
      """
    Then the command exits successfully
    And the JSON file ".devcontainer/superposition.json" should have value at "catalogs[0].namespace" equal:
      """
      acme
      """
    When I run the CLI command
      """
      doctor --from-project --json
      """
    Then the command exits successfully
    And the command JSON output should have value at "summary.errors" equal:
      """
      0
      """

  Scenario: External path catalogs stay consistent across list and plan JSON output
    Given an inline workspace fixture:
      """
      files:
        catalogs/acme/web-api/overlay.yml:
          text: |
            id: web-api
            name: Acme Web API
            description: External web API overlay
            category: dev
            supports:
              - plain
              - compose
        superposition.yml:
          yaml:
            stack: plain
            outputPath: .devcontainer
            catalogs:
              - id: acme-platform
                namespace: acme
                source:
                  type: path
                  path: catalogs/acme
            overlays:
              - acme/web-api
      """
    When I run the CLI command
      """
      list --json
      """
    Then the command exits successfully
    And the command stdout should contain "acme/web-api"
    When I run the CLI command
      """
      plan --stack plain --overlays acme/web-api --json
      """
    Then the command exits successfully
    And the command stdout should contain "acme/web-api"
    And the command JSON output should have value at "diff.overlayChanges.added[0].id" equal:
      """
      acme/web-api
      """

  Scenario: External catalog selections must stay namespace-qualified at the CLI boundary
    Given an inline workspace fixture:
      """
      files:
        catalogs/acme/web-api/overlay.yml:
          text: |
            id: web-api
            name: Acme Web API
            description: External web API overlay
            category: dev
            supports:
              - plain
        superposition.yml:
          yaml:
            stack: plain
            outputPath: .devcontainer
            catalogs:
              - id: acme-platform
                namespace: acme
                source:
                  type: path
                  path: catalogs/acme
            overlays:
              - web-api
      """
    When I run the CLI command
      """
      doctor --from-project --json
      """
    Then the command exits with status 1
    And the command stderr should contain "Failed to load project config"
    And the command stderr should contain "unsupported entries: web-api"

  Scenario: External catalog declarations reject unsupported sources and floating refs at the CLI boundary
    Given an inline workspace fixture:
      """
      files:
        superposition.yml:
          yaml:
            stack: plain
            outputPath: .devcontainer
            catalogs:
              - id: acme-platform
                namespace: acme
                source:
                  type: git
                  url: ssh://git.example.com/acme/catalog.git
                  ref: main
                  commit: abcdef1
      """
    When I run the CLI command
      """
      doctor --from-project --json
      """
    Then the command exits with status 1
    And the command stderr should contain "floating refs like 'main'"

  Scenario: External catalog declarations reject unsupported source kinds at the CLI boundary
    Given an inline workspace fixture:
      """
      files:
        superposition.yml:
          yaml:
            stack: plain
            outputPath: .devcontainer
            catalogs:
              - id: acme-platform
                namespace: acme
                source:
                  type: oci
                  url: ghcr.io/acme/catalog:1.0.0
      """
    When I run the CLI command
      """
      doctor --from-project --json
      """
    Then the command exits with status 1
    And the command stderr should contain "source.type must be one of: git, archive, path"

  Scenario: Replay fails clearly when a catalog change removes a referenced external overlay
    Given an inline workspace fixture:
      """
      files:
        catalogs/acme-v1/web-api/overlay.yml:
          text: |
            id: web-api
            name: Acme Web API
            description: External web API overlay
            category: dev
            supports:
              - plain
        catalogs/acme-v2/README.md:
          text: |
            web-api moved to another catalog release
        .devcontainer/superposition.json:
          json:
            baseTemplate: plain
            overlays:
              - acme/web-api
            outputPath: .devcontainer
            catalogs:
              - id: acme-platform
                namespace: acme
                sourceType: path
                resolvedIdentity: path:catalogs/acme-v1
        superposition.yml:
          yaml:
            stack: plain
            outputPath: .devcontainer
            catalogs:
              - id: acme-platform
                namespace: acme
                source:
                  type: path
                  path: catalogs/acme-v2
            overlays:
              - acme/web-api
      """
    When I run the CLI command
      """
      init --from-project --no-interactive
      """
    Then the command exits with status 1
    And the command stderr should contain "Unknown overlay 'acme/web-api'"
    When I run the CLI command
      """
      doctor --from-project --json
      """
    Then the command exits with status 1
    And the command stderr should contain "Unknown overlay 'acme/web-api'"

  Scenario: Defaults inspects selected home defaults without writing project files
    Given an inline workspace fixture:
      """
      files:
        README.md:
          text: |
            defaults workspace
      """
    And an inline home defaults fixture:
      """
      files:
        .container-superposition.yml:
          yaml:
            initDefaults:
              stack: plain
              overlays:
                - nodejs
            localConfigTemplate:
              shell:
                snippets:
                  - export TOKEN=${TOKEN:-literal}
        .superposition.yml:
          text: |
            unexpected: true
      """
    When I run the CLI command
      """
      defaults --json
      """
    Then the command exits successfully
    And the command JSON output should have value at "effective.initDefaults.stack" equal:
      """
      plain
      """
    And the command JSON output should contain array item at "effective.initDefaults.overlays" equal:
      """
      nodejs
      """
    And the command stdout should contain ".container-superposition.yml"
    And the command stdout should contain ".superposition.yml"
    And the file "superposition.yml" should not exist
    And the file ".superposition.yml" should not exist
    And the file "superposition.local.yml" should not exist
    And the file ".devcontainer" should not exist

  Scenario: Explain inspects a compose overlay with files and services
    Given an inline workspace fixture:
      """
      files:
        README.md:
          text: |
            explain workspace
      """
    When I run the CLI command
      """
      explain postgres --json
      """
    Then the command exits successfully
    And the command JSON output should have value at "overlay.id" equal:
      """
      postgres
      """
    And the command JSON output should contain array item at "overlay.files" equal:
      """
      docker-compose.yml
      """
    And the command JSON output should contain array item at "overlay.dockerComposeServices" equal:
      """
      postgres
      """

  Scenario: Plan previews first-write compose changes before any mutation
    Given an inline workspace fixture:
      """
      files:
        superposition.yml:
          yaml:
            stack: compose
            overlays:
              - postgres
            outputPath: ./.devcontainer
      """
    When I run the CLI command
      """
      plan --stack compose --overlays postgres --json
      """
    Then the command exits successfully
    And the command JSON output should have value at "changeClass" equal:
      """
      First write
      """
    And the command JSON output should contain array item at "files" equal:
      """
      .devcontainer/docker-compose.yml
      """
    And the command JSON output should have value at "diff.overlayChanges.added[0].id" equal:
      """
      postgres
      """

  Scenario: Doctor reports healthy replay after regen
    Given an inline workspace fixture:
      """
      files:
        superposition.yml:
          yaml:
            stack: plain
            overlays:
              - nodejs
            outputPath: ./.devcontainer
      """
    When I run the CLI command
      """
      regen
      """
    Then the command exits successfully
    And the file ".devcontainer/superposition.json" should exist
    When I run the CLI command
      """
      doctor --from-project --json
      """
    Then the command exits successfully
    And the command JSON output should have value at "disposition" equal:
      """
      Healthy
      """
    And the command JSON output should have value at "summary.errors" equal:
      """
      0
      """

  Scenario: Adopt converts a handwritten devcontainer into managed intent
    Given an inline workspace fixture:
      """
      files:
        .devcontainer/devcontainer.json:
          json:
            $schema: https://raw.githubusercontent.com/devcontainers/spec/main/schemas/devContainer.base.schema.json
            image: mcr.microsoft.com/devcontainers/javascript-node:1-20-bookworm
            features:
              ghcr.io/devcontainers/features/node:1:
                version: lts
            customizations:
              vscode:
                extensions:
                  - christian-kohler.npm-intellisense
      """
    When I run the CLI command
      """
      adopt --dir .devcontainer --json
      """
    Then the command exits successfully
    And the command JSON output should have value at "suggestedStack" equal:
      """
      plain
      """
    And the command JSON output should contain array item at "suggestedOverlays" equal:
      """
      nodejs
      """
    And the command JSON output should have value at "artifactWrites[0].artifact" equal:
      """
      .superposition.yml
      """

  Scenario: Hash fingerprints normalized intent for safe comparison
    Given an inline workspace fixture:
      """
      files:
        README.md:
          text: |
            hash workspace
      """
    When I run the CLI command
      """
      hash --stack plain --overlays nodejs --json
      """
    Then the command exits successfully
    And the command JSON output should have value at "stack" equal:
      """
      plain
      """
    And the command JSON output should contain array item at "overlays" equal:
      """
      nodejs
      """
    And the command JSON output should have value at "nextStep.command" equal:
      """
      cs plan --stack plain --overlays nodejs
      """
