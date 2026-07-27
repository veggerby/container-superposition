Feature: PostgreSQL overlay behavior
  Scenario: PostgreSQL overlay materializes compose service and env defaults
    Given an inline workspace fixture:
      """
      files:
        superposition.yml:
          yaml:
            stack: compose
            composeEnvFiles: true
            overlays:
              - postgres
            outputPath: ./.devcontainer
      """
    When I run the CLI command
      """
      regen
      """
    Then the command exits successfully
    And the file ".devcontainer/docker-compose.yml" should exist
    And the file ".devcontainer/.env.example" should exist
    And the file ".devcontainer/.env.example" should contain "POSTGRES_DB=devdb"
    And the JSON file ".devcontainer/devcontainer.json" should contain array item at "runServices" equal:
      """
      postgres
      """
    And the Compose file ".devcontainer/docker-compose.yml" should define service "postgres"
    And the Compose file ".devcontainer/docker-compose.yml" should have service "postgres" environment "POSTGRES_USER" equal "${POSTGRES_USER:-postgres}"
    And the Compose file ".devcontainer/docker-compose.yml" should have service "postgres" port "5432:5432"
