import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import * as yaml from 'js-yaml';
import type {
    QuestionnaireAnswers,
    DevContainer,
    CloudTool,
    OverlayMetadata,
    OverlaysConfig,
    SuperpositionManifest,
    PresetGlueConfig,
    CustomizationConfig,
} from '../schema/types.js';
import { loadOverlaysConfig } from '../schema/overlay-loader.js';
import {
    loadCustomPatches,
    hasCustomDirectory,
    getCustomScriptPaths,
} from '../schema/custom-loader.js';
import { generateReadme } from '../readme/readme-generator.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve REPO_ROOT that works in both source and compiled output
// When running from TypeScript sources (e.g. ts-node), __dirname is "<root>/tool/questionnaire"
// When running from compiled JS in "dist/tool/questionnaire", __dirname is "<root>/dist/tool/questionnaire"
const REPO_ROOT_CANDIDATES = [
    path.join(__dirname, '..', '..'), // From source: tool/questionnaire -> root
    path.join(__dirname, '..', '..', '..'), // From dist: dist/tool/questionnaire -> root
];
const REPO_ROOT =
    REPO_ROOT_CANDIDATES.find(
        (candidate) =>
            fs.existsSync(path.join(candidate, 'templates')) &&
            fs.existsSync(path.join(candidate, 'overlays'))
    ) ?? REPO_ROOT_CANDIDATES[0];

const TEMPLATES_DIR = path.join(REPO_ROOT, 'templates');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'overlays');

/**
 * Deep merge two objects, with special handling for arrays
 */
function deepMerge(target: any, source: any): any {
    const output = { ...target };

    for (const key in source) {
        if (source[key] instanceof Object && key in target) {
            if (Array.isArray(source[key])) {
                // For arrays, concatenate and deduplicate
                output[key] = Array.isArray(target[key])
                    ? [...new Set([...target[key], ...source[key]])]
                    : source[key];
            } else if (key === 'remoteEnv') {
                // Special handling for remoteEnv to merge PATH variables intelligently
                output[key] = mergeRemoteEnv(target[key], source[key]);
            } else {
                output[key] = deepMerge(target[key], source[key]);
            }
        } else {
            output[key] = source[key];
        }
    }

    return output;
}

/**
 * Keep only dependencies that exist in the final compose service set.
 * Supports both compose syntaxes:
 * - array form: depends_on: [serviceA, serviceB]
 * - object form: depends_on: { serviceA: { condition: ... } }
 */
function filterDependsOnToExistingServices(
    dependsOn: unknown,
    existingServices: Set<string>
): unknown {
    if (Array.isArray(dependsOn)) {
        const filtered = dependsOn.filter(
            (dep): dep is string => typeof dep === 'string' && existingServices.has(dep)
        );
        return filtered.length > 0 ? filtered : undefined;
    }

    if (dependsOn && typeof dependsOn === 'object') {
        const filtered = Object.fromEntries(
            Object.entries(dependsOn).filter(([dep]) => existingServices.has(dep))
        );
        return Object.keys(filtered).length > 0 ? filtered : undefined;
    }

    return dependsOn;
}

/**
 * Split PATH string on colons, but preserve ${...} variable references
 * e.g., "${containerEnv:HOME}/bin:${containerEnv:PATH}" -> ["${containerEnv:HOME}/bin", "${containerEnv:PATH}"]
 */
function splitPath(pathString: string): string[] {
    const paths: string[] = [];
    let current = '';
    let braceDepth = 0;

    for (let i = 0; i < pathString.length; i++) {
        const char = pathString[i];
        const nextChar = pathString[i + 1];

        if (char === '$' && nextChar === '{') {
            current += char;
            braceDepth++;
        } else if (char === '}' && braceDepth > 0) {
            current += char;
            braceDepth--;
        } else if (char === ':' && braceDepth === 0) {
            // Split here - we're not inside ${...}
            if (current) {
                paths.push(current);
            }
            current = '';
        } else {
            current += char;
        }
    }

    // Add the last component
    if (current) {
        paths.push(current);
    }

    return paths;
}

/**
 * Merge remoteEnv objects, with special handling for PATH variables
 */
function mergeRemoteEnv(
    target: Record<string, string>,
    source: Record<string, string>
): Record<string, string> {
    const output = { ...target };

    for (const key in source) {
        if (key === 'PATH' && target[key]) {
            // Collect PATH components from both target and source using smart split
            const targetPaths = splitPath(target[key]).filter(
                (p) => p && p !== '${containerEnv:PATH}'
            );
            const sourcePaths = splitPath(source[key]).filter(
                (p) => p && p !== '${containerEnv:PATH}'
            );

            // Combine and deduplicate paths, preserving order
            const allPaths = [...new Set([...targetPaths, ...sourcePaths])];

            // Rebuild PATH with original ${containerEnv:PATH} at the end
            output[key] = [...allPaths, '${containerEnv:PATH}'].join(':');
        } else {
            // For non-PATH variables, source overwrites target
            output[key] = source[key];
        }
    }

    return output;
}

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
        // Filter out empty tokens from split to avoid leading spaces
        const existingPackages = existing.split(' ').filter((p: string) => p);
        const newPackages = packages.split(' ').filter((p) => p);
        const merged = [...new Set([...existingPackages, ...newPackages])].join(' ');
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
        const existingPackages = existing.split(' ').filter((p: string) => p);
        const newPackages = apt.split(' ').filter((p) => p);
        const merged = [...new Set([...existingPackages, ...newPackages])].join(' ');
        baseConfig.features[featureKey].apt = merged;
    }

    // Merge apk packages
    if (apk) {
        const existing = baseConfig.features[featureKey].apk || '';
        const existingPackages = existing.split(' ').filter((p: string) => p);
        const newPackages = apk.split(' ').filter((p) => p);
        const merged = [...new Set([...existingPackages, ...newPackages])].join(' ');
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

    const resolved = new Set<string>(requestedOverlays);
    const autoAdded: string[] = [];
    const resolutionReasons: string[] = [];

    // Resolve dependencies recursively
    const toProcess = [...requestedOverlays];
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
 * Generate superposition.json manifest
 */
function generateManifest(
    outputPath: string,
    answers: QuestionnaireAnswers,
    overlays: string[],
    autoResolved: { added: string[]; reason: string },
    containerName?: string
): void {
    const manifest: SuperpositionManifest = {
        version: '0.1.0',
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
    };

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
 * Apply an overlay to the base configuration
 */
function applyOverlay(baseConfig: DevContainer, overlayName: string): DevContainer {
    const overlayPath = path.join(OVERLAYS_DIR, overlayName, 'devcontainer.patch.json');

    if (!fs.existsSync(overlayPath)) {
        console.warn(chalk.yellow(`⚠️  Overlay not found: ${overlayName}`));
        return baseConfig;
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
 * Clean up stale files from previous runs
 * Removes anything not in the registry (except preserved files like superposition.json)
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

            // Remove directory if not in registry
            if (!expectedDirs.has(entry)) {
                fs.rmSync(entryPath, { recursive: true, force: true });
                removedCount++;
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
 * Copy additional files from overlay to output directory
 * Excludes devcontainer.patch.json and .env.example (handled separately)
 */
function copyOverlayFiles(outputPath: string, overlayName: string, registry: FileRegistry): void {
    const overlayPath = path.join(OVERLAYS_DIR, overlayName);

    if (!fs.existsSync(overlayPath)) {
        return;
    }

    const entries = fs.readdirSync(overlayPath);
    let copiedFiles = 0;

    for (const entry of entries) {
        // Skip devcontainer.patch.json, .env.example, docker-compose.yml, setup.sh, verify.sh, and metadata files (handled separately)
        if (
            entry === 'devcontainer.patch.json' ||
            entry === '.env.example' ||
            entry === 'docker-compose.yml' ||
            entry === 'setup.sh' ||
            entry === 'verify.sh' ||
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
            copiedFiles++;
        }
    }

    if (copiedFiles > 0) {
        console.log(
            chalk.dim(`   📋 Copied ${copiedFiles} file(s) from ${chalk.cyan(overlayName)}`)
        );
    }
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
    portOffset?: number,
    glueConfig?: PresetGlueConfig,
    presetName?: string
): boolean {
    const envSections: string[] = [];

    for (const overlay of overlays) {
        const envPath = path.join(OVERLAYS_DIR, overlay, '.env.example');

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
 * Apply port offset to environment variables in .env content
 */
function applyPortOffsetToEnv(envContent: string, offset: number): string {
    const lines = envContent.split('\n');
    const portVarPattern = /^([A-Z_]*PORT[A-Z_]*)=(\d+)$/;

    const modifiedLines = lines.map((line) => {
        const match = line.match(portVarPattern);
        if (match) {
            const [, varName, portValue] = match;
            const newPort = parseInt(portValue, 10) + offset;
            return `${varName}=${newPort}`;
        }
        return line;
    });

    return modifiedLines.join('\n');
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
 * Merge docker-compose.yml files from base and overlays into a single file
 */
function mergeDockerComposeFiles(
    outputPath: string,
    baseStack: string,
    overlays: string[],
    portOffset?: number,
    customImage?: string
): void {
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

    // Add overlay docker-compose files
    for (const overlay of overlays) {
        const overlayComposePath = path.join(OVERLAYS_DIR, overlay, 'docker-compose.yml');
        if (fs.existsSync(overlayComposePath)) {
            composeFiles.push(overlayComposePath);
        }
    }

    if (composeFiles.length === 0) {
        return; // No docker-compose files to merge
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
            const filteredDependsOn = filterDependsOnToExistingServices(
                service.depends_on,
                serviceNameSet
            );

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
 * Main composition logic
 */
export async function composeDevContainer(answers: QuestionnaireAnswers): Promise<void> {
    // 1. Load overlay configuration
    const overlaysDir = path.join(REPO_ROOT, 'overlays');
    const indexYmlPath = path.join(REPO_ROOT, 'overlays', 'index.yml');
    const overlaysConfig = loadOverlaysConfig(overlaysDir, indexYmlPath);

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

    // Check compatibility
    const incompatible: string[] = [];
    for (const overlayId of requestedOverlays) {
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
    }

    // 2. Resolve dependencies
    const { overlays: resolvedOverlays, autoResolved } = resolveDependencies(
        requestedOverlays,
        allOverlayDefs
    );

    // If writeManifestOnly is set, generate only the manifest and exit early
    if (answers.writeManifestOnly) {
        const outputPath = path.resolve(answers.outputPath);
        
        if (!fs.existsSync(outputPath)) {
            fs.mkdirSync(outputPath, { recursive: true });
        }

        // Order overlays (same logic as full generation)
        const orderedOverlays: string[] = [];
        const observabilityOrder = [
            'jaeger',
            'prometheus',
            'loki',
            'promtail',
            'otel-collector',
            'grafana',
            'otel-demo-nodejs',
            'otel-demo-python',
        ];

        for (const obs of observabilityOrder) {
            if (resolvedOverlays.includes(obs)) {
                orderedOverlays.push(obs);
            }
        }

        for (const overlay of resolvedOverlays) {
            if (!orderedOverlays.includes(overlay)) {
                orderedOverlays.push(overlay);
            }
        }

        const overlays = orderedOverlays;

        // Generate manifest only
        generateManifest(outputPath, answers, overlays, autoResolved, answers.containerName);
        
        console.log(
            chalk.green('\n✓ Manifest-only generation complete!')
        );
        console.log(chalk.dim(`   📋 Generated: ${path.join(outputPath, 'superposition.json')}`));
        console.log(
            chalk.cyan('\n💡 Next steps:')
        );
        console.log(chalk.gray('   1. Commit superposition.json to your repository'));
        console.log(chalk.gray('   2. Team members run: npx container-superposition regen'));
        console.log(chalk.gray('   3. Add .devcontainer/ to .gitignore (keep .devcontainer/custom/ if needed)'));
        
        return; // Exit early, don't generate devcontainer files
    }

    // 3. Determine base template path
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

    // 5. Create output directory and file registry for cleanup
    const outputPath = path.resolve(answers.outputPath);
    const fileRegistry = new FileRegistry();

    if (!fs.existsSync(outputPath)) {
        fs.mkdirSync(outputPath, { recursive: true });
    }

    // 6. Apply overlays
    for (const overlay of overlays) {
        console.log(chalk.dim(`   🔧 Applying overlay: ${chalk.cyan(overlay)}`));
        config = applyOverlay(config, overlay);
    }

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
        copyOverlayFiles(outputPath, overlay, fileRegistry);
    }

    // 8.5. Copy cross-distro-packages feature if used
    if (config.features?.['./features/cross-distro-packages']) {
        const featuresDir = path.join(outputPath, 'features', 'cross-distro-packages');
        const sourceFeatureDir = path.join(REPO_ROOT, 'features', 'cross-distro-packages');

        if (fs.existsSync(sourceFeatureDir)) {
            copyDir(sourceFeatureDir, featuresDir);
            fileRegistry.addDirectory('features');
            console.log(chalk.dim(`   📦 Copied cross-distro-packages feature`));
        }
    }

    // 8. Filter docker-compose dependencies based on selected overlays
    filterDockerComposeDependencies(outputPath, overlays);

    // 9. Merge runServices array in correct order
    mergeRunServices(config, overlays);

    // 11. Merge docker-compose files into single combined file
    if (answers.stack === 'compose') {
        const customImage = config._customImage as string | undefined;
        mergeDockerComposeFiles(
            outputPath,
            answers.stack,
            overlays,
            answers.portOffset,
            customImage
        );
        // Update devcontainer.json to reference the combined file
        if (config.dockerComposeFile) {
            config.dockerComposeFile = 'docker-compose.yml';
        }
    }

    // Apply port offset to devcontainer.json if specified
    if (answers.portOffset) {
        applyPortOffsetToDevcontainer(config, answers.portOffset);
    }

    // Merge setup scripts from overlays into postCreateCommand
    mergeSetupScripts(config, overlays, outputPath, fileRegistry);

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

    // 12. Write merged devcontainer.json
    const configPath = path.join(outputPath, 'devcontainer.json');
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
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
        answers.containerName || config.name
    );
    fileRegistry.addFile('superposition.json');

    // 14. Merge .env.example files from overlays and apply glue config environment variables
    const envCreated = mergeEnvExamples(
        outputPath,
        overlays,
        answers.portOffset,
        answers.presetGlueConfig,
        answers.preset
    );
    if (envCreated) {
        fileRegistry.addFile('.env.example');
    }

    // Apply custom environment variables (after .env.example is created)
    if (customPatches) {
        const customEnvCreated = applyCustomEnvironment(outputPath, customPatches);
        // Add .env.example to registry if it was created by custom patches but not by overlays
        if (customEnvCreated && !envCreated) {
            fileRegistry.addFile('.env.example');
        }
    }

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

    // 17. Clean up stale files from previous runs (preserves superposition.json and .env)
    cleanupStaleFiles(outputPath, fileRegistry);
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
    fileRegistry: FileRegistry
): void {
    const setupScripts: string[] = [];
    const verifyScripts: string[] = [];

    // Create scripts subfolder
    const scriptsDir = path.join(outputPath, 'scripts');
    if (!fs.existsSync(scriptsDir)) {
        fs.mkdirSync(scriptsDir, { recursive: true });
    }

    // Add scripts directory to registry if any scripts will be added
    const hasScripts = overlays.some(
        (o) =>
            fs.existsSync(path.join(OVERLAYS_DIR, o, 'setup.sh')) ||
            fs.existsSync(path.join(OVERLAYS_DIR, o, 'verify.sh'))
    );
    if (hasScripts) {
        fileRegistry.addDirectory('scripts');
    }

    for (const overlay of overlays) {
        // Handle setup scripts
        const setupPath = path.join(OVERLAYS_DIR, overlay, 'setup.sh');
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
        const verifyPath = path.join(OVERLAYS_DIR, overlay, 'verify.sh');
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
                const setupPath = path.join(OVERLAYS_DIR, o, 'setup.sh');
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
                const verifyPath = path.join(OVERLAYS_DIR, o, 'verify.sh');
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
function mergeRunServices(config: DevContainer, overlays: string[]): void {
    const services: Array<{ name: string; order: number }> = [];

    for (const overlay of overlays) {
        const overlayPath = path.join(OVERLAYS_DIR, overlay, 'devcontainer.patch.json');
        if (fs.existsSync(overlayPath)) {
            const overlayConfig = loadJson<any>(overlayPath);
            if (overlayConfig.runServices) {
                const order = overlayConfig._serviceOrder || 0;
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
