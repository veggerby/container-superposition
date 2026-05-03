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
    | 'jupyter'
    | 'powershell';
export type MessagingOverlay = 'rabbitmq' | 'redpanda' | 'nats';
export type DatabaseOverlay =
    | 'postgres'
    | 'redis'
    | 'mongodb'
    | 'mysql'
    | 'sqlserver'
    | 'sqlite'
    | 'duckdb'
    | 'minio'
    | MessagingOverlay;
export type CloudTool =
    | 'azure-cli'
    | 'aws-cli'
    | 'gcloud'
    | 'cloudflared'
    | 'kubectl-helm'
    | 'kind'
    | 'localstack'
    | 'terraform'
    | 'pulumi';
export type DevTool =
    | 'docker-in-docker'
    | 'docker-sock'
    | 'codex'
    | 'playwright'
    | 'git-helpers'
    | 'grpc-tools'
    | 'keycloak'
    | 'mailpit'
    | 'pre-commit'
    | 'commitlint'
    | 'just'
    | 'direnv'
    | 'modern-cli-tools'
    | 'ngrok'
    | 'openapi-tools'
    | 'pandoc'
    | 'spec-kit'
    | 'tilt'
    | 'claude-code'
    | 'gemini-cli'
    | 'amp'
    | 'windsurf-cli'
    | 'opencode'
    | 'mkdocs2'
    | 'devcontainer-cli';
export type ObservabilityTool =
    | 'alertmanager'
    | 'otel-collector'
    | 'otel-demo-nodejs'
    | 'otel-demo-python'
    | 'jaeger'
    | 'prometheus'
    | 'promtail'
    | 'grafana'
    | 'loki'
    | 'tempo';

/**
 * Union of all overlay ID types — used for the flat `overlays` field
 * in project config and anywhere an overlay ID is accepted regardless of category.
 */
export type OverlayId = LanguageOverlay | DatabaseOverlay | CloudTool | DevTool | ObservabilityTool;

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
export type ProjectEnvTarget = 'auto' | 'remoteEnv' | 'composeEnv';
export interface ProjectEnvVar {
    value: string;
    target?: ProjectEnvTarget;
}

export type ProjectMountTarget = 'auto' | 'devcontainerMount' | 'composeVolume';
export interface ProjectMount {
    value: string;
    target?: ProjectMountTarget;
}

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
    projectEnv?: Record<string, ProjectEnvVar>; // First-class project env routed by stack/target
    projectMounts?: ProjectMount[]; // First-class project mounts routed by stack/target
    customizations?: CustomizationConfig; // Project-config or manifest-driven customizations
    overlayParameters?: Record<string, string>; // Resolved overlay parameter values ({{cs.KEY}} substitution)
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
        jetbrains?: {
            backend: string;
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
    | 'messaging'
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
 * Declaration of a single configurable parameter for an overlay.
 * Parameters are resolved at generation time using {{cs.PARAM_NAME}} substitution.
 */
export interface OverlayParameterDefinition {
    description: string; // Human-readable explanation shown in interactive prompts
    default?: string; // Default value; absence means the parameter is required
    sensitive?: boolean; // Marks secrets — hidden in prompts and redacted in plan output
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
    serviceOrder?: number; // Docker Compose service startup order (0=infra, 1=observability backend, 2=middleware, 3=UI)
    imports?: string[]; // Shared files to import from overlays/.shared/
    compose_imports?: string[]; // Shared docker-compose fragments to import from overlays/.shared/
    minimal?: boolean; // Whether this overlay is excluded in minimal mode
    hidden?: boolean; // Whether this overlay is hidden from the interactive questionnaire
    parameters?: Record<string, OverlayParameterDefinition>; // Configurable parameters for this overlay
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
 * A single option within a preset parameter
 */
export interface PresetParameterOption {
    id: string;
    overlays: string[];
    description?: string;
}

/**
 * A parameterized slot in a preset definition (supports multiple overlays per option)
 */
export interface PresetParameter {
    description?: string;
    default: string;
    required?: boolean;
    options: PresetParameterOption[];
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
    parameters?: Record<string, PresetParameter>;
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
    target?: DeploymentTarget; // Deployment target used during generation
    minimal?: boolean; // Whether minimal mode was used during generation
    editor?: EditorProfile; // Editor profile used during generation
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
        /** Pre-loaded file content; avoids re-reading from disk when available (e.g. when materialized from a project config). */
        content?: string;
    }>;
}

export interface ProjectConfigFileEntry {
    path: string;
    fileName: '.superposition.yml' | 'superposition.yml';
}

export interface ProjectConfigCustomizationsInput {
    devcontainerPatch?: DevContainer;
    dockerComposePatch?: Record<string, any>;
    envTemplate?: Record<string, string>;
    scripts?: {
        postCreate?: string[];
        postStart?: string[];
    };
    files?: Array<{
        path: string;
        content: string;
    }>;
}

// ─── Doctor --fix types ────────────────────────────────────────────────────

export type DiagnosticCategory = 'environment' | 'overlay' | 'manifest' | 'merge' | 'ports';

/**
 * Whether a diagnostic finding can be automatically remediated.
 */
export type FixEligibility = 'automatic' | 'manual-only' | 'not-applicable';

export type RecheckScope = 'environment' | 'manifest' | 'devcontainer' | 'full';

export type SafetyClass = 'safe-unattended' | 'requires-manual-action';

export type ExecutionKind = 'shell-command' | 'manifest-migration' | 'regeneration' | 'no-op';

export type FixOutcome = 'fixed' | 'already-compliant' | 'skipped' | 'requires-manual-action';

export type ExitDisposition = 'success' | 'repaired-with-warnings' | 'unresolved-failures';

/**
 * A single diagnostic finding produced by the doctor command.
 * Extends the internal CheckResult with structured fix metadata.
 */
export interface DiagnosticFinding {
    id: string;
    category: DiagnosticCategory;
    name: string;
    status: 'pass' | 'warn' | 'fail';
    message: string;
    details?: string[];
    fixEligibility: FixEligibility;
    remediationKey?: string;
    recheckScope: RecheckScope;
}

/**
 * A remediation action registered for a specific finding.
 */
export interface RemediationAction {
    key: string;
    findingId: string;
    safetyClass: SafetyClass;
    executionKind: ExecutionKind;
    preconditions: string[];
    plannedChanges: string[];
    manualFallback: string[];
}

/**
 * Result of executing a single remediation action.
 */
export interface FixExecution {
    findingId: string;
    remediationKey: string;
    attempted: boolean;
    outcome: FixOutcome;
    reason: string;
    commands?: string[];
    changedFiles?: string[];
    backupPath?: string;
    rechecked: boolean;
}

/**
 * Aggregated outcome counts for a fix run.
 */
export interface FixOutcomeSummary {
    fixed: number;
    alreadyCompliant: number;
    skipped: number;
    requiresManualAction: number;
    total: number;
}

/**
 * Complete record of a doctor --fix execution.
 */
export interface FixRun {
    outputPath: string;
    requestedJson: boolean;
    initialFindings: DiagnosticFinding[];
    executions: FixExecution[];
    finalFindings: DiagnosticFinding[];
    summary: FixOutcomeSummary;
    exitDisposition: ExitDisposition;
}

/**
 * Resolved composition input — produced by mergeAnswers() after all user input has been
 * collected and defaults applied. Guarantees that array fields which QuestionnaireAnswers
 * leaves optional are present (empty arrays at minimum), making downstream code type-safe.
 */
export interface CompositionInput extends QuestionnaireAnswers {
    language: LanguageOverlay[];
    database: DatabaseOverlay[];
}

export interface ProjectConfigSelection {
    stack?: Stack;
    baseImage?: BaseImage;
    customImage?: string;
    containerName?: string;
    preset?: string;
    presetChoices?: Record<string, string>;
    overlays?: OverlayId[];
    outputPath?: string;
    portOffset?: number;
    target?: DeploymentTarget;
    minimal?: boolean;
    editor?: EditorProfile;
    env?: Record<string, ProjectEnvVar>;
    mounts?: ProjectMount[];
    customizations?: ProjectConfigCustomizationsInput;
    parameters?: Record<string, string>; // Overlay parameter values for {{cs.KEY}} substitution
}
