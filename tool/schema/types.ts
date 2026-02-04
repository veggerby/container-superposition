/**
 * Configuration schema for container-superposition initialization
 */

export type Stack = 'dotnet' | 'node-typescript' | 'python-mkdocs' | 'fullstack';
export type Database = 'none' | 'postgres' | 'redis' | 'postgres+redis';
export type CloudTool = 'azure-cli' | 'kubectl-helm';

export interface DevContainerConfig {
  /**
   * The base template/stack to use
   */
  stack: Stack;

  /**
   * Database requirements
   */
  database?: Database;

  /**
   * Include Playwright for browser automation
   */
  playwright?: boolean;

  /**
   * Cloud/orchestration tools to include
   */
  cloudTools?: CloudTool[];

  /**
   * Where to write the devcontainer configuration
   */
  outputPath?: string;
}

/**
 * Questionnaire response interface
 */
export interface QuestionnaireAnswers {
  stack: Stack;
  needsDocker: boolean;
  database: Database;
  playwright: boolean;
  cloudTools: CloudTool[];
  outputPath: string;
}

/**
 * Port attributes configuration
 */
export interface PortAttributes {
  label?: string;
  onAutoForward?: 'notify' | 'openBrowser' | 'openPreview' | 'silent' | 'ignore';
  elevateIfNeeded?: boolean;
  requireLocalPort?: boolean;
  protocol?: 'http' | 'https';
}

/**
 * DevContainer JSON structure (minimal typing)
 */
export interface DevContainer {
  name?: string;
  image?: string;
  build?: {
    dockerfile?: string;
    context?: string;
  };
  features?: Record<string, any>;
  customizations?: {
    vscode?: {
      extensions?: string[];
      settings?: Record<string, any>;
    };
  };
  forwardPorts?: number[];
  portsAttributes?: Record<string, PortAttributes>;
  mounts?: string[];
  remoteEnv?: Record<string, string>;
  postCreateCommand?: string | Record<string, string>;
  postStartCommand?: string | Record<string, string>;
  remoteUser?: string;
  workspaceFolder?: string;
  [key: string]: any;
}
