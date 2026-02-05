/**
 * Configuration schema for container-superposition initialization
 */

export type Stack = 'plain' | 'compose';
export type BaseImage = 'bookworm' | 'trixie' | 'custom';
export type LanguageOverlay = 'dotnet' | 'nodejs' | 'python' | 'mkdocs';
export type Database = 'none' | 'postgres' | 'redis' | 'postgres+redis';
export type CloudTool = 'azure-cli' | 'aws-cli' | 'kubectl-helm';
export type DevTool = 'docker-in-docker' | 'docker-sock' | 'codex' | 'playwright' | 'git-helpers' | 'pre-commit' | 'commitlint' | 'just' | 'direnv' | 'modern-cli-tools' | 'ngrok';
export type ObservabilityTool = 'otel-collector' | 'jaeger' | 'prometheus' | 'grafana' | 'loki';

export interface DevContainerConfig {
  /**
   * The base template to use (plain or compose)
   */
  stack: Stack;

  /**
   * Language/framework overlay
   */
  language?: LanguageOverlay;

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
   * Observability tools to include
   */
  observability?: ObservabilityTool[];

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
  baseImage: BaseImage;
  customImage?: string; // Only used when baseImage is 'custom'
  language?: LanguageOverlay[]; // Support multiple language overlays
  needsDocker: boolean;
  database: Database;
  playwright: boolean;
  cloudTools: CloudTool[];
  devTools: DevTool[];
  observability: ObservabilityTool[];
  outputPath: string;
  portOffset?: number; // Optional port offset for running multiple instances
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

/**
 * Overlay metadata from overlays.yml
 */
export interface OverlayMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  supports?: string[];
  requires?: string[];
  suggests?: string[];
  conflicts?: string[];
  tags?: string[];
  ports?: number[];
  order?: number;
}

/**
 * Overlays configuration structure
 */
export interface OverlaysConfig {
  base_images: Array<{
    id: string;
    name: string;
    description: string;
    image: string | null;
  }>;
  base_templates: Array<{
    id: string;
    name: string;
    description: string;
  }>;
  language_overlays: OverlayMetadata[];
  database_overlays: OverlayMetadata[];
  observability_overlays: OverlayMetadata[];
  cloud_tool_overlays: OverlayMetadata[];
  dev_tool_overlays: OverlayMetadata[];
}

/**
 * Superposition manifest generated alongside devcontainer.json
 */
export interface SuperpositionManifest {
  version: string;
  generated: string;
  baseTemplate: Stack;
  baseImage: string;
  overlays: string[];
  portOffset?: number;
  autoResolved?: {
    added: string[];
    reason: string;
  };
}
