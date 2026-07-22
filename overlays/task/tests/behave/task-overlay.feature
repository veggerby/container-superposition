Feature: Task overlay behavior
  Scenario: Task overlay materializes its repo-owned setup hook
    Given a workspace fixture "task-overlay-local"
    When I run the CLI command
      """
      regen
      """
    Then the command exits successfully
    And the file ".devcontainer/scripts/setup-task.sh" should exist
    And the JSON file ".devcontainer/devcontainer.json" should have property "postCreateCommand.setup-task" equal "bash .devcontainer/scripts/setup-task.sh"
