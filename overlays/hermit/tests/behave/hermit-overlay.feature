Feature: HermIT ontology reasoner overlay behavior
  Scenario: HermIT overlay materializes a plain CLI reasoner with required Java support
    Given an inline workspace fixture:
      """
      files:
        superposition.yml:
          yaml:
            stack: plain
            overlays:
              - hermit
            outputPath: ./.devcontainer
      """
    When I run the CLI command
      """
      regen
      """
    Then the command exits successfully
    And the file ".devcontainer/devcontainer.json" should exist
    And the file ".devcontainer/docker-compose.yml" should not exist
    And the file ".devcontainer/scripts/setup-hermit.sh" should exist
    And the file ".devcontainer/scripts/verify-hermit.sh" should exist
    And the file ".devcontainer/devcontainer.json" should contain "ghcr.io/devcontainers/features/java:1"
    And the JSON file ".devcontainer/devcontainer.json" should have value at "postCreateCommand.setup-hermit" equal:
      """
      bash .devcontainer/scripts/setup-hermit.sh
      """
    And the JSON file ".devcontainer/devcontainer.json" should have value at "postStartCommand.verify-hermit" equal:
      """
      bash .devcontainer/scripts/verify-hermit.sh
      """
    And the JSON file ".devcontainer/superposition.json" should contain array item at "overlays" equal:
      """
      hermit
      """
    And the JSON file ".devcontainer/superposition.json" should contain array item at "overlays" equal:
      """
      java
      """
    And the script ".devcontainer/scripts/setup-hermit.sh" should assign "HERMIT_VERSION" equal "1.4.5.519"
    And the file ".devcontainer/scripts/setup-hermit.sh" should contain "net.sourceforge.owlapi:org.semanticweb.hermit:${HERMIT_VERSION}"
    And the file ".devcontainer/scripts/setup-hermit.sh" should contain "org.semanticweb.HermiT.cli.CommandLine"
