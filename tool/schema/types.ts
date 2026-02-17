/**
 * Configuration schema for container-superposition initialization
 */

export type Stack = 'plain' | 'compose';
export type BaseImage = 'bookworm' | 'trixie' | 'alpine' | 'ubuntu' | 'custom';
export type PackageManager = 'apt' | 'apk';

/**
 * Deployment target/runtime environment
 * Determines environment-specific optimizations and compatibility checks
 */
export type DeploymentTarget = 'local' | 'codespaces' | 'gitpod' | 'devpod';
export type LanguageOverlay =
    | 'dotnet'
    | 'nodejs'
    | 'python'
    | 'mkdocs'
    | 'java'
    | 'go'
    | 'rust'
    | 'bun'
    | 'powershell';
export type DatabaseOverlay =
    | 'postgres'
    | 'redis'
    | 'mongodb'
    | 'mysql'
    | 'sqlserver'
    | 'sqlite'
    | 'minio'
    | 'rabbitmq'
    | 'redpanda'
    | 'nats';
export type CloudTool =
    | 'azure-cli'
    | 'aws-cli'
    | 'gcloud'
    | 'kubectl-helm'
    | 'terraform'
    | 'pulumi';
export type DevTool =
    | 'docker-in-docker'
    | 'docker-sock'
    | 'codex'
    | 'playwright'
    | 'git-helpers'
    | 'pre-commit'
    | 'commitlint'
    | 'just'
    | 'direnv'
    | 'modern-cli-tools'
    | 'ngrok';
export type ObservabilityTool = 'otel-collector' | 'jaeger' | 'prometheus' | 'grafana' | 'loki';

// Legacy type for backwards compatibility
export type Database = 'none' | 'postgres' | 'redis' | 'postgres+redis';

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
 * Editor profile for customizations
 */
export type EditorProfile = 'vscode' | 'jetbrains' | 'none';

/**
 * Questionnaire response interface
 */
export interface QuestionnaireAnswers {
    stack: Stack;
    baseImage: BaseImage;
    customImage?: string; // Only used when baseImage is 'custom'
    containerName?: string; // Container/project name from devcontainer.json
    preset?: string; // ID of preset used, if any
    presetChoices?: Record<string, string>; // User choices made within preset
    presetGlueConfig?: PresetGlueConfig; // Glue configuration from preset
    language?: LanguageOverlay[]; // Support multiple language overlays
    needsDocker: boolean;
    database?: DatabaseOverlay[]; // Support multiple database overlays
    playwright: boolean;
    cloudTools: CloudTool[];
    devTools: DevTool[];
    observability: ObservabilityTool[];
    outputPath: string;
    portOffset?: number; // Optional port offset for running multiple instances
    target?: DeploymentTarget; // Deployment target for environment-specific optimizations
    minimal?: boolean; // Whether to use minimal mode (exclude optional/nice-to-have features)
    editor?: EditorProfile; // Editor profile for customizations (default: vscode)
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
 * Overlay categories - just metadata for grouping in UI
 */
export type OverlayCategory =
    | 'language'
    | 'database'
    | 'observability'
    | 'cloud'
    | 'dev'
    | 'preset';

/**
 * Port metadata - can be simple number or rich object
 */
export interface PortMetadata {
    port: number;
    service?: string;
    protocol?: 'http' | 'https' | 'tcp' | 'udp' | 'grpc';
    description?: string;
    path?: string;
    onAutoForward?: 'notify' | 'openBrowser' | 'openPreview' | 'silent' | 'ignore';
    connectionStringTemplate?: string;
}

/**
 * Normalized port information (always in object form)
 */
export interface NormalizedPort extends PortMetadata {
    actualPort: number; // Port after offset is applied
}

/**
 * Overlay metadata from overlays.yml
 */
export interface OverlayMetadata {
    id: string;
    name: string;
    description: string;
    category: OverlayCategory;
    supports?: string[];
    requires?: string[];
    suggests?: string[];
    conflicts?: string[];
    tags?: string[];
    ports?: (number | PortMetadata)[]; // Support both legacy and rich format
    order?: number;
    imports?: string[]; // Shared files to import from overlays/.shared/
    minimal?: boolean; // Whether this overlay is excluded in minimal mode
}

/**
 * User choice configuration for presets
 */
export interface PresetUserChoice {
    id: string;
    prompt: string;
    options: string[];
    defaultOption?: string;
}

/**
 * Glue configuration for presets
 */
export interface PresetGlueConfig {
    environment?: Record<string, string>;
    portMappings?: Record<string, number>;
    readme?: string;
}

/**
 * Meta-overlay (preset) definition
 */
export interface MetaOverlay {
    id: string;
    name: string;
    description: string;
    category: 'preset';
    type: 'meta';
    supports?: string[];
    tags?: string[];
    selects: {
        required: string[];
        userChoice?: Record<string, PresetUserChoice>;
    };
    glueConfig?: PresetGlueConfig;
}

/**
 * Generated port documentation
 */
export interface PortsDocumentation {
    portOffset: number;
    ports: NormalizedPort[];
    connectionStrings?: Record<string, string>;
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
        package_manager?: PackageManager;
    }>;
    base_templates: Array<{
        id: string;
        name: string;
        description: string;
    }>;
    /** All overlays, regardless of category */
    overlays: OverlayMetadata[];
}

/**
 * Superposition manifest generated alongside devcontainer.json
 */
export interface SuperpositionManifest {
    // Versioning fields
    manifestVersion: string; // Schema version (increments on breaking changes)
    generatedBy: string; // Tool version that created this manifest
    version?: string; // Legacy field for backward compatibility (deprecated)

    // Metadata
    generated: string;

    // Configuration
    baseTemplate: Stack;
    baseImage: string;
    overlays: string[];
    portOffset?: number;
    preset?: string; // ID of preset used, if any
    presetChoices?: Record<string, string>; // User choices made within preset
    autoResolved?: {
        added: string[];
        reason: string;
    };
    containerName?: string; // Container/project name from devcontainer.json
    customizations?: {
        enabled: boolean;
        location: string;
    };
}

/**
 * Custom patch configuration loaded from .devcontainer/custom/
 */
export interface CustomizationConfig {
    devcontainerPatch?: DevContainer;
    dockerComposePatch?: any; // YAML structure for docker-compose
    environmentVars?: Record<string, string>;
    scripts?: {
        postCreate?: string[];
        postStart?: string[];
    };
    files?: Array<{
        source: string;
        destination: string;
    }>;
}
