Feature: Node.js overlay behavior
  Scenario: Node.js overlay materializes language tooling output
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
    And the file ".devcontainer/scripts/setup-nodejs.sh" should exist
    And the file ".devcontainer/scripts/verify-nodejs.sh" should exist
    And the JSON file ".devcontainer/devcontainer.json" should contain array item at "customizations.vscode.extensions" equal:
      """
      christian-kohler.npm-intellisense
      """
    And the JSON file ".devcontainer/devcontainer.json" should contain array item at "forwardPorts" equal:
      """
      3000
      """
    And the file ".devcontainer/scripts/setup-nodejs.sh" should contain "npm install -g"
