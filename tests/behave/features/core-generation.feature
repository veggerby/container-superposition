Feature: Core generation workflow
  Scenario: Regen materializes structured plain Node.js output
    Given a workspace fixture "plain-nodejs"
    When I run the CLI command
      """
      regen
      """
    Then the command exits successfully
    And the file ".devcontainer/devcontainer.json" should exist
    And the file ".devcontainer/superposition.json" should exist
    And the JSON file ".devcontainer/devcontainer.json" should have value at "customizations.vscode.extensions" equal:
      """
      - EditorConfig.EditorConfig
      - GitHub.copilot
      - GitHub.copilot-chat
      - dbaeumer.vscode-eslint
      - esbenp.prettier-vscode
      - christian-kohler.npm-intellisense
      """
    And the JSON file ".devcontainer/devcontainer.json" should contain array item at "customizations.vscode.extensions" equal:
      """
      christian-kohler.npm-intellisense
      """
    And the JSON file ".devcontainer/devcontainer.json" should have value at "remoteEnv.PATH" equal:
      """
      ${containerEnv:HOME}/.local/share/pnpm:${containerEnv:HOME}/.npm-global/bin:${containerEnv:PATH}
      """

  Scenario: Regen materializes semantic compose output for postgres
    Given a workspace fixture "compose-postgres"
    When I run the CLI command
      """
      regen
      """
    Then the command exits successfully
    And the file ".devcontainer/docker-compose.yml" should exist
    And the YAML file ".devcontainer/docker-compose.yml" should have value at "services.postgres.image" equal:
      """
      postgres:${POSTGRES_VERSION:-16}-alpine
      """
    And the Compose file ".devcontainer/docker-compose.yml" should define service "postgres"
    And the Compose file ".devcontainer/docker-compose.yml" should have service "postgres" environment "POSTGRES_DB" equal "${POSTGRES_DB:-devdb}"
    And the Compose file ".devcontainer/docker-compose.yml" should have service "postgres" port "5432:5432"
    And the Compose file ".devcontainer/docker-compose.yml" should have service "postgres" on network "devnet"
    And the Compose file ".devcontainer/docker-compose.yml" should have network "devnet" named "workspace-devnet"

  Scenario: Regen materializes semantic script output for setup helpers
    Given a workspace fixture "plain-nodejs"
    When I run the CLI command
      """
      regen
      """
    Then the command exits successfully
    And the file ".devcontainer/scripts/setup-utils.sh" should exist
    And the script ".devcontainer/scripts/setup-utils.sh" should export "NO_COLOR" equal "1"
    And the script ".devcontainer/scripts/setup-utils.sh" should assign "_CS_APT_LOCK" equal "/tmp/.cs-apt.lock"
    And the script ".devcontainer/scripts/setup-utils.sh" should include PATH segment "$PATH"
    And the script ".devcontainer/scripts/setup-utils.sh" should add PATH segment "$nvm_dir/current/bin" before "$PATH"
