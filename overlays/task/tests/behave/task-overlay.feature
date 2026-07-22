Feature: Task overlay behavior
  Scenario: Task overlay materializes its repo-owned setup hook
    Given a workspace fixture "task-overlay-local"
    When I run the CLI command
      """
      regen
      """
    Then the command exits successfully
    And the file ".devcontainer/scripts/setup-task.sh" should exist
    And the JSON file ".devcontainer/devcontainer.json" should have value at "postCreateCommand" equal:
      """
      setup-task: bash .devcontainer/scripts/setup-task.sh
      """
    And the script ".devcontainer/scripts/setup-task.sh" should assign "TASK_VERSION" equal "${TASK_VERSION:-v3.45.4}"

  Scenario: Task overlay supports inline workspace fixtures through shared steps
    Given an inline workspace fixture:
      """
      files:
        superposition.yml:
          yaml:
            stack: plain
            overlays:
              - task
            outputPath: ./.devcontainer
      """
    When I run the CLI command
      """
      regen
      """
    Then the command exits successfully
    And the file ".devcontainer/scripts/setup-task.sh" should exist
    And the JSON file ".devcontainer/devcontainer.json" should have value at "postCreateCommand" equal:
      """
      setup-task: bash .devcontainer/scripts/setup-task.sh
      """
