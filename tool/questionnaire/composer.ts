import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import * as yaml from 'js-yaml';
import type {
    CompositionInput,
    QuestionnaireAnswers,
    DevContainer,
    CloudTool,
    OverlayMetadata,
    OverlaysConfig,
    SuperpositionManifest,
    PresetGlueConfig,
    CustomizationConfig,
    PortsDocumentation,
    DeploymentTarget,
    ProjectEnvVar,
    ProjectMount,
} from '../schema/types.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import {
    loadCustomPatches,
    hasCustomDirectory,
    getCustomScriptPaths,
} from '../schema/custom-loader.js';
import { generateReadme } from '../readme/readme-generator.js';
import { CURRENT_MANIFEST_VERSION } from '../schema/manifest-migrations.js';
import { getToolVersion } from '../utils/version.js';
import {
    deepMerge,
    mergeRemoteEnv,
    mergePackages,
    filterDependsOn,
    applyPortOffset,
    applyPortOffsetToEnv,
} from '../utils/merge.js';
import { generatePortsDocumentation } from '../utils/port-utils.js';
import { generateServicesMarkdown, generateEnvLocalExample } from '../utils/services-export.js';
import type { GenerationSummary } from '../utils/summary.js';
import { appendGitignoreSection } from '../utils/gitignore.js';
import {
    getTargetRule,
    resolveTargetFilePath,
    removeStaleTargetArtifacts,
} from '../schema/target-rules.js';
import type { TargetRuleContext } from '../schema/target-rules.js';
import {
    collectOverlayParameters,
    resolveParameters,
    substituteParameters,
    substituteParametersInObject,
    findUnresolvedTokens,
    redactSensitiveValues,
} from '../utils/parameters.js';
import {
    detectWarnings,
    generateTips,
    generateNextSteps,
    overlaysToServices,
    portsToPortInfo,
} from '../utils/summary.js';
import { resolveRepoPath } from '../utils/paths.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Anchor for resolving the top-level templates directory.
// In source layout: <repo>/tool/questionnaire -> anchor becomes <repo>/tool.
//   path.basename('tool') === 'tool', so we go one level up to reach <repo>.
// In compiled layout: <repo>/dist/tool/questionnaire -> anchor becomes <repo>/dist/tool.
//   path.basename('tool') === 'tool', so we go one level up to <repo>/dist,
//   then resolveRepoPath walks further up to find templates/ at the repo root.
// NOTE: This check relies on the source directory being named 'tool'. If that changes,
// update this constant accordingly.
const TEMPLATES_ANCHOR_BASE = path.join(__dirname, '..', '..');
const TEMPLATES_ANCHOR =
    path.basename(TEMPLATES_ANCHOR_BASE) === 'tool'
        ? path.dirname(TEMPLATES_ANCHOR_BASE)
        : TEMPLATES_ANCHOR_BASE;

const TEMPLATES_DIR = resolveRepoPath('templates', TEMPLATES_ANCHOR);
const REPO_ROOT = path.dirname(TEMPLATES_DIR);

// ─── JetBrains support ────────────────────────────────────────────────────

/**
 * Language overlays that have a defined JetBrains backend mapping.
 * Used both in getJetBrainsBackend() and in the language filter for
 * generateJetBrainsArtifacts() — kept in one place for consistency.
 */
const JETBRAINS_SUPPORTED_LANGUAGES = new Set([
    'nodejs',
    'bun',
    'python',
    'mkdocs',
    'go',
    'dotnet',
    'java',
    'rust',
]);

/**
 * Map a language overlay ID to the appropriate JetBrains backend identifier.
 * Falls back to 'IntelliJIdea' when the language is unknown or unspecified.
 *
 * When multiple language overlays are selected, the first match in the
 * provided array determines the backend; the array order reflects the user's
 * selection order.
 */
function getJetBrainsBackend(languageOverlays: string[]): string {
    for (const lang of languageOverlays) {
        switch (lang) {
            case 'nodejs':
            case 'bun':
                return 'WebStorm';
            case 'python':
            case 'mkdocs':
                return 'PyCharm';
            case 'go':
                return 'GoLand';
            case 'dotnet':
                return 'Rider';
            case 'rust':
                return 'RustRover';
            case 'java':
                return 'IntelliJIdea';
        }
    }
    return 'IntelliJIdea';
}

/**
 * Generate the content of .idea/.gitignore for a JetBrains project.
 * Marks shared settings (run configurations, code style) as tracked and
 * excludes user-local entries (workspace.xml, shelf/).
 */
function generateIdeaGitignore(): string {
    return `# Default ignored files
/shelf/
/workspace.xml

# Editor-based HTTP Client requests
/httpRequests/

# Datasource local storage
/dataSources/
/dataSources.local.xml
`;
}

/**
 * Generate a JetBrains run configuration XML for the given language overlay.
 * Returns an object with the filename and XML content, or null when no
 * configuration is defined for the supplied language.
 */
function generateRunConfiguration(lang: string): { filename: string; content: string } | null {
    switch (lang) {
        case 'nodejs':
        case 'bun': {
            const manager = lang === 'bun' ? 'bun' : 'npm';
            const runScript = lang === 'bun' ? 'bun run dev' : 'npm run dev';
            return {
                filename: `${manager}_dev.xml`,
                content: `<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="${runScript}" type="js.build_tools.npm" factoryName="npm">
    <package-json value="$PROJECT_DIR$/package.json" />
    <command value="run" />
    <scripts>
      <script value="dev" />
    </scripts>
    <node-interpreter value="project" />
    <envs />
    <method v="2" />
  </configuration>
</component>
`,
            };
        }
        case 'mkdocs': {
            return {
                filename: 'mkdocs_serve.xml',
                content: `<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="MkDocs: mkdocs serve" type="PythonConfigurationType" factoryName="Python">
    <module name="" />
    <option name="INTERPRETER_OPTIONS" value="" />
    <option name="PARENT_ENVS" value="true" />
    <envs>
      <env name="PYTHONUNBUFFERED" value="1" />
    </envs>
    <option name="SDK_HOME" value="" />
    <option name="SDK_NAME" value="" />
    <option name="WORKING_DIRECTORY" value="$PROJECT_DIR$" />
    <option name="IS_MODULE_SDK" value="false" />
    <option name="ADD_CONTENT_ROOTS" value="true" />
    <option name="ADD_SOURCE_ROOTS" value="true" />
    <EXTENSION ID="PythonCoverageRunConfigurationExtension" runner="coverage.py" />
    <option name="SCRIPT_NAME" value="-m" />
    <option name="MODULE_MODE" value="true" />
    <option name="PARAMETERS" value="mkdocs serve" />
    <option name="SHOW_COMMAND_LINE" value="false" />
    <option name="EMULATE_TERMINAL" value="false" />
    <option name="REDIRECT_INPUT" value="false" />
    <option name="INPUT_FILE" value="" />
    <method v="2" />
  </configuration>
</component>
`,
            };
        }
        case 'python': {
            return {
                filename: 'python_main.xml',
                content: `<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Python: main.py" type="PythonConfigurationType" factoryName="Python">
    <module name="" />
    <option name="INTERPRETER_OPTIONS" value="" />
    <option name="PARENT_ENVS" value="true" />
    <envs>
      <env name="PYTHONUNBUFFERED" value="1" />
    </envs>
    <option name="SDK_HOME" value="" />
    <option name="SDK_NAME" value="" />
    <option name="WORKING_DIRECTORY" value="$PROJECT_DIR$" />
    <option name="IS_MODULE_SDK" value="false" />
    <option name="ADD_CONTENT_ROOTS" value="true" />
    <option name="ADD_SOURCE_ROOTS" value="true" />
    <EXTENSION ID="PythonCoverageRunConfigurationExtension" runner="coverage.py" />
    <option name="SCRIPT_NAME" value="$PROJECT_DIR$/main.py" />
    <option name="PARAMETERS" value="" />
    <option name="SHOW_COMMAND_LINE" value="false" />
    <option name="EMULATE_TERMINAL" value="false" />
    <option name="MODULE_MODE" value="false" />
    <option name="REDIRECT_INPUT" value="false" />
    <option name="INPUT_FILE" value="" />
    <method v="2" />
  </configuration>
</component>
`,
            };
        }
        case 'go': {
            return {
                filename: 'go_run.xml',
                content: `<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Go: run ./..." type="GoApplicationRunConfiguration" factoryName="Go Application">
    <module name="" />
    <working_directory value="$PROJECT_DIR$" />
    <parameters value="" />
    <kind value="PACKAGE" />
    <package value="./..." />
    <directory value="$PROJECT_DIR$" />
    <filePath value="$PROJECT_DIR$" />
    <method v="2" />
  </configuration>
</component>
`,
            };
        }
        case 'dotnet': {
            return {
                filename: 'dotnet_run.xml',
                content: `<component name="ProjectRunConfigurationManager">
  <configuration default="false" name=".NET: dotnet run" type="DotNetRunConfiguration" factoryName="Run">
    <option name="EXE_PATH" value="" />
    <option name="PROGRAM_PARAMETERS" value="" />
    <option name="WORKING_DIRECTORY" value="$PROJECT_DIR$" />
    <option name="PASS_PARENT_ENVS" value="1" />
    <option name="USE_EXTERNAL_CONSOLE" value="0" />
    <option name="RUNTIME_ARGUMENTS" value="" />
    <option name="PROJECT_PATH" value="$PROJECT_DIR$" />
    <option name="TARGET_FRAMEWORK_ID" value="" />
    <option name="RUNTIME_ID" value="" />
    <method v="2" />
  </configuration>
</component>
`,
            };
        }
        case 'java': {
            return {
                filename: 'java_run.xml',
                content: `<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Java: Application" type="Application" factoryName="Application">
    <option name="MAIN_CLASS_NAME" value="Main" />
    <module name="" />
    <option name="VM_PARAMETERS" value="" />
    <option name="PROGRAM_PARAMETERS" value="" />
    <option name="WORKING_DIRECTORY" value="$PROJECT_DIR$" />
    <option name="ALTERNATIVE_JRE_PATH_ENABLED" value="false" />
    <option name="ENABLE_SWING_INSPECTOR" value="false" />
    <option name="ENV_VARIABLES" />
    <option name="PASS_PARENT_ENVS" value="true" />
    <method v="2">
      <option name="Make" enabled="true" />
    </method>
  </configuration>
</component>
`,
            };
        }
        case 'rust': {
            return {
                filename: 'rust_run.xml',
                content: `<component name="ProjectRunConfigurationManager">
  <configuration default="false" name="Rust: cargo run" type="CargoCommandRunConfiguration" factoryName="Cargo Command">
    <option name="command" value="run" />
    <option name="workingDirectory" value="$PROJECT_DIR$" />
    <envs />
    <method v="2" />
  </configuration>
</component>
`,
            };
        }
        default:
            return null;
    }
}

/**
 * Generate JetBrains IDE artifacts (.idea/.gitignore and run configurations)
 * into the project root directory (parent of outputPath).
 *
 * Returns a list of project-root-relative paths that were written so the
 * caller can register them and report what was generated.
 */
function generateJetBrainsArtifacts(projectRoot: string, languageOverlays: string[]): string[] {
    const ideaDir = path.join(projectRoot, '.idea');
    const runConfigsDir = path.join(ideaDir, 'runConfigurations');

    const written: string[] = [];

    // Ensure directories exist
    if (!fs.existsSync(ideaDir)) {
        fs.mkdirSync(ideaDir, { recursive: true });
    }
    if (!fs.existsSync(runConfigsDir)) {
        fs.mkdirSync(runConfigsDir, { recursive: true });
    }

    // Write .idea/.gitignore (only if not already present)
    const gitignorePath = path.join(ideaDir, '.gitignore');
    if (!fs.existsSync(gitignorePath)) {
        fs.writeFileSync(gitignorePath, generateIdeaGitignore());
        written.push('.idea/.gitignore');
    }

    // Write run configurations for each recognised language overlay
    const generated: string[] = [];
    const skipped: string[] = [];

    for (const lang of languageOverlays) {
        const runConfig = generateRunConfiguration(lang);
        if (!runConfig) continue;

        const xmlPath = path.join(runConfigsDir, runConfig.filename);
        if (!fs.existsSync(xmlPath)) {
            fs.writeFileSync(xmlPath, runConfig.content);
            written.push(`.idea/runConfigurations/${runConfig.filename}`);
            generated.push(lang);
        } else {
            skipped.push(runConfig.filename);
        }
    }

    if (generated.length > 0) {
        console.log(
            chalk.dim(`   💡 Generated JetBrains run configuration(s) for: ${generated.join(', ')}`)
        );
    }
    if (skipped.length > 0) {
        console.log(
            chalk.dim(
                `   ⏭️  Skipped existing JetBrains run configuration(s): ${skipped.join(', ')}`
            )
        );
    }
    if (languageOverlays.length === 0) {
        console.log(
            chalk.dim(
                `   ℹ️  No language overlays selected — no JetBrains run configurations generated`
            )
        );
    }

    return written;
}

// ─── End JetBrains support ────────────────────────────────────────────────

/**
 * Merge packages from apt-get-packages feature
 */
function mergeAptPackages(baseConfig: DevContainer, packages: string): DevContainer {
    const featureKey = 'ghcr.io/devcontainers-extra/features/apt-get-packages:1';

    if (!baseConfig.features) {
        baseConfig.features = {};
    }

    if (!baseConfig.features[featureKey]) {
        baseConfig.features[featureKey] = { packages };
    } else {
        const existing = baseConfig.features[featureKey].packages || '';
        const merged = mergePackages(existing, packages);
        baseConfig.features[featureKey].packages = merged;
    }

    return baseConfig;
}

/**
 * Merge packages from cross-distro-packages feature
 */
function mergeCrossDistroPackages(
    baseConfig: DevContainer,
    apt: string | undefined,
    apk: string | undefined
): DevContainer {
    const featureKey = './features/cross-distro-packages';

    if (!baseConfig.features) {
        baseConfig.features = {};
    }

    if (!baseConfig.features[featureKey]) {
        baseConfig.features[featureKey] = {};
    }

    // Merge apt packages
    if (apt) {
        const existing = baseConfig.features[featureKey].apt || '';
        const merged = mergePackages(existing, apt);
        baseConfig.features[featureKey].apt = merged;
    }

    // Merge apk packages
    if (apk) {
        const existing = baseConfig.features[featureKey].apk || '';
        const merged = mergePackages(existing, apk);
        baseConfig.features[featureKey].apk = merged;
    }

    return baseConfig;
}

/**
 * Load and parse a JSON file
 */
function loadJson<T = any>(filePath: string): T {
    const content = fs.readFileSync(filePath, 'utf-8');
    return JSON.parse(content);
}

/**
 * Get all overlay definitions as a flat array
 */
function getAllOverlayDefs(config: OverlaysConfig): OverlayMetadata[] {
    return config.overlays;
}

/** ID for the meta overlay that expands to all available overlays */
const META_OVERLAY_ID = 'all';

/**
 * Resolve dependencies for a set of overlays
 * Returns the expanded list with dependencies and metadata about what was added
 */
function resolveDependencies(
    requestedOverlays: string[],
    allOverlayDefs: OverlayMetadata[]
): { overlays: string[]; autoResolved: { added: string[]; reason: string } } {
    const overlayMap = new Map<string, OverlayMetadata>();
    allOverlayDefs.forEach((def) => overlayMap.set(def.id, def));

    // Expand the meta overlay to all known non-meta overlay IDs
    let expandedRequest = requestedOverlays;
    if (requestedOverlays.includes(META_OVERLAY_ID)) {
        const allIds = allOverlayDefs
            .filter((def) => def.id !== META_OVERLAY_ID && def.category !== 'preset' && !def.hidden)
            .map((def) => def.id);
        expandedRequest = [
            ...requestedOverlays.filter((id) => id !== META_OVERLAY_ID),
            ...allIds.filter((id) => !requestedOverlays.includes(id)),
        ];
    }

    const resolved = new Set<string>(expandedRequest);
    const autoAdded: string[] = [];
    const resolutionReasons: string[] = [];

    // Resolve dependencies recursively
    const toProcess = [...expandedRequest];
    const processed = new Set<string>();

    while (toProcess.length > 0) {
        const current = toProcess.shift()!;
        if (processed.has(current)) continue;
        processed.add(current);

        const overlayDef = overlayMap.get(current);
        if (!overlayDef || !overlayDef.requires || overlayDef.requires.length === 0) {
            continue;
        }

        // Add required dependencies
        for (const required of overlayDef.requires) {
            if (!resolved.has(required)) {
                resolved.add(required);
                autoAdded.push(required);
                resolutionReasons.push(`${required} (required by ${current})`);
                toProcess.push(required);
            }
        }
    }

    // Check for conflicts
    const conflicts: string[] = [];
    for (const overlayId of resolved) {
        const overlayDef = overlayMap.get(overlayId);
        if (!overlayDef || !overlayDef.conflicts) continue;

        for (const conflict of overlayDef.conflicts) {
            if (resolved.has(conflict)) {
                conflicts.push(`${overlayId} conflicts with ${conflict}`);
            }
        }
    }

    if (conflicts.length > 0) {
        console.log(chalk.yellow(`\n⚠️  Warning: Conflicts detected:`));
        conflicts.forEach((c) => console.log(chalk.yellow(`   • ${c}`)));
        console.log(chalk.yellow(`\nPlease resolve these conflicts manually.\n`));
    }

    const reason = autoAdded.length > 0 ? resolutionReasons.join(', ') : '';

    return {
        overlays: Array.from(resolved),
        autoResolved: {
            added: autoAdded,
            reason,
        },
    };
}

/**
 * Prepare overlays for generation by loading configuration, building requested overlay list,
 * filtering for minimal mode, checking compatibility, and resolving dependencies.
 * This shared logic is used by both generateManifestOnly and composeDevContainer.
 */
function prepareOverlaysForGeneration(
    answers: CompositionInput,
    overlaysDir?: string
): {
    overlays: string[];
    autoResolved: { added: string[]; reason: string };
    overlaysConfig: OverlaysConfig;
} {
    // 1. Load overlay configuration
    const actualOverlaysDir = overlaysDir ?? path.join(REPO_ROOT, 'overlays');
    const indexYmlPath = path.join(actualOverlaysDir, 'index.yml');
    const overlaysConfig = loadOverlaysConfig(actualOverlaysDir, indexYmlPath);

    // Collect all overlay definitions
    const allOverlayDefs = getAllOverlayDefs(overlaysConfig);

    // Build list of requested overlays
    const requestedOverlays: string[] = [];
    if (answers.language && answers.language.length > 0)
        requestedOverlays.push(...answers.language);
    if (answers.database && answers.database.length > 0)
        requestedOverlays.push(...answers.database);
    if (answers.observability) requestedOverlays.push(...answers.observability);
    if (answers.playwright) requestedOverlays.push('playwright');
    if (answers.cloudTools) requestedOverlays.push(...answers.cloudTools);
    if (answers.devTools) requestedOverlays.push(...answers.devTools);

    // Filter out "minimal" overlays if --minimal flag is set
    let filteredRequestedOverlays = requestedOverlays;
    if (answers.minimal) {
        const minimalExcluded: string[] = [];
        filteredRequestedOverlays = requestedOverlays.filter((overlayId) => {
            const overlayDef = allOverlayDefs.find((o) => o.id === overlayId);
            if (overlayDef?.minimal === true) {
                minimalExcluded.push(overlayId);
                return false;
            }
            return true;
        });

        if (minimalExcluded.length > 0) {
            console.log(
                chalk.dim(
                    `   📦 Minimal mode: Excluding ${minimalExcluded.length} optional overlay(s): ${minimalExcluded.join(', ')}`
                )
            );
        }
    }

    // Check compatibility
    const incompatible: string[] = [];
    for (const overlayId of filteredRequestedOverlays) {
        const overlayDef = allOverlayDefs.find((o) => o.id === overlayId);
        if (overlayDef?.supports && overlayDef.supports.length > 0) {
            if (!overlayDef.supports.includes(answers.stack)) {
                incompatible.push(`${overlayId} (requires: ${overlayDef.supports.join(', ')})`);
            }
        }
    }

    if (incompatible.length > 0) {
        console.log(
            chalk.yellow(
                `\n⚠️  Warning: Some overlays are not compatible with '${answers.stack}' template:`
            )
        );
        incompatible.forEach((overlay) => {
            console.log(chalk.yellow(`   • ${overlay}`));
        });
        console.log(chalk.yellow(`\nThese overlays will be skipped.\n`));

        // Filter out incompatible overlays
        if (answers.database) {
            answers.database = answers.database.filter(
                (d) => !incompatible.some((i) => i.startsWith(d))
            ) as any;
        }
        if (answers.observability) {
            answers.observability = answers.observability.filter(
                (o) => !incompatible.some((i) => i.startsWith(o))
            ) as any;
        }

        // Update requestedOverlays after filtering
        requestedOverlays.length = 0;
        if (answers.language && answers.language.length > 0)
            requestedOverlays.push(...answers.language);
        if (answers.database && answers.database.length > 0)
            requestedOverlays.push(...answers.database);
        if (answers.observability) requestedOverlays.push(...answers.observability);
        if (answers.playwright) requestedOverlays.push('playwright');
        if (answers.cloudTools) requestedOverlays.push(...answers.cloudTools);
        if (answers.devTools) requestedOverlays.push(...answers.devTools);

        // Re-apply minimal filtering
        filteredRequestedOverlays = requestedOverlays.filter((overlayId) => {
            const overlayDef = allOverlayDefs.find((o) => o.id === overlayId);
            return !answers.minimal || overlayDef?.minimal !== true;
        });
    }

    // Resolve dependencies
    const { overlays: resolvedOverlays, autoResolved } = resolveDependencies(
        filteredRequestedOverlays,
        allOverlayDefs
    );

    return {
        overlays: resolvedOverlays,
        autoResolved,
        overlaysConfig,
    };
}

/**
 * Generate superposition.json manifest
 */
function generateManifest(
    outputPath: string,
    answers: CompositionInput,
    overlays: string[],
    autoResolved: { added: string[]; reason: string },
    containerName?: string,
    effectiveTarget?: DeploymentTarget
): void {
    const toolVersion = getToolVersion();

    const manifest: SuperpositionManifest = {
        manifestVersion: CURRENT_MANIFEST_VERSION,
        generatedBy: toolVersion,
        version: '0.1.0', // Legacy field for backward compatibility
        generated: new Date().toISOString(),
        baseTemplate: answers.stack,
        baseImage:
            answers.baseImage === 'custom' && answers.customImage
                ? answers.customImage
                : answers.baseImage,
        overlays,
        portOffset: answers.portOffset,
        preset: answers.preset,
        presetChoices: answers.presetChoices,
        containerName,
        target: effectiveTarget ?? answers.target ?? 'local',
    };

    if (answers.minimal) {
        manifest.minimal = true;
    }
    if (answers.editor && answers.editor !== 'vscode') {
        manifest.editor = answers.editor;
    }

    if (autoResolved.added.length > 0) {
        manifest.autoResolved = autoResolved;
    }

    // Track customizations if custom directory exists
    if (hasCustomDirectory(outputPath)) {
        // Compute the custom directory location relative to workspace root
        const outputDirName = path.basename(outputPath);
        manifest.customizations = {
            enabled: true,
            location: `${outputDirName}/custom`,
        };
    }

    const manifestPath = path.join(outputPath, 'superposition.json');
    fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
    console.log(chalk.dim(`   📋 Generated superposition.json manifest`));

    if (autoResolved.added.length > 0) {
        console.log(
            chalk.cyan(`   ℹ️  Auto-resolved dependencies: ${autoResolved.added.join(', ')}`)
        );
    }

    if (answers.preset) {
        console.log(chalk.cyan(`   ℹ️  Used preset: ${answers.preset}`));
    }
}

/**
 * Validate that an import path is within the allowed .shared/ directory (path traversal prevention).
 * Returns an error message if invalid, or null if the path is safe.
 */
function validateImportPath(importPath: string, overlaysDir: string): string | null {
    // FR-006: All imports must start with '.shared/'
    if (!importPath.startsWith('.shared/')) {
        return `Import path must begin with '.shared/': ${importPath}`;
    }

    // Normalize both the resolved path and the allowed base to detect traversal
    const sharedBase = path.resolve(overlaysDir, '.shared');
    const resolved = path.resolve(overlaysDir, importPath);

    if (!resolved.startsWith(sharedBase + path.sep) && resolved !== sharedBase) {
        return `Import path resolves outside '.shared/' directory (path traversal rejected): ${importPath}`;
    }

    return null;
}

/**
 * Load and resolve imports from shared files for an overlay
 */
function loadImportsForOverlay(
    overlayName: string,
    overlaysDir: string,
    silent = false
): DevContainer {
    let importedConfig: DevContainer = {};

    // Load overlay manifest to get imports
    const overlayDir = path.join(overlaysDir, overlayName);
    const manifestPath = path.join(overlayDir, 'overlay.yml');

    if (!fs.existsSync(manifestPath)) {
        return importedConfig;
    }

    try {
        const manifestContent = fs.readFileSync(manifestPath, 'utf8');
        const manifest = yaml.load(manifestContent) as any;

        if (
            !manifest.imports ||
            !Array.isArray(manifest.imports) ||
            manifest.imports.length === 0
        ) {
            return importedConfig;
        }

        // Process each import in declaration order
        for (const importPath of manifest.imports) {
            // FR-006: Reject path traversal attempts
            const traversalError = validateImportPath(importPath, overlaysDir);
            if (traversalError) {
                throw new Error(
                    `Path traversal rejected in overlay '${overlayName}': ${traversalError}`
                );
            }

            const fullImportPath = path.join(overlaysDir, importPath);

            if (!fs.existsSync(fullImportPath)) {
                // FR-007: Missing imports are errors, not warnings
                throw new Error(
                    `Import not found: '${importPath}' (referenced by overlay: ${overlayName})`
                );
            }

            // Determine file type and merge appropriately
            const ext = path.extname(importPath).toLowerCase();

            if (ext === '.json') {
                // JSON files are merged as devcontainer patches
                if (!silent) console.log(chalk.dim(`   📎 Applying shared import: ${importPath}`));
                const importedPatch = loadJson<DevContainer>(fullImportPath);
                importedConfig = deepMerge(importedConfig, importedPatch);
            } else if (ext === '.yaml' || ext === '.yml') {
                // YAML files are loaded and merged as devcontainer patches
                try {
                    if (!silent)
                        console.log(chalk.dim(`   📎 Applying shared import: ${importPath}`));
                    const yamlContent = fs.readFileSync(fullImportPath, 'utf8');
                    const importedPatch = yaml.load(yamlContent) as DevContainer;
                    if (importedPatch && typeof importedPatch === 'object') {
                        importedConfig = deepMerge(importedConfig, importedPatch);
                    }
                } catch (error) {
                    throw new Error(
                        `Failed to parse YAML import '${importPath}' (overlay: ${overlayName}): ${error instanceof Error ? error.message : String(error)}`
                    );
                }
            } else if (ext === '.env') {
                // .env files are handled separately during env merging — skip here
                if (!silent)
                    console.log(chalk.dim(`   📎 Shared .env import noted: ${importPath}`));
            } else {
                // FR-007: Unsupported file types are errors
                throw new Error(
                    `Unsupported import type '${ext}' for '${importPath}' (overlay: ${overlayName}). Supported types: .json, .yaml, .yml, .env`
                );
            }
        }
    } catch (error) {
        if (error instanceof Error) {
            // Fail fast on any error while loading imports so configuration issues are not silently ignored
            throw error;
        }
        // Non-Error throwables are unexpected; log a warning but continue
        console.warn(chalk.yellow(`⚠️  Failed to load imports for overlay: ${overlayName}`));
    }

    return importedConfig;
}

/**
 * Apply an overlay to the base configuration
 */
export function applyOverlay(
    baseConfig: DevContainer,
    overlayName: string,
    overlaysDir: string,
    options: { silent?: boolean } = {}
): DevContainer {
    const { silent = false } = options;
    const overlayPath = path.join(overlaysDir, overlayName, 'devcontainer.patch.json');

    if (!fs.existsSync(overlayPath)) {
        if (!silent) console.warn(chalk.yellow(`⚠️  Overlay not found: ${overlayName}`));
        return baseConfig;
    }

    // First, load and apply any imports
    const importedConfig = loadImportsForOverlay(overlayName, overlaysDir, silent);
    if (Object.keys(importedConfig).length > 0) {
        baseConfig = deepMerge(baseConfig, importedConfig);
    }

    const overlay = loadJson<DevContainer>(overlayPath);

    // Special handling for apt-get packages (legacy)
    if (overlay.features?.['ghcr.io/devcontainers-extra/features/apt-get-packages:1']?.packages) {
        const packages =
            overlay.features['ghcr.io/devcontainers-extra/features/apt-get-packages:1'].packages;
        baseConfig = mergeAptPackages(baseConfig, packages);

        // Remove it from overlay to avoid double-merge
        delete overlay.features['ghcr.io/devcontainers-extra/features/apt-get-packages:1'];
    }

    // Special handling for cross-distro packages
    if (overlay.features?.['./features/cross-distro-packages']) {
        const aptPackages = overlay.features['./features/cross-distro-packages'].apt;
        const apkPackages = overlay.features['./features/cross-distro-packages'].apk;
        baseConfig = mergeCrossDistroPackages(baseConfig, aptPackages, apkPackages);

        // Remove it from overlay to avoid double-merge
        delete overlay.features['./features/cross-distro-packages'];
    }

    return deepMerge(baseConfig, overlay);
}

/**
 * Registry to track all files that should exist in the output directory
 */
class FileRegistry {
    private files = new Set<string>();
    private directories = new Set<string>();

    addFile(relativePath: string): void {
        this.files.add(relativePath);
    }

    addDirectory(relativePath: string): void {
        this.directories.add(relativePath);
    }

    getFiles(): Set<string> {
        return this.files;
    }

    getDirectories(): Set<string> {
        return this.directories;
    }
}

/**
 * Recursively remove stale files within a registered subdirectory.
 * Called for directories that ARE in the registry but may contain files from
 * a previous run that are no longer part of the current generation (e.g.
 * scripts/setup-rabbitmq.sh after rabbitmq was removed from the project).
 * Returns the number of files removed.
 */
function cleanupStaleDirFiles(dirPath: string, prefix: string, expectedFiles: Set<string>): number {
    let removed = 0;
    const entries = fs.readdirSync(dirPath);
    for (const entry of entries) {
        const entryPath = path.join(dirPath, entry);
        const stat = fs.statSync(entryPath);
        if (stat.isDirectory()) {
            removed += cleanupStaleDirFiles(entryPath, `${prefix}${entry}/`, expectedFiles);
        } else {
            const registryKey = `${prefix}${entry}`;
            if (!expectedFiles.has(registryKey)) {
                fs.unlinkSync(entryPath);
                removed++;
            }
        }
    }
    return removed;
}

/**
 * Clean up stale files from previous runs.
 * Removes anything not in the registry (except preserved files like superposition.json).
 * Also recurses into registered subdirectories to remove individual stale files within
 * them — e.g. scripts/setup-rabbitmq.sh after rabbitmq is removed from the project.
 */
function cleanupStaleFiles(outputPath: string, registry: FileRegistry): void {
    if (!fs.existsSync(outputPath)) {
        return;
    }

    const preservedFiles = new Set(['superposition.json', '.env']); // User-managed files
    const preservedDirs = new Set(['custom']); // User customizations directory
    const expectedFiles = registry.getFiles();
    const expectedDirs = registry.getDirectories();

    const entries = fs.readdirSync(outputPath);
    let removedCount = 0;

    for (const entry of entries) {
        // Skip preserved files
        if (preservedFiles.has(entry)) {
            continue;
        }

        const entryPath = path.join(outputPath, entry);
        const stat = fs.statSync(entryPath);

        if (stat.isDirectory()) {
            // Skip preserved directories
            if (preservedDirs.has(entry)) {
                continue;
            }

            if (!expectedDirs.has(entry)) {
                // Remove directory entirely — nothing inside belongs to this run
                fs.rmSync(entryPath, { recursive: true, force: true });
                removedCount++;
            } else {
                // Directory is still expected, but individual files inside it may be stale
                // (e.g. scripts/setup-rabbitmq.sh after rabbitmq was removed)
                removedCount += cleanupStaleDirFiles(entryPath, `${entry}/`, expectedFiles);
            }
        } else {
            // Remove file if not in registry
            if (!expectedFiles.has(entry)) {
                fs.unlinkSync(entryPath);
                removedCount++;
            }
        }
    }

    if (removedCount > 0) {
        console.log(chalk.dim(`   🧹 Removed ${removedCount} stale file(s) from previous runs`));
    }
}

/**
 * Copy a directory recursively
 */
function copyDir(src: string, dest: string): void {
    if (!fs.existsSync(dest)) {
        fs.mkdirSync(dest, { recursive: true });
    }

    const entries = fs.readdirSync(src, { withFileTypes: true });

    for (const entry of entries) {
        const srcPath = path.join(src, entry.name);
        const destPath = path.join(dest, entry.name);

        if (entry.isDirectory()) {
            copyDir(srcPath, destPath);
        } else {
            fs.copyFileSync(srcPath, destPath);
        }
    }
}

/**
 * Recursively register every file inside a directory in the FileRegistry.
 * Used after copyDir() to ensure cleanup logic doesn't delete the copied contents.
 */
function registerDirContents(registry: FileRegistry, dirPath: string, prefix: string): void {
    if (!fs.existsSync(dirPath)) return;
    for (const entry of fs.readdirSync(dirPath, { withFileTypes: true })) {
        const rel = `${prefix}${entry.name}`;
        if (entry.isDirectory()) {
            registerDirContents(registry, path.join(dirPath, entry.name), `${rel}/`);
        } else {
            registry.addFile(rel);
        }
    }
}

/**
 * Copy additional files from overlay to output directory
 * Excludes devcontainer.patch.json and .env.example (handled separately)
 */
function copyOverlayFiles(
    outputPath: string,
    overlayName: string,
    registry: FileRegistry,
    overlaysDir: string
): void {
    const overlayPath = path.join(overlaysDir, overlayName);

    if (!fs.existsSync(overlayPath)) {
        return;
    }

    const entries = fs.readdirSync(overlayPath);
    let copiedFiles = 0;

    for (const entry of entries) {
        // Skip devcontainer.patch.json, .env.example, docker-compose.yml, setup.sh, verify.sh, .gitignore, and metadata files (handled separately)
        if (
            entry === 'devcontainer.patch.json' ||
            entry === '.env.example' ||
            entry === 'docker-compose.yml' ||
            entry === 'setup.sh' ||
            entry === 'verify.sh' ||
            entry === '.gitignore' ||
            entry === 'README.md' ||
            entry === 'overlay.yml'
        ) {
            continue;
        }

        const srcPath = path.join(overlayPath, entry);
        const stat = fs.statSync(srcPath);

        if (stat.isFile()) {
            // Copy config files with overlay prefix to avoid conflicts
            // e.g., global-tools.txt -> global-tools-dotnet.txt
            const basename = path.basename(entry, path.extname(entry));
            const ext = path.extname(entry);
            const destFilename = `${basename}-${overlayName}${ext}`;
            const destPath = path.join(outputPath, destFilename);
            fs.copyFileSync(srcPath, destPath);
            registry.addFile(destFilename);
            copiedFiles++;
        } else if (stat.isDirectory()) {
            // Copy directories recursively with overlay prefix
            const destDirName = `${entry}-${overlayName}`;
            const destPath = path.join(outputPath, destDirName);
            copyDir(srcPath, destPath);
            registry.addDirectory(destDirName);
            // Register every file inside the copied directory so that
            // cleanupStaleDirFiles does not delete them during the same run.
            registerDirContents(registry, destPath, `${destDirName}/`);
            copiedFiles++;
        }
    }

    if (copiedFiles > 0) {
        console.log(
            chalk.dim(`   📋 Copied ${copiedFiles} file(s) from ${chalk.cyan(overlayName)}`)
        );
    }
}

type ResolvedProjectEnvTarget = 'remoteEnv' | 'composeEnv';

const PROJECT_ENV_REFERENCE_PATTERN = /\$\{([A-Za-z_][A-Za-z0-9_]*)(?::-[^}]*)?\}/g;

function parseSimpleEnvFile(content: string): Record<string, string> {
    const env: Record<string, string> = {};

    for (const line of content.split('\n')) {
        const trimmed = line.trim();
        if (!trimmed || trimmed.startsWith('#')) {
            continue;
        }

        const match = trimmed.match(/^([^=]+)=(.*)$/);
        if (!match) {
            continue;
        }

        env[match[1].trim()] = match[2].trim();
    }

    return env;
}

function loadEnvFileIfExists(filePath: string): Record<string, string> {
    if (!fs.existsSync(filePath)) {
        return {};
    }

    return parseSimpleEnvFile(fs.readFileSync(filePath, 'utf8'));
}

function resolveProjectEnvTarget(
    entry: ProjectEnvVar,
    stack: QuestionnaireAnswers['stack']
): ResolvedProjectEnvTarget {
    const target = entry.target ?? 'auto';

    if (target === 'remoteEnv') {
        return 'remoteEnv';
    }

    if (target === 'composeEnv') {
        if (stack !== 'compose') {
            throw new Error(
                'Project env target "composeEnv" requires stack: compose because no docker-compose.yml is generated for plain stacks'
            );
        }
        return 'composeEnv';
    }

    return stack === 'compose' ? 'composeEnv' : 'remoteEnv';
}

function resolveRootEnvReferences(value: string, rootEnv: Record<string, string>): string {
    return value.replace(PROJECT_ENV_REFERENCE_PATTERN, (match, name: string) => {
        if (rootEnv[name] !== undefined) {
            return rootEnv[name];
        }

        const defaultMatch = match.match(/^\$\{[A-Za-z_][A-Za-z0-9_]*:-([^}]*)\}$/);
        return defaultMatch ? defaultMatch[1] : match;
    });
}

function hasUnresolvedProjectEnvReference(value: string): boolean {
    PROJECT_ENV_REFERENCE_PATTERN.lastIndex = 0;
    const result = PROJECT_ENV_REFERENCE_PATTERN.test(value);
    PROJECT_ENV_REFERENCE_PATTERN.lastIndex = 0;
    return result;
}

function buildResolvedProjectRemoteEnvEntries(
    projectEnv: QuestionnaireAnswers['projectEnv'],
    stack: QuestionnaireAnswers['stack'],
    rootEnv?: Record<string, string>
): Record<string, string> {
    const entries: Record<string, string> = {};

    for (const [key, entry] of Object.entries(projectEnv ?? {})) {
        if (resolveProjectEnvTarget(entry, stack) !== 'remoteEnv') {
            continue;
        }

        entries[key] = resolveRootEnvReferences(entry.value, rootEnv ?? {});
    }

    return entries;
}

function buildComposeProjectEnvInterpolationEntries(
    projectEnv: QuestionnaireAnswers['projectEnv'],
    stack: QuestionnaireAnswers['stack']
): Record<string, string> {
    const entries: Record<string, string> = {};

    for (const [key, entry] of Object.entries(projectEnv ?? {})) {
        if (resolveProjectEnvTarget(entry, stack) !== 'composeEnv') {
            continue;
        }

        entries[key] = `\${${key}}`;
    }

    return entries;
}

function buildComposeProjectRemoteEnvRefs(
    projectEnv: QuestionnaireAnswers['projectEnv'],
    stack: QuestionnaireAnswers['stack']
): Record<string, string> {
    const entries: Record<string, string> = {};

    for (const [key, entry] of Object.entries(projectEnv ?? {})) {
        if (resolveProjectEnvTarget(entry, stack) !== 'composeEnv') {
            continue;
        }

        entries[key] = `\${containerEnv:${key}}`;
    }

    return entries;
}

function materializeComposeProjectEnvValues(
    projectEnv: QuestionnaireAnswers['projectEnv'],
    stack: QuestionnaireAnswers['stack'],
    rootEnv: Record<string, string>
): Record<string, string> {
    const entries: Record<string, string> = {};

    for (const [key, entry] of Object.entries(projectEnv ?? {})) {
        if (resolveProjectEnvTarget(entry, stack) !== 'composeEnv') {
            continue;
        }

        const resolvedValue = resolveRootEnvReferences(entry.value, rootEnv);

        // Leave unresolved variables to shell/docker-compose fallback instead of
        // persisting placeholder syntax into .devcontainer/.env.
        if (hasUnresolvedProjectEnvReference(resolvedValue)) {
            continue;
        }
        entries[key] = resolvedValue;
    }

    return entries;
}

function applyProjectEnvToDevcontainer(
    config: DevContainer,
    projectEnv: QuestionnaireAnswers['projectEnv'],
    stack: QuestionnaireAnswers['stack'],
    rootEnv: Record<string, string>
): DevContainer {
    const remoteEnv = {
        ...buildResolvedProjectRemoteEnvEntries(projectEnv, stack, rootEnv),
        ...buildComposeProjectRemoteEnvRefs(projectEnv, stack),
    };

    if (Object.keys(remoteEnv).length === 0) {
        return config;
    }

    console.log(chalk.dim(`   🌱 Applying project env to remoteEnv`));
    return deepMerge(config, { remoteEnv }) as DevContainer;
}

type ResolvedProjectMountTarget = 'devcontainerMount' | 'composeVolume';

function resolveProjectMountTarget(
    mount: ProjectMount,
    stack: QuestionnaireAnswers['stack']
): ResolvedProjectMountTarget {
    const target = mount.target ?? 'auto';

    if (target === 'devcontainerMount') {
        return 'devcontainerMount';
    }

    if (target === 'composeVolume') {
        if (stack !== 'compose') {
            throw new Error(
                'Project mount target "composeVolume" requires stack: compose because no docker-compose.yml is generated for plain stacks'
            );
        }
        return 'composeVolume';
    }

    // auto
    return stack === 'compose' ? 'composeVolume' : 'devcontainerMount';
}

function applyProjectMountsToDevcontainer(
    config: DevContainer,
    projectMounts: ProjectMount[] | undefined,
    stack: QuestionnaireAnswers['stack']
): DevContainer {
    if (!projectMounts?.length) {
        return config;
    }

    const devcontainerMounts = projectMounts
        .filter((m) => resolveProjectMountTarget(m, stack) === 'devcontainerMount')
        .map((m) => m.value);

    if (devcontainerMounts.length === 0) {
        return config;
    }

    console.log(chalk.dim(`   🗂️  Applying project mounts to devcontainer.json`));
    return deepMerge(config, { mounts: devcontainerMounts }) as DevContainer;
}

function buildComposeProjectMountVolumes(
    projectMounts: ProjectMount[] | undefined,
    stack: QuestionnaireAnswers['stack']
): string[] {
    if (!projectMounts?.length) {
        return [];
    }

    return projectMounts
        .filter((m) => resolveProjectMountTarget(m, stack) === 'composeVolume')
        .map((m) => m.value);
}

function mergeComposeEnvFile(outputPath: string, entries: Record<string, string>): boolean {
    if (Object.keys(entries).length === 0) {
        return false;
    }

    const envPath = path.join(outputPath, '.env');
    const originalContent = fs.existsSync(envPath) ? fs.readFileSync(envPath, 'utf8') : '';
    const lines = originalContent === '' ? [] : originalContent.replace(/\n$/, '').split('\n');
    const indexByKey = new Map<string, number>();

    lines.forEach((line, index) => {
        const match = line.match(/^([^#=\s][^=]*)=(.*)$/);
        if (match) {
            indexByKey.set(match[1].trim(), index);
        }
    });

    let changed = false;
    let insertedSpacer = false;

    for (const [key, value] of Object.entries(entries)) {
        const rendered = `${key}=${value}`;
        const existingIndex = indexByKey.get(key);

        if (existingIndex !== undefined) {
            if (lines[existingIndex] !== rendered) {
                lines[existingIndex] = rendered;
                changed = true;
            }
            continue;
        }

        if (lines.length > 0 && !insertedSpacer && lines[lines.length - 1] !== '') {
            lines.push('');
            insertedSpacer = true;
        }

        lines.push(rendered);
        indexByKey.set(key, lines.length - 1);
        changed = true;
    }

    if (!changed && originalContent !== '') {
        return false;
    }

    fs.writeFileSync(envPath, `${lines.join('\n')}\n`);
    return true;
}

function materializeComposeProjectEnvFile(
    outputPath: string,
    projectEnv: QuestionnaireAnswers['projectEnv'],
    stack: QuestionnaireAnswers['stack'],
    rootEnv: Record<string, string>
): boolean {
    if (stack !== 'compose') {
        return false;
    }

    const materializedEntries = materializeComposeProjectEnvValues(projectEnv, stack, rootEnv);

    if (!mergeComposeEnvFile(outputPath, materializedEntries)) {
        return false;
    }

    console.log(
        chalk.dim(
            `   🔁 Materialized ${Object.keys(materializedEntries).length} project env value(s) into .devcontainer/.env for docker-compose`
        )
    );
    return true;
}

/**
 * Merge .env.example files from all selected overlays
 */
/**
 * Merge .env.example files from overlays and apply glue config
 */
function mergeEnvExamples(
    outputPath: string,
    overlays: string[],
    overlaysDir: string,
    portOffset?: number,
    glueConfig?: PresetGlueConfig,
    presetName?: string
): boolean {
    const envSections: string[] = [];

    for (const overlay of overlays) {
        // First, check for imports in the overlay and add any .env files from imports
        const overlayDir = path.join(overlaysDir, overlay);
        const manifestPath = path.join(overlayDir, 'overlay.yml');

        if (fs.existsSync(manifestPath)) {
            try {
                const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                const manifest = yaml.load(manifestContent) as any;

                if (manifest.imports && Array.isArray(manifest.imports)) {
                    for (const importPath of manifest.imports) {
                        // FR-006: Reject path traversal
                        const traversalError = validateImportPath(importPath, overlaysDir);
                        if (traversalError) {
                            throw new Error(
                                `Path traversal rejected in overlay '${overlay}': ${traversalError}`
                            );
                        }

                        const ext = path.extname(importPath).toLowerCase();
                        if (ext === '.env') {
                            const fullImportPath = path.join(overlaysDir, importPath);
                            if (fs.existsSync(fullImportPath)) {
                                console.log(
                                    chalk.dim(`   📎 Merging shared .env import: ${importPath}`)
                                );
                                const content = fs.readFileSync(fullImportPath, 'utf-8').trim();
                                if (content) {
                                    envSections.push(`# from ${importPath}\n${content}`);
                                }
                            } else {
                                throw new Error(
                                    `Import not found: '${importPath}' (referenced by overlay: ${overlay})`
                                );
                            }
                        }
                    }
                }
            } catch (error) {
                if (error instanceof Error) {
                    // Fail fast on import errors so .env import violations are not silently ignored
                    throw error;
                }
            }
        }

        // Then add the overlay's own .env.example
        const envPath = path.join(overlaysDir, overlay, '.env.example');

        if (fs.existsSync(envPath)) {
            const content = fs.readFileSync(envPath, 'utf-8').trim();
            if (content) {
                envSections.push(content);
            }
        }
    }

    // Add preset glue environment variables if present
    if (glueConfig?.environment && Object.keys(glueConfig.environment).length > 0) {
        let presetEnvSection = `# Preset: ${presetName || 'custom'}\n# Pre-configured environment variables from preset\n\n`;

        for (const [key, value] of Object.entries(glueConfig.environment)) {
            presetEnvSection += `${key}=${value}\n`;
        }

        envSections.push(presetEnvSection.trim());
    }

    if (envSections.length === 0) {
        return false;
    }

    // Create combined .env.example
    let header = `# Environment Variables
#
# Copy this file to .env in your project root to customize
# docker-compose and other service configurations.
#
# Generated by container-superposition init tool
`;

    if (portOffset) {
        header += `#
# NOTE: A port offset of ${portOffset} was applied to avoid conflicts.
# All service ports have been shifted by ${portOffset} (e.g., Grafana: ${3000 + portOffset} instead of 3000).
`;
    }

    header += '\n';

    const combined = header + envSections.join('\n\n');
    const envOutputPath = path.join(outputPath, '.env.example');
    fs.writeFileSync(envOutputPath, combined + '\n');

    console.log(chalk.dim(`   🔐 Created .env.example with ${overlays.length} overlay(s)`));

    // If port offset is specified, create a .env file with offset values
    if (portOffset) {
        const envContent = applyPortOffsetToEnv(combined, portOffset);
        const envFilePath = path.join(outputPath, '.env');
        fs.writeFileSync(envFilePath, envContent);
        console.log(chalk.dim(`   🔧 Created .env with port offset of ${portOffset}`));
    }

    return true;
}

/**
 * Merge .gitignore files from overlays into the project root .gitignore.
 * Writes to path.dirname(outputPath) — the project root (parent of .devcontainer/).
 * Only appends entries not already present; safe to run multiple times.
 * Returns true if any entries were written.
 */
function mergeGitignoreFiles(outputPath: string, overlays: string[], overlaysDir: string): boolean {
    const projectRoot = path.dirname(path.resolve(outputPath));
    const destPath = path.join(projectRoot, '.gitignore');

    let anyWritten = false;
    let sectionsWritten = 0;

    for (const overlay of overlays) {
        const gitignorePath = path.join(overlaysDir, overlay, '.gitignore');
        if (!fs.existsSync(gitignorePath)) continue;

        const content = fs.readFileSync(gitignorePath, 'utf-8').trim();
        if (!content) continue;

        const lines = content
            .split('\n')
            .map((l) => l.trim())
            .filter((l) => l.length > 0 && !l.startsWith('#'));

        if (lines.length === 0) continue;

        const written = appendGitignoreSection(
            destPath,
            `${overlay} (container-superposition)`,
            lines
        );
        if (written) {
            anyWritten = true;
            sectionsWritten++;
        }
    }

    if (anyWritten) {
        console.log(
            chalk.dim(`   📄 Updated .gitignore with entries from ${sectionsWritten} overlay(s)`)
        );
    } else {
        console.log(chalk.dim(`   📄 .gitignore already up to date`));
    }

    return anyWritten;
}

/**
 * Apply preset glue configuration (README and port mappings)
 * Note: Environment variables are handled in mergeEnvExamples to ensure proper port offset application
 */
function applyGlueConfig(
    outputPath: string,
    glueConfig: PresetGlueConfig,
    presetName?: string,
    fileRegistry?: FileRegistry
): void {
    console.log(chalk.cyan(`\n📦 Applying preset glue configuration...\n`));

    // 1. Create preset README if provided
    if (glueConfig.readme) {
        const readmePath = path.join(outputPath, 'PRESET-README.md');
        fs.writeFileSync(readmePath, glueConfig.readme);
        if (fileRegistry) {
            fileRegistry.addFile('PRESET-README.md');
        }
        console.log(chalk.dim(`   ✓ Created PRESET-README.md with usage instructions`));
    }

    // 2. Log port mappings (informational only - actual ports handled by overlay configs)
    if (glueConfig.portMappings && Object.keys(glueConfig.portMappings).length > 0) {
        console.log(chalk.dim(`   ℹ️  Suggested port mappings:`));
        for (const [service, port] of Object.entries(glueConfig.portMappings)) {
            console.log(chalk.dim(`      ${service}: ${port}`));
        }
    }

    // 3. Log environment variables if present
    if (glueConfig.environment && Object.keys(glueConfig.environment).length > 0) {
        console.log(
            chalk.dim(
                `   ✓ Added ${Object.keys(glueConfig.environment).length} environment variables to .env.example`
            )
        );
    }

    console.log('');
}

/**
 * Parse the effective host port from any docker-compose port binding format:
 *   "8081:8081", "127.0.0.1:8081:8081", "${VAR:-8081}:8081", 8081, {published:8081}
 */
function parseHostPortFromBinding(
    binding: string | number | Record<string, unknown>
): number | null {
    if (typeof binding === 'number') {
        // A bare number in docker-compose ports means container port → random host port.
        // There is no deterministic host port to conflict on, so treat as "no host port".
        return null;
    }
    if (typeof binding === 'object' && binding !== null) {
        const pub = (binding as any).published;
        if (pub == null) return null;
        if (typeof pub === 'number') return pub;
        const m = String(pub).match(/^(\d+)$/);
        return m ? parseInt(m[1], 10) : null;
    }
    if (typeof binding !== 'string') return null;
    // "${VAR:-8081}:..." — extract default
    const envMatch = binding.match(/^\$\{[^}]+:-(\d+)\}/);
    if (envMatch) return parseInt(envMatch[1], 10);
    const parts = binding.split(':');
    if (parts.length === 3) {
        const n = parseInt(parts[1], 10);
        return isNaN(n) ? null : n;
    }
    if (parts.length === 2) {
        const n = parseInt(parts[0], 10);
        return isNaN(n) ? null : n;
    }
    // Single segment: "8081" string — same as bare number, random host port.
    return null;
}

/**
 * Replace the host port in a binding, preserving its format.
 */
function replaceHostPortInBinding(
    binding: string | number | Record<string, unknown>,
    newPort: number
): string | number | Record<string, unknown> {
    if (typeof binding === 'number') return `${newPort}:${binding}`;
    if (typeof binding === 'object' && binding !== null)
        return { ...(binding as object), published: newPort };
    if (typeof binding !== 'string') return binding;
    // "${VAR:-8081}:container"
    const replaced = binding.replace(/^(\$\{[^:}]+:-)(\d+)(\})/, `$1${newPort}$3`);
    if (replaced !== binding) return replaced;
    const parts = binding.split(':');
    if (parts.length === 3) return `${parts[0]}:${newPort}:${parts[2]}`;
    if (parts.length === 2) return `${newPort}:${parts[1]}`;
    return `${newPort}:${binding}`;
}

/**
 * Detect and auto-resolve host port conflicts in a merged services map.
 * The first service that claims a port keeps it; later ones are bumped to the
 * next free port. Returns a list of remappings made (for logging).
 */
function resolveDockerComposePortConflicts(
    services: Record<string, any>
): Array<{ service: string; originalPort: number; newPort: number }> {
    const remappings: Array<{ service: string; originalPort: number; newPort: number }> = [];

    // Build port → [serviceNames] map
    const portOwners = new Map<number, string>();
    const allocatedPorts = new Set<number>();

    for (const [serviceName, service] of Object.entries(services)) {
        if (!Array.isArray(service?.ports)) continue;
        for (const binding of service.ports) {
            const p = parseHostPortFromBinding(binding);
            if (p == null) continue;
            allocatedPorts.add(p);
            if (!portOwners.has(p)) portOwners.set(p, serviceName);
        }
    }

    function nextFreePort(start: number): number {
        let p = start + 1;
        while (allocatedPorts.has(p)) p++;
        return p;
    }

    for (const [serviceName, service] of Object.entries(services)) {
        if (!Array.isArray(service?.ports)) continue;
        const newBindings: (string | number | Record<string, unknown>)[] = [];

        for (const binding of service.ports) {
            const p = parseHostPortFromBinding(binding);
            if (p != null && portOwners.get(p) !== serviceName) {
                // This service lost the port; remap it
                const newPort = nextFreePort(p);
                allocatedPorts.add(newPort);
                portOwners.set(newPort, serviceName);
                remappings.push({ service: serviceName, originalPort: p, newPort });
                newBindings.push(replaceHostPortInBinding(binding, newPort));
            } else {
                newBindings.push(binding);
            }
        }

        service.ports = newBindings;
    }

    return remappings;
}

/**
 * Merge docker-compose.yml files from base and overlays into a single file
 */
function mergeDockerComposeFiles(
    outputPath: string,
    baseStack: QuestionnaireAnswers['stack'],
    overlays: string[],
    overlaysDir: string,
    portOffset?: number,
    customImage?: string,
    projectEnv?: QuestionnaireAnswers['projectEnv'],
    projectMounts?: QuestionnaireAnswers['projectMounts']
): Array<{ service: string; originalPort: number; newPort: number }> {
    const composeFiles: string[] = [];

    // Add base docker-compose if exists
    const baseComposePath = path.join(
        TEMPLATES_DIR,
        baseStack,
        '.devcontainer',
        'docker-compose.yml'
    );
    if (fs.existsSync(baseComposePath)) {
        composeFiles.push(baseComposePath);
    }

    // Add overlay docker-compose files, interleaving any compose_imports before each overlay's own file
    for (const overlay of overlays) {
        // First load any compose_imports for this overlay (shared fragments applied before own file)
        const manifestPath = path.join(overlaysDir, overlay, 'overlay.yml');
        if (fs.existsSync(manifestPath)) {
            try {
                const manifestContent = fs.readFileSync(manifestPath, 'utf8');
                const manifest = yaml.load(manifestContent) as any;
                if (manifest.compose_imports && Array.isArray(manifest.compose_imports)) {
                    for (const importPath of manifest.compose_imports as string[]) {
                        const traversalError = validateImportPath(importPath, overlaysDir);
                        if (traversalError) {
                            throw new Error(
                                `compose_import path traversal rejected in overlay '${overlay}': ${traversalError}`
                            );
                        }
                        const fullImportPath = path.join(overlaysDir, importPath);
                        if (!fs.existsSync(fullImportPath)) {
                            throw new Error(
                                `compose_import not found: '${importPath}' (referenced by overlay: ${overlay})`
                            );
                        }
                        const ext = path.extname(importPath).toLowerCase();
                        if (ext !== '.yml' && ext !== '.yaml') {
                            throw new Error(
                                `compose_import must be a .yml or .yaml file: '${importPath}' (overlay: ${overlay})`
                            );
                        }
                        console.log(
                            chalk.dim(`   📎 Applying shared compose fragment: ${importPath}`)
                        );
                        composeFiles.push(fullImportPath);
                    }
                }
            } catch (error) {
                if (error instanceof Error) {
                    throw error;
                }
                // Non-Error throwables are unexpected; wrap and re-throw so compose_imports failures always fail fast
                throw new Error(
                    `Unexpected error loading compose_imports for overlay '${overlay}': ${String(error)}`
                );
            }
        }

        const overlayComposePath = path.join(overlaysDir, overlay, 'docker-compose.yml');
        if (fs.existsSync(overlayComposePath)) {
            composeFiles.push(overlayComposePath);
        }
    }

    if (composeFiles.length === 0) {
        return []; // No docker-compose files to merge
    }

    // Merge all compose files
    let merged: any = {
        services: {},
        volumes: {},
        networks: {},
    };

    for (const composePath of composeFiles) {
        const content = fs.readFileSync(composePath, 'utf-8');
        const compose = yaml.load(content) as any;

        if (compose.services) {
            // Deep merge services to preserve arrays like volumes, ports, etc.
            for (const serviceName in compose.services) {
                if (merged.services[serviceName]) {
                    merged.services[serviceName] = deepMerge(
                        merged.services[serviceName],
                        compose.services[serviceName]
                    );
                } else {
                    merged.services[serviceName] = compose.services[serviceName];
                }
            }
        }
        if (compose.volumes) {
            merged.volumes = { ...merged.volumes, ...compose.volumes };
        }
        if (compose.networks) {
            merged.networks = { ...merged.networks, ...compose.networks };
        }
    }

    // Ensure devcontainer service has an image
    if (merged.services.devcontainer) {
        const composeEnv = buildComposeProjectEnvInterpolationEntries(projectEnv, baseStack);
        if (Object.keys(composeEnv).length > 0) {
            merged.services.devcontainer.environment = deepMerge(
                merged.services.devcontainer.environment ?? {},
                composeEnv
            );
            console.log(
                chalk.dim(`   🌱 Applying project env to docker-compose devcontainer service`)
            );
        }

        const composeMountVolumes = buildComposeProjectMountVolumes(projectMounts, baseStack);
        if (composeMountVolumes.length > 0) {
            const existing: string[] = Array.isArray(merged.services.devcontainer.volumes)
                ? (merged.services.devcontainer.volumes as string[])
                : [];
            merged.services.devcontainer.volumes = [...new Set([...existing, ...composeMountVolumes])];
            console.log(
                chalk.dim(`   🗂️  Applying project mounts to docker-compose devcontainer service`)
            );
        }

        if (customImage) {
            // Apply custom base image if specified
            merged.services.devcontainer.image = customImage;
        } else if (!merged.services.devcontainer.image) {
            // Fallback to default if no image is set (shouldn't happen in normal flow)
            console.warn(chalk.yellow('⚠️  No image specified, this should not happen'));
        }
    }

    // Filter depends_on to only include services that exist
    const serviceNames = Object.keys(merged.services);
    const serviceNameSet = new Set(serviceNames);
    for (const serviceName of serviceNames) {
        const service = merged.services[serviceName];

        if (service.depends_on !== undefined) {
            const filteredDependsOn = filterDependsOn(service.depends_on, serviceNameSet);

            if (filteredDependsOn === undefined) {
                delete service.depends_on;
            } else {
                service.depends_on = filteredDependsOn;
            }
        }
    }

    // Remove empty sections
    if (Object.keys(merged.volumes).length === 0) delete merged.volumes;
    if (Object.keys(merged.networks).length === 0) delete merged.networks;

    // Auto-resolve host port conflicts across composed services
    const portRemappings = resolveDockerComposePortConflicts(merged.services);
    if (portRemappings.length > 0) {
        console.log(chalk.yellow('\n⚠️  Host port conflicts detected and auto-resolved:'));
        for (const { service, originalPort, newPort } of portRemappings) {
            console.log(chalk.yellow(`   • ${service}: host port ${originalPort} → ${newPort}`));
        }
        console.log();
    }

    // Write combined docker-compose.yml
    const outputComposePath = path.join(outputPath, 'docker-compose.yml');
    const yamlContent = yaml.dump(merged, {
        indent: 2,
        lineWidth: -1, // No line wrapping
        noRefs: true,
    });

    fs.writeFileSync(outputComposePath, yamlContent);
    console.log(
        chalk.dim(
            `   🐳 Created combined docker-compose.yml with ${serviceNames.length} service(s)`
        )
    );

    return portRemappings;
}

/**
 * Apply custom devcontainer patch from .devcontainer/custom/
 */
function applyCustomDevcontainerPatch(
    config: DevContainer,
    customConfig: CustomizationConfig
): DevContainer {
    if (!customConfig.devcontainerPatch) {
        return config;
    }

    console.log(chalk.dim(`   🎨 Applying custom devcontainer patches`));
    return deepMerge(config, customConfig.devcontainerPatch);
}

/**
 * Apply custom docker-compose patch to merged docker-compose
 */
function applyCustomDockerComposePatch(
    outputPath: string,
    customConfig: CustomizationConfig
): void {
    if (!customConfig.dockerComposePatch) {
        return;
    }

    const composePath = path.join(outputPath, 'docker-compose.yml');
    if (!fs.existsSync(composePath)) {
        console.warn(
            chalk.yellow('⚠️  docker-compose.yml not found, skipping custom docker-compose patch')
        );
        return;
    }

    console.log(chalk.dim(`   🐳 Applying custom docker-compose patches`));

    // Load existing compose file
    const existingContent = fs.readFileSync(composePath, 'utf-8');
    const existing = yaml.load(existingContent) as any;

    // Merge with custom patch
    const merged: any = {
        services: { ...existing.services },
        volumes: { ...existing.volumes },
        networks: { ...existing.networks },
    };

    const custom = customConfig.dockerComposePatch;

    // Merge services
    if (custom.services) {
        for (const serviceName in custom.services) {
            if (merged.services[serviceName]) {
                merged.services[serviceName] = deepMerge(
                    merged.services[serviceName],
                    custom.services[serviceName]
                );
            } else {
                merged.services[serviceName] = custom.services[serviceName];
            }
        }
    }

    // Merge volumes
    if (custom.volumes) {
        merged.volumes = { ...merged.volumes, ...custom.volumes };
    }

    // Merge networks
    if (custom.networks) {
        merged.networks = { ...merged.networks, ...custom.networks };
    }

    // Remove empty sections
    if (Object.keys(merged.volumes).length === 0) delete merged.volumes;
    if (Object.keys(merged.networks).length === 0) delete merged.networks;

    // Write updated compose file
    const yamlContent = yaml.dump(merged, {
        indent: 2,
        lineWidth: -1,
        noRefs: true,
    });

    fs.writeFileSync(composePath, yamlContent);
}

/**
 * Apply custom environment variables
 * Returns true if .env.example was created or modified
 */
function applyCustomEnvironment(outputPath: string, customConfig: CustomizationConfig): boolean {
    if (!customConfig.environmentVars || Object.keys(customConfig.environmentVars).length === 0) {
        return false;
    }

    console.log(chalk.dim(`   🔑 Applying custom environment variables`));

    const envExamplePath = path.join(outputPath, '.env.example');
    let content = '';

    // Load existing .env.example if it exists
    if (fs.existsSync(envExamplePath)) {
        content = fs.readFileSync(envExamplePath, 'utf-8');
        if (!content.endsWith('\n')) {
            content += '\n';
        }
        content += '\n';
    }

    // Add custom environment section
    content += '# Custom Environment Variables\n';
    for (const [key, value] of Object.entries(customConfig.environmentVars)) {
        content += `${key}=${value}\n`;
    }

    fs.writeFileSync(envExamplePath, content);
    return true;
}

/**
 * Apply custom lifecycle scripts
 */
function applyCustomScripts(
    config: DevContainer,
    customConfig: CustomizationConfig,
    outputPath: string
): DevContainer {
    if (!customConfig.scripts) {
        return config;
    }

    // Make custom scripts executable
    const scriptPaths = getCustomScriptPaths(outputPath);
    for (const scriptPath of scriptPaths) {
        try {
            fs.chmodSync(scriptPath, 0o755);
        } catch (error) {
            console.warn(chalk.yellow(`⚠️  Failed to make ${scriptPath} executable:`, error));
        }
    }

    // Add custom postCreateCommand scripts
    if (customConfig.scripts.postCreate && customConfig.scripts.postCreate.length > 0) {
        console.log(chalk.dim(`   🔧 Adding custom post-create script(s)`));

        if (!config.postCreateCommand) {
            config.postCreateCommand = {};
        }

        // Handle array form - convert to object
        if (Array.isArray(config.postCreateCommand)) {
            const arrayCommands = config.postCreateCommand;
            config.postCreateCommand = {};
            for (let i = 0; i < arrayCommands.length; i++) {
                config.postCreateCommand[`command-${i}`] = arrayCommands[i];
            }
        }

        // Handle string form - convert to object
        if (typeof config.postCreateCommand === 'string') {
            config.postCreateCommand = { default: config.postCreateCommand };
        }

        for (let i = 0; i < customConfig.scripts.postCreate.length; i++) {
            const key = `custom-post-create-${i}`;
            config.postCreateCommand[key] = customConfig.scripts.postCreate[i];
        }
    }

    // Add custom postStartCommand scripts
    if (customConfig.scripts.postStart && customConfig.scripts.postStart.length > 0) {
        console.log(chalk.dim(`   ✓ Adding custom post-start script(s)`));

        if (!config.postStartCommand) {
            config.postStartCommand = {};
        }

        // Handle array form - convert to object
        if (Array.isArray(config.postStartCommand)) {
            const arrayCommands = config.postStartCommand;
            config.postStartCommand = {};
            for (let i = 0; i < arrayCommands.length; i++) {
                config.postStartCommand[`command-${i}`] = arrayCommands[i];
            }
        }

        // Handle string form - convert to object
        if (typeof config.postStartCommand === 'string') {
            config.postStartCommand = { default: config.postStartCommand };
        }

        for (let i = 0; i < customConfig.scripts.postStart.length; i++) {
            const key = `custom-post-start-${i}`;
            config.postStartCommand[key] = customConfig.scripts.postStart[i];
        }
    }

    return config;
}

/**
 * Copy custom files from custom/files/ directory
 */
function copyCustomFiles(
    customConfig: CustomizationConfig,
    outputPath: string,
    fileRegistry: FileRegistry
): void {
    if (!customConfig.files || customConfig.files.length === 0) {
        return;
    }

    console.log(chalk.dim(`   📄 Copying ${customConfig.files.length} custom file(s)`));

    const directoriesAdded = new Set<string>();

    for (const file of customConfig.files) {
        const destPath = path.join(outputPath, file.destination);
        const destDir = path.dirname(destPath);
        const relativeDest = path.relative(outputPath, destPath);
        const relativeDestDir = path.relative(outputPath, destDir);

        // Create destination directory if it doesn't exist
        if (!fs.existsSync(destDir)) {
            fs.mkdirSync(destDir, { recursive: true });
        }

        // Add directory to registry if not already added
        if (relativeDestDir && relativeDestDir !== '.' && !directoriesAdded.has(relativeDestDir)) {
            // Add all parent directories
            const parts = relativeDestDir.split(path.sep);
            for (let i = 1; i <= parts.length; i++) {
                const dirPath = parts.slice(0, i).join(path.sep);
                if (!directoriesAdded.has(dirPath)) {
                    fileRegistry.addDirectory(dirPath);
                    directoriesAdded.add(dirPath);
                }
            }
        }

        // Copy file
        fs.copyFileSync(file.source, destPath);

        // Add file to registry
        fileRegistry.addFile(relativeDest);
    }
}

/**
 * Generate only the superposition.json manifest without creating .devcontainer files
 * Used for team collaboration workflow where manifest is committed but .devcontainer is gitignored
 */
export async function generateManifestOnly(
    answers: CompositionInput,
    overlaysDir?: string,
    options: { isRegen?: boolean } = {}
): Promise<GenerationSummary> {
    // Prepare overlays using shared logic
    const { overlays: resolvedOverlays, autoResolved } = prepareOverlaysForGeneration(
        answers,
        overlaysDir
    );

    // Ensure output directory exists
    const outputPath = answers.outputPath || '.';
    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    // Generate manifest only
    console.log(chalk.cyan('\n📋 Generating manifest only (team collaboration mode)...\n'));

    generateManifest(outputPath, answers, resolvedOverlays, autoResolved, answers.containerName);

    console.log(
        chalk.green(`\n✓ Manifest created: ${path.join(outputPath, 'superposition.json')}`)
    );
    console.log(chalk.dim('  Ready for team collaboration workflow.'));
    console.log(
        chalk.dim(
            '  Commit this manifest to your repository and let team members run "npx container-superposition regen"'
        )
    );

    // Load overlay configs to get metadata
    const actualOverlaysDir = overlaysDir ?? path.join(REPO_ROOT, 'overlays');
    const indexYmlPath = path.join(actualOverlaysDir, 'index.yml');
    const overlaysConfig = loadOverlaysConfig(actualOverlaysDir, indexYmlPath);
    const allOverlayDefs = getAllOverlayDefs(overlaysConfig);
    const overlayMetadataMap = new Map<string, OverlayMetadata>(
        allOverlayDefs.map((o) => [o.id, o])
    );
    const selectedOverlayMetadata = resolvedOverlays
        .map((id) => overlayMetadataMap.get(id))
        .filter((m): m is OverlayMetadata => m !== undefined);

    // Return summary for manifest-only mode
    const services = overlaysToServices(selectedOverlayMetadata);
    const warnings = detectWarnings(selectedOverlayMetadata, answers);
    const tips = generateTips(selectedOverlayMetadata, answers);
    const nextSteps = generateNextSteps(true, options.isRegen === true);

    return {
        files: ['superposition.json'],
        services,
        ports: [],
        warnings,
        tips,
        nextSteps,
        portOffset: answers.portOffset ?? 0,
        target: answers.target || 'local',
        isManifestOnly: true,
        manifestPath: path.join(outputPath, 'superposition.json'),
    };
}

/**
 * Main composition logic
 */
export async function composeDevContainer(
    answers: CompositionInput,
    overlaysDir?: string,
    options: { isRegen?: boolean } = {}
): Promise<GenerationSummary> {
    // Prepare overlays using shared logic
    const actualOverlaysDir = overlaysDir ?? path.join(REPO_ROOT, 'overlays');
    const {
        overlays: resolvedOverlays,
        autoResolved,
        overlaysConfig,
    } = prepareOverlaysForGeneration(answers, overlaysDir);

    // Get all overlay definitions for later use
    const allOverlayDefs = getAllOverlayDefs(overlaysConfig);

    // Determine base template path
    const templatePath = path.join(TEMPLATES_DIR, answers.stack, '.devcontainer');

    if (!fs.existsSync(templatePath)) {
        throw new Error(`Template not found: ${answers.stack}`);
    }

    // 4. Load base devcontainer.json
    const baseConfigPath = path.join(templatePath, 'devcontainer.json');
    let config = loadJson<DevContainer>(baseConfigPath);

    // 4a. Set container name if provided
    if (answers.containerName) {
        config.name = answers.containerName;
        console.log(chalk.dim(`   📝 Container name: ${chalk.cyan(answers.containerName)}`));
    }

    // 4b. Apply base image selection
    // Build image map from overlaysConfig instead of hardcoding
    const imageMap: Record<string, string> = {};
    for (const baseImage of overlaysConfig.base_images) {
        if (baseImage.image) {
            imageMap[baseImage.id] = baseImage.image;
        }
    }

    // Get default base image (first in list)
    const defaultBaseImage = overlaysConfig.base_images[0];

    if (answers.baseImage === 'custom' && answers.customImage) {
        // Use custom image provided by user
        if (answers.stack === 'plain') {
            config.image = answers.customImage;
        } else if (answers.stack === 'compose') {
            // For compose, we'll need to update docker-compose.yml later
            config._customImage = answers.customImage; // Temporary marker
        }
        console.log(chalk.yellow(`   ⚠️  Using custom image: ${answers.customImage}`));
    } else if (answers.baseImage !== defaultBaseImage.id) {
        // Apply non-default base image
        const selectedImage = imageMap[answers.baseImage];
        if (answers.stack === 'plain') {
            config.image = selectedImage;
        } else if (answers.stack === 'compose') {
            config._customImage = selectedImage; // Temporary marker
        }
        console.log(chalk.dim(`   🖼️  Using base image: ${chalk.cyan(answers.baseImage)}`));
    }

    // 5. Order overlays for proper dependency resolution
    // Observability overlays (in dependency order)
    const orderedOverlays: string[] = [];
    const observabilityOrder = [
        'jaeger',
        'tempo',
        'prometheus',
        'alertmanager',
        'loki',
        'promtail',
        'otel-collector',
        'grafana',
        'otel-demo-nodejs',
        'otel-demo-python',
    ];

    // Add observability overlays in order
    for (const obs of observabilityOrder) {
        if (resolvedOverlays.includes(obs)) {
            orderedOverlays.push(obs);
        }
    }

    // Add remaining overlays
    for (const overlay of resolvedOverlays) {
        if (!orderedOverlays.includes(overlay)) {
            orderedOverlays.push(overlay);
        }
    }

    const overlays = orderedOverlays;

    // 5b. Resolve overlay parameters ({{cs.KEY}} substitution)
    // Collect parameter declarations from all selected overlays
    const declaredParams = collectOverlayParameters(overlays, allOverlayDefs);
    const {
        values: resolvedParams,
        missingRequired,
        unknownSupplied,
    } = resolveParameters(declaredParams, answers.overlayParameters ?? {});

    if (missingRequired.length > 0) {
        throw new Error(
            `Missing required overlay parameters: ${missingRequired.join(', ')}. ` +
                `Provide values in superposition.yml under the parameters: section, ` +
                `or via --param KEY=VALUE on the command line.`
        );
    }

    if (unknownSupplied.length > 0) {
        console.warn(
            chalk.yellow(
                `   ⚠️  Unknown overlay parameters (not declared by any selected overlay): ${unknownSupplied.join(', ')}`
            )
        );
    }

    const hasResolvedParams = Object.keys(resolvedParams).length > 0;

    // Log resolved parameter values (sensitive values are redacted)
    if (hasResolvedParams) {
        const displayValues = redactSensitiveValues(resolvedParams, declaredParams);
        console.log(chalk.dim(`   ⚙️  Overlay parameters:`));
        for (const [k, v] of Object.entries(displayValues)) {
            console.log(chalk.dim(`      ${k}=${v}`));
        }
    }
    const outputPath = path.resolve(answers.outputPath);
    const projectRoot = path.dirname(outputPath);
    const fileRegistry = new FileRegistry();
    const rootEnv = loadEnvFileIfExists(path.join(projectRoot, '.env'));

    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    // 5a. Remove stale project-root artifacts from a previous target run
    const manifestPath_existing = path.join(outputPath, 'superposition.json');
    let manifestTarget: DeploymentTarget | undefined;
    if (fs.existsSync(manifestPath_existing)) {
        try {
            const existingManifest = JSON.parse(
                fs.readFileSync(manifestPath_existing, 'utf-8')
            ) as { target?: DeploymentTarget };
            manifestTarget = existingManifest.target;
        } catch {
            // If manifest is unreadable, skip stale cleanup gracefully
        }
    }

    // When answers.target is undefined (e.g. regen without --target), fall back to the
    // target recorded in the existing manifest so the correct artifacts are reproduced.
    const activeTarget: DeploymentTarget = answers.target ?? manifestTarget ?? 'local';
    const previousTarget: DeploymentTarget = manifestTarget ?? 'local';

    if (previousTarget !== activeTarget) {
        removeStaleTargetArtifacts(previousTarget, activeTarget, projectRoot);
        console.log(
            chalk.dim(
                `   🧹 Removed stale target artifacts for previous target '${previousTarget}'`
            )
        );
    }

    // 6. Apply overlays
    for (const overlay of overlays) {
        console.log(chalk.dim(`   🔧 Applying overlay: ${chalk.cyan(overlay)}`));
        config = applyOverlay(config, overlay, actualOverlaysDir);
    }

    config = applyProjectEnvToDevcontainer(config, answers.projectEnv, answers.stack, rootEnv);
    config = applyProjectMountsToDevcontainer(config, answers.projectMounts, answers.stack);

    // 7. Copy template files (docker-compose, scripts, etc.)
    const entries = fs.readdirSync(templatePath);
    for (const entry of entries) {
        if (entry === 'devcontainer.json') continue; // We'll write this separately

        const srcPath = path.join(templatePath, entry);
        const destPath = path.join(outputPath, entry);

        const stat = fs.statSync(srcPath);
        if (stat.isDirectory()) {
            copyDir(srcPath, destPath);
            fileRegistry.addDirectory(entry);
        } else {
            fs.copyFileSync(srcPath, destPath);
            fileRegistry.addFile(entry);
        }
    }

    // 8. Copy overlay files (docker-compose, configs, etc.)
    for (const overlay of overlays) {
        copyOverlayFiles(outputPath, overlay, fileRegistry, actualOverlaysDir);
    }

    // 8.5. Copy cross-distro-packages feature if used
    if (config.features?.['./features/cross-distro-packages']) {
        const featureName = 'cross-distro-packages';
        const featuresDir = path.join(outputPath, 'features', featureName);
        const sourceFeatureDir = path.join(REPO_ROOT, 'features', featureName);

        if (fs.existsSync(sourceFeatureDir)) {
            copyDir(sourceFeatureDir, featuresDir);
            fileRegistry.addDirectory('features');
            // Register every file inside the feature so cleanupStaleDirFiles
            // does not remove them when it recurses into the 'features' directory.
            for (const f of fs.readdirSync(sourceFeatureDir)) {
                if (fs.statSync(path.join(sourceFeatureDir, f)).isFile()) {
                    fileRegistry.addFile(`features/${featureName}/${f}`);
                }
            }
            console.log(chalk.dim(`   📦 Copied cross-distro-packages feature`));
        }
    }

    // 8. Filter docker-compose dependencies based on selected overlays
    filterDockerComposeDependencies(outputPath, overlays);

    // 9. Merge runServices array in correct order
    mergeRunServices(config, overlays, actualOverlaysDir);

    // 11. Merge docker-compose files into single combined file
    let composePortRemappings: Array<{ service: string; originalPort: number; newPort: number }> =
        [];
    if (answers.stack === 'compose') {
        const customImage = config._customImage as string | undefined;
        composePortRemappings = mergeDockerComposeFiles(
            outputPath,
            answers.stack,
            overlays,
            actualOverlaysDir,
            answers.portOffset,
            customImage,
            answers.projectEnv,
            answers.projectMounts
        );
        // Update devcontainer.json to reference the combined file
        if (config.dockerComposeFile) {
            config.dockerComposeFile = 'docker-compose.yml';
        }

        // Apply parameter substitution to the merged docker-compose.yml
        if (hasResolvedParams) {
            const composePath = path.join(outputPath, 'docker-compose.yml');
            if (fs.existsSync(composePath)) {
                const original = fs.readFileSync(composePath, 'utf8');
                const substituted = substituteParameters(original, resolvedParams);
                if (substituted !== original) {
                    fs.writeFileSync(composePath, substituted);
                }
            }
        }
    }

    // Apply port offset to devcontainer.json if specified
    if (answers.portOffset) {
        applyPortOffsetToDevcontainer(config, answers.portOffset);
    }

    // Merge setup scripts from overlays into postCreateCommand
    mergeSetupScripts(config, overlays, outputPath, fileRegistry, actualOverlaysDir);

    // 10. Apply custom patches from .devcontainer/custom/ (if present)
    const customPatches = loadCustomPatches(outputPath);
    if (customPatches) {
        console.log(chalk.cyan('\n🎨 Applying custom patches...'));

        // Apply custom devcontainer patch
        config = applyCustomDevcontainerPatch(config, customPatches);

        // Apply custom scripts
        config = applyCustomScripts(config, customPatches, outputPath);

        // Copy custom files
        copyCustomFiles(customPatches, outputPath, fileRegistry);
    }

    // Remove internal fields (those starting with _)
    Object.keys(config).forEach((key) => {
        if (key.startsWith('_')) {
            delete (config as any)[key];
        }
    });

    // Handle editor profile filtering
    if (answers.editor === 'none' || answers.editor === 'jetbrains') {
        // Remove VS Code customizations
        if (config.customizations?.vscode) {
            delete config.customizations.vscode;
            const profileLabel = answers.editor === 'none' ? 'none' : 'jetbrains';
            console.log(
                chalk.dim(`   🎨 Editor profile '${profileLabel}': Removed VS Code customizations`)
            );

            // Clean up empty customizations object
            if (config.customizations && Object.keys(config.customizations).length === 0) {
                delete config.customizations;
            }
        }
    }

    // Add JetBrains-specific devcontainer.json customizations and generate .idea/ artifacts
    if (answers.editor === 'jetbrains') {
        const selectedLanguages = answers.language ?? [];
        const languageOverlays = selectedLanguages.filter((lang) =>
            JETBRAINS_SUPPORTED_LANGUAGES.has(lang)
        );

        if (languageOverlays.length === 0 && selectedLanguages.length > 0) {
            const selectedLabel = selectedLanguages.join(', ');
            console.log(
                chalk.yellow(
                    `   ⚠️  No supported JetBrains language overlays selected (selected: ${selectedLabel})`
                )
            );
        }

        const backend = getJetBrainsBackend(languageOverlays);

        // Add customizations.jetbrains block to devcontainer.json
        if (!config.customizations) {
            config.customizations = {};
        }
        config.customizations.jetbrains = { backend };
        console.log(chalk.dim(`   🧠 Editor profile 'jetbrains': Set backend to '${backend}'`));

        // Generate .idea/ artifacts in the project root
        console.log(chalk.cyan('\n💡 Generating JetBrains project artifacts...'));
        const jetbrainsFiles = generateJetBrainsArtifacts(projectRoot, languageOverlays);
        for (const relPath of jetbrainsFiles) {
            console.log(chalk.dim(`   📄 Created ${relPath} at project root`));
        }
    }

    // 11b. Apply target-specific devcontainer.json patch
    const targetRule = getTargetRule(activeTarget);
    const overlayMetadataMapForTarget = new Map<string, OverlayMetadata>(
        allOverlayDefs.map((o) => [o.id, o])
    );
    const targetCtx: TargetRuleContext = {
        overlays,
        overlayMetadata: overlayMetadataMapForTarget,
        portOffset: answers.portOffset ?? 0,
        stack: answers.stack,
        outputPath,
        projectRoot,
    };
    const targetPatch = targetRule.devcontainerPatch(targetCtx);
    if (Object.keys(targetPatch).length > 0) {
        config = deepMerge(config, targetPatch) as DevContainer;
        console.log(chalk.dim(`   🎯 Applied ${activeTarget} target patch to devcontainer.json`));
    }

    // 12. Write merged devcontainer.json
    // Apply parameter substitution to the config object (before JSON.stringify) so that
    // any JSON-special characters in parameter values are properly escaped by JSON.stringify.
    const configPath = path.join(outputPath, 'devcontainer.json');
    const finalConfig = hasResolvedParams
        ? (substituteParametersInObject(config, resolvedParams) as DevContainer)
        : config;
    const devcontainerContent = JSON.stringify(finalConfig, null, 2) + '\n';
    fs.writeFileSync(configPath, devcontainerContent);
    fileRegistry.addFile('devcontainer.json');
    console.log(chalk.dim(`   📝 Wrote devcontainer.json`));

    // Apply custom docker-compose patch (after writing base docker-compose.yml)
    if (customPatches && answers.stack === 'compose') {
        applyCustomDockerComposePatch(outputPath, customPatches);
    }

    // 13. Generate superposition.json manifest
    generateManifest(
        outputPath,
        answers,
        overlays,
        autoResolved,
        answers.containerName || config.name,
        activeTarget
    );
    fileRegistry.addFile('superposition.json');

    // 14. Merge .env.example files from overlays and apply glue config environment variables
    const envCreated = mergeEnvExamples(
        outputPath,
        overlays,
        actualOverlaysDir,
        answers.portOffset,
        answers.presetGlueConfig,
        answers.preset
    );
    if (envCreated) {
        fileRegistry.addFile('.env.example');
    }

    // Apply parameter substitution to .env.example
    // This must happen after mergeEnvExamples but before any consumer of .env reads it,
    // because mergeEnvExamples may have written {{cs.*}} tokens into .env.example.
    // We also regenerate .env (the port-offset copy) from the substituted content so that
    // applyPortOffsetToEnv can correctly match numeric port values that were previously
    // hidden behind {{cs.POSTGRES_PORT}} tokens.
    if (hasResolvedParams) {
        const envExamplePath = path.join(outputPath, '.env.example');
        if (fs.existsSync(envExamplePath)) {
            const original = fs.readFileSync(envExamplePath, 'utf8');
            const substituted = substituteParameters(original, resolvedParams);
            if (substituted !== original) {
                fs.writeFileSync(envExamplePath, substituted);
                // Regenerate .env from the substituted content when a port offset is active.
                // mergeEnvExamples already wrote .env from the pre-substitution content, so
                // the port offset was applied to unresolved tokens (e.g. {{cs.POSTGRES_PORT}})
                // that had no numeric value to match — we must regenerate .env now that the
                // tokens have been replaced with real numeric port values.
                if (answers.portOffset) {
                    const envPath = path.join(outputPath, '.env');
                    const offsetContent = applyPortOffsetToEnv(substituted, answers.portOffset);
                    fs.writeFileSync(envPath, offsetContent);
                }
            }
        }
    }

    // Apply custom environment variables (after .env.example is created)
    if (customPatches) {
        const customEnvCreated = applyCustomEnvironment(outputPath, customPatches);
        // Add .env.example to registry if it was created by custom patches but not by overlays
        if (customEnvCreated && !envCreated) {
            fileRegistry.addFile('.env.example');
        }
    }

    materializeComposeProjectEnvFile(outputPath, answers.projectEnv, answers.stack, rootEnv);

    // 14b. Merge .gitignore files from overlays into project root .gitignore
    // Note: .gitignore lives at the project root (parent of outputPath), not inside outputPath,
    // so it is intentionally NOT added to fileRegistry (cleanupStaleFiles must not touch it).
    mergeGitignoreFiles(outputPath, overlays, actualOverlaysDir);

    // 15. Apply preset glue configuration (README and port mappings) if present
    if (answers.presetGlueConfig) {
        applyGlueConfig(outputPath, answers.presetGlueConfig, answers.preset, fileRegistry);
    }

    // 16. Generate consolidated README.md from selected overlays
    console.log(chalk.cyan('\n📖 Generating consolidated README...'));
    const overlayMetadataMap = new Map<string, OverlayMetadata>(
        allOverlayDefs.map((o) => [o.id, o])
    );
    generateReadme(answers, overlays, overlayMetadataMap, outputPath);
    fileRegistry.addFile('README.md');
    console.log(
        chalk.dim(`   📝 Created README.md with documentation from ${overlays.length} overlay(s)`)
    );

    // 17. Generate ports.json documentation
    const portOffset = answers.portOffset ?? 0;

    // Prepare overlay metadata for summary
    const selectedOverlayMetadata = overlays
        .map((id) => overlayMetadataMap.get(id))
        .filter((m): m is OverlayMetadata => m !== undefined);

    // Extract environment variables from .env.example for connection strings
    const envPath = path.join(outputPath, '.env.example');
    const envVars: Record<string, string> = {};
    if (fs.existsSync(envPath)) {
        const envContent = fs.readFileSync(envPath, 'utf8');
        for (const line of envContent.split('\n')) {
            const match = line.match(/^([A-Z_][A-Z0-9_]*)=(.*)$/);
            if (match) {
                envVars[match[1].toLowerCase()] = match[2];
            }
        }
    }

    const hasOverlayPorts = overlays.some((o) => overlayMetadataMap.get(o)?.ports?.length);
    const shouldGeneratePortsDocumentation = portOffset > 0 || hasOverlayPorts;
    let portsDoc: PortsDocumentation | null = null;

    if (shouldGeneratePortsDocumentation) {
        console.log(chalk.cyan('\n📡 Generating ports documentation...'));

        portsDoc = generatePortsDocumentation(selectedOverlayMetadata, portOffset, envVars);

        // Propagate host-port conflict remappings into the generated docs so that
        // ports.json and services.md reflect the actual ports in docker-compose.yml.
        if (composePortRemappings.length > 0) {
            // Build a lookup map: original (post-offset) host port → remapped host port.
            const remapByOriginal = new Map(
                composePortRemappings.map(({ originalPort, newPort }) => [originalPort, newPort])
            );
            portsDoc = {
                ...portsDoc,
                ports: portsDoc.ports.map((p) => {
                    const remapped = remapByOriginal.get(p.actualPort);
                    return remapped !== undefined ? { ...p, actualPort: remapped } : p;
                }),
            };
        }

        const portsPath = path.join(outputPath, 'ports.json');
        fs.writeFileSync(portsPath, JSON.stringify(portsDoc, null, 2) + '\n');
        fileRegistry.addFile('ports.json');

        console.log(chalk.dim(`   📡 Created ports.json with ${portsDoc.ports.length} port(s)`));

        // Log summary of ports
        if (portsDoc.ports.length > 0) {
            console.log(chalk.dim('\n   Available services:'));
            for (const port of portsDoc.ports) {
                const serviceLabel = port.service || 'unknown';
                const desc = port.description ? ` - ${port.description}` : '';
                const proto = port.protocol ? ` (${port.protocol})` : '';
                console.log(chalk.dim(`   • ${serviceLabel}: ${port.actualPort}${proto}${desc}`));
            }
        }
    }

    // 17b. Generate services.md reference document
    const servicesMdContent = generateServicesMarkdown(
        selectedOverlayMetadata,
        portOffset,
        envVars
    );
    if (servicesMdContent) {
        const servicesMdPath = path.join(outputPath, 'services.md');
        fs.writeFileSync(servicesMdPath, servicesMdContent);
        fileRegistry.addFile('services.md');
        console.log(chalk.dim(`   📋 Created services.md with service reference`));
    }

    // 17c. Generate env.local.example as an optional-overrides template
    const envLocalContent = generateEnvLocalExample(
        selectedOverlayMetadata,
        actualOverlaysDir,
        portOffset
    );
    if (envLocalContent) {
        const envLocalPath = path.join(outputPath, 'env.local.example');
        const finalEnvLocalContent = hasResolvedParams
            ? substituteParameters(envLocalContent, resolvedParams)
            : envLocalContent;
        fs.writeFileSync(envLocalPath, finalEnvLocalContent);
        fileRegistry.addFile('env.local.example');
        console.log(chalk.dim(`   📄 Created env.local.example with optional overrides`));
    }

    // 17d. Generate target-specific workspace artifacts and guidance
    if (activeTarget !== 'local') {
        console.log(chalk.cyan(`\n🎯 Generating ${activeTarget} target artifacts...`));
        const targetFiles = targetRule.generateFiles(targetCtx);
        for (const [key, content] of targetFiles) {
            const absPath = resolveTargetFilePath(key, outputPath, projectRoot);
            fs.writeFileSync(absPath, content);
            if (key.startsWith('../')) {
                // Project-root file: log but do NOT add to fileRegistry
                // (fileRegistry only tracks outputPath-relative files)
                console.log(chalk.dim(`   📄 Created ${path.basename(absPath)} at project root`));
            } else {
                fileRegistry.addFile(key);
                console.log(chalk.dim(`   📄 Created ${key} in .devcontainer/`));
            }
        }
    }

    // 18. Clean up stale files from previous runs (preserves superposition.json and .env)
    cleanupStaleFiles(outputPath, fileRegistry);

    // 18b. Validate that no unresolved {{cs.*}} tokens remain in any generated file.
    // Run unconditionally — an overlay author could accidentally ship {{cs.*}} tokens
    // in files that don't have a matching parameters declaration, and we must catch those
    // regardless of whether any parameters were resolved in this run.
    // Only text-like files (not binaries) are scanned; skip missing files gracefully.
    const BINARY_EXTENSIONS = new Set(['.png', '.jpg', '.gif', '.ico', '.woff', '.woff2', '.ttf']);
    {
        const allGeneratedFiles = Array.from(fileRegistry.getFiles());
        const unresolvedByFile: Record<string, string[]> = {};
        for (const relFile of allGeneratedFiles) {
            const ext = path.extname(relFile).toLowerCase();
            if (BINARY_EXTENSIONS.has(ext)) continue;
            const absPath = path.join(outputPath, relFile);
            if (!fs.existsSync(absPath)) continue;
            const content = fs.readFileSync(absPath, 'utf8');
            const unresolved = findUnresolvedTokens(content);
            if (unresolved.length > 0) {
                unresolvedByFile[relFile] = [...new Set(unresolved)];
            }
        }
        if (Object.keys(unresolvedByFile).length > 0) {
            const details = Object.entries(unresolvedByFile)
                .map(([file, tokens]) => `${file}: ${tokens.join(', ')}`)
                .join('; ');
            throw new Error(
                `Unresolved {{cs.*}} parameter tokens remain in generated files: ${details}. ` +
                    `Declare these parameters in the overlay's overlay.yml and provide values in your project file (superposition.yml).`
            );
        }
    }

    // 19. Generate and return summary
    const files = Array.from(fileRegistry.getFiles());
    const services = overlaysToServices(selectedOverlayMetadata);

    const portInfos = portsDoc
        ? portsToPortInfo(portsDoc.ports, portsDoc.connectionStrings || {})
        : [];

    const warnings = detectWarnings(selectedOverlayMetadata, answers);
    const tips = generateTips(selectedOverlayMetadata, answers);
    const nextSteps = generateNextSteps(false, options.isRegen === true);

    return {
        files,
        services,
        ports: portInfos,
        warnings,
        tips,
        nextSteps,
        portOffset: answers.portOffset ?? 0,
        target: answers.target || 'local',
        isManifestOnly: false,
        manifestPath: path.join(outputPath, 'superposition.json'),
    };
}

/**
 * Apply port offset to devcontainer.json forwardPorts and portsAttributes
 */
function applyPortOffsetToDevcontainer(config: DevContainer, offset: number): void {
    // Offset forwardPorts
    if (config.forwardPorts && Array.isArray(config.forwardPorts)) {
        config.forwardPorts = config.forwardPorts.map((port: number | string): number | string => {
            if (typeof port === 'number') {
                return port + offset;
            }
            return port;
        }) as number[];
    }

    // Offset portsAttributes keys
    if (config.portsAttributes) {
        const newPortsAttributes: any = {};
        for (const [port, attrs] of Object.entries(config.portsAttributes)) {
            const portNum = parseInt(port, 10);
            if (!isNaN(portNum)) {
                newPortsAttributes[portNum + offset] = attrs;
            } else {
                newPortsAttributes[port] = attrs;
            }
        }
        config.portsAttributes = newPortsAttributes;
    }
}

/**
 * Merge setup scripts from overlays into postCreateCommand
 */
function mergeSetupScripts(
    config: DevContainer,
    overlays: string[],
    outputPath: string,
    fileRegistry: FileRegistry,
    overlaysDir: string
): void {
    const setupScripts: string[] = [];
    const verifyScripts: string[] = [];

    const scriptsDir = path.join(outputPath, 'scripts');

    // Only create the scripts directory (and register it) if at least one overlay needs it
    const hasScripts = overlays.some(
        (o) =>
            fs.existsSync(path.join(overlaysDir, o, 'setup.sh')) ||
            fs.existsSync(path.join(overlaysDir, o, 'verify.sh'))
    );
    if (hasScripts) {
        if (!fs.existsSync(scriptsDir)) {
            fs.mkdirSync(scriptsDir, { recursive: true });
        }
        fileRegistry.addDirectory('scripts');
        // Emit shared setup utilities so overlay scripts can source them
        const setupUtilsSrc = path.join(TEMPLATES_DIR, 'scripts', 'setup-utils.sh');
        if (fs.existsSync(setupUtilsSrc)) {
            const setupUtilsDest = path.join(scriptsDir, 'setup-utils.sh');
            fs.copyFileSync(setupUtilsSrc, setupUtilsDest);
            fs.chmodSync(setupUtilsDest, 0o755);
            fileRegistry.addFile('scripts/setup-utils.sh');
        }
    }

    for (const overlay of overlays) {
        // Handle setup scripts
        const setupPath = path.join(overlaysDir, overlay, 'setup.sh');
        if (fs.existsSync(setupPath)) {
            // Copy setup script to scripts subdirectory
            const destPath = path.join(scriptsDir, `setup-${overlay}.sh`);
            fs.copyFileSync(setupPath, destPath);

            // Make it executable
            fs.chmodSync(destPath, 0o755);
            fileRegistry.addFile(`scripts/setup-${overlay}.sh`);

            setupScripts.push(`bash .devcontainer/scripts/setup-${overlay}.sh`);
        }

        // Handle verify scripts
        const verifyPath = path.join(overlaysDir, overlay, 'verify.sh');
        if (fs.existsSync(verifyPath)) {
            // Copy verify script to scripts subdirectory
            const destPath = path.join(scriptsDir, `verify-${overlay}.sh`);
            fs.copyFileSync(verifyPath, destPath);

            // Make it executable
            fs.chmodSync(destPath, 0o755);
            fileRegistry.addFile(`scripts/verify-${overlay}.sh`);

            verifyScripts.push(`bash .devcontainer/scripts/verify-${overlay}.sh`);
        }
    }

    if (setupScripts.length > 0) {
        // Initialize postCreateCommand if it doesn't exist
        if (!config.postCreateCommand) {
            config.postCreateCommand = {};
        }

        // If postCreateCommand is a string, convert to object
        if (typeof config.postCreateCommand === 'string') {
            config.postCreateCommand = { default: config.postCreateCommand };
        }

        // Add setup scripts
        for (let i = 0; i < setupScripts.length; i++) {
            const overlay = overlays.filter((o) => {
                const setupPath = path.join(overlaysDir, o, 'setup.sh');
                return fs.existsSync(setupPath);
            })[i];
            config.postCreateCommand[`setup-${overlay}`] = setupScripts[i];
        }

        console.log(chalk.dim(`   🔧 Added ${setupScripts.length} setup script(s)`));
    }

    if (verifyScripts.length > 0) {
        // Initialize postStartCommand if it doesn't exist
        if (!config.postStartCommand) {
            config.postStartCommand = {};
        }

        // If postStartCommand is a string, convert to object
        if (typeof config.postStartCommand === 'string') {
            config.postStartCommand = { default: config.postStartCommand };
        }

        // Add verify scripts
        for (let i = 0; i < verifyScripts.length; i++) {
            const overlay = overlays.filter((o) => {
                const verifyPath = path.join(overlaysDir, o, 'verify.sh');
                return fs.existsSync(verifyPath);
            })[i];
            config.postStartCommand[`verify-${overlay}`] = verifyScripts[i];
        }

        console.log(chalk.dim(`   ✓ Added ${verifyScripts.length} verification script(s)`));
    }
}

/**
 * Filter depends_on in docker-compose files to only include selected services
 */
function filterDockerComposeDependencies(outputPath: string, selectedOverlays: string[]): void {
    const selectedServices = new Set(selectedOverlays);
    const composeFiles = fs
        .readdirSync(outputPath)
        .filter((f) => f.startsWith('docker-compose.') && f.endsWith('.yml'));

    for (const composeFile of composeFiles) {
        const composePath = path.join(outputPath, composeFile);
        let content = fs.readFileSync(composePath, 'utf-8');

        // Parse YAML manually for simple depends_on filtering
        // This is a simplified approach - for production, use a proper YAML parser
        const lines = content.split('\n');
        const filtered: string[] = [];
        let inDependsOn = false;
        let dependsOnIndent = 0;

        for (let i = 0; i < lines.length; i++) {
            const line = lines[i];
            const indent = line.search(/\S/);

            if (line.trim().startsWith('depends_on:')) {
                inDependsOn = true;
                dependsOnIndent = indent;
                filtered.push(line);
                continue;
            }

            if (inDependsOn) {
                if (indent <= dependsOnIndent && line.trim() !== '') {
                    inDependsOn = false;
                } else if (line.trim().startsWith('-')) {
                    // Extract service name
                    const service = line.trim().substring(1).trim();
                    if (selectedServices.has(service)) {
                        filtered.push(line);
                    }
                    continue;
                }
            }

            filtered.push(line);
        }

        fs.writeFileSync(composePath, filtered.join('\n'));
    }
}

/**
 * Merge runServices from all overlays in correct order
 */
function mergeRunServices(config: DevContainer, overlays: string[], overlaysDir: string): void {
    const services: Array<{ name: string; order: number }> = [];

    for (const overlay of overlays) {
        const overlayPath = path.join(overlaysDir, overlay, 'devcontainer.patch.json');
        if (fs.existsSync(overlayPath)) {
            const overlayConfig = loadJson<any>(overlayPath);
            if (overlayConfig.runServices) {
                const manifestPath = path.join(overlaysDir, overlay, 'overlay.yml');
                const manifest = fs.existsSync(manifestPath)
                    ? (yaml.load(fs.readFileSync(manifestPath, 'utf8')) as OverlayMetadata)
                    : null;
                const order = manifest?.serviceOrder ?? 0;
                for (const service of overlayConfig.runServices) {
                    services.push({ name: service, order });
                }
            }
        }
    }

    // Sort by order, then merge
    services.sort((a, b) => a.order - b.order);
    const uniqueServices = [...new Set(services.map((s) => s.name))];

    if (uniqueServices.length > 0) {
        config.runServices = uniqueServices;
    }
}
