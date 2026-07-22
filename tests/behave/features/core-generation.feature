Feature: Core generation workflow
  Scenario: Regen materializes a plain Node.js workspace from a project file
    Given a workspace fixture "plain-nodejs"
    When I run the CLI command
      """
      regen
      """
    Then the command exits successfully
    And the file ".devcontainer/devcontainer.json" should exist
    And the file ".devcontainer/superposition.json" should exist
    And the file ".devcontainer/devcontainer.json" should contain "ghcr.io/devcontainers/features/node:1"
