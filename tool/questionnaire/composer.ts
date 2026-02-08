import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import * as yaml from 'js-yaml';
import type { QuestionnaireAnswers, DevContainer, CloudTool, OverlayMetadata, OverlaysConfig, SuperpositionManifest, PresetGlueConfig } from '../schema/types.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Resolve REPO_ROOT that works in both source and compiled output
// When running from TypeScript sources (e.g. ts-node), __dirname is "<root>/tool/questionnaire"
// When running from compiled JS in "dist/tool/questionnaire", __dirname is "<root>/dist/tool/questionnaire"
const REPO_ROOT_CANDIDATES = [
  path.join(__dirname, '..', '..'),          // From source: tool/questionnaire -> root
  path.join(__dirname, '..', '..', '..'),    // From dist: dist/tool/questionnaire -> root
];
const REPO_ROOT = REPO_ROOT_CANDIDATES.find(candidate => 
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
 * Merge remoteEnv objects, with special handling for PATH variables
 */
function mergeRemoteEnv(target: Record<string, string>, source: Record<string, string>): Record<string, string> {
  const output = { ...target };
  
  for (const key in source) {
    if (key === 'PATH' && target[key]) {
      // Collect PATH components from both target and source
      const targetPaths = target[key].split(':').filter(p => p && p !== '${containerEnv:PATH}');
      const sourcePaths = source[key].split(':').filter(p => p && p !== '${containerEnv:PATH}');
      
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
    const newPackages = packages.split(' ').filter(p => p);
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
    const newPackages = apt.split(' ').filter(p => p);
    const merged = [...new Set([...existingPackages, ...newPackages])].join(' ');
    baseConfig.features[featureKey].apt = merged;
  }
  
  // Merge apk packages
  if (apk) {
    const existing = baseConfig.features[featureKey].apk || '';
    const existingPackages = existing.split(' ').filter((p: string) => p);
    const newPackages = apk.split(' ').filter(p => p);
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
 * Load overlay metadata from overlays/index.yml
 */
function loadOverlaysConfig(): OverlaysConfig {
  const overlaysConfigPath = path.join(REPO_ROOT, 'overlays', 'index.yml');
  return yaml.load(fs.readFileSync(overlaysConfigPath, 'utf-8')) as OverlaysConfig;
}

/**
 * Get all overlay definitions as a flat array
 */
function getAllOverlayDefs(config: OverlaysConfig): OverlayMetadata[] {
  return [
    ...config.language_overlays,
    ...config.database_overlays,
    ...config.observability_overlays,
    ...config.cloud_tool_overlays,
    ...config.dev_tool_overlays,
  ];
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
  allOverlayDefs.forEach(def => overlayMap.set(def.id, def));
  
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
    conflicts.forEach(c => console.log(chalk.yellow(`   • ${c}`)));
    console.log(chalk.yellow(`\nPlease resolve these conflicts manually.\n`));
  }
  
  const reason = autoAdded.length > 0 
    ? resolutionReasons.join(', ')
    : '';
  
  return {
    overlays: Array.from(resolved),
    autoResolved: {
      added: autoAdded,
      reason
    }
  };
}

/**
 * Generate superposition.json manifest
 */
function generateManifest(
  outputPath: string,
  answers: QuestionnaireAnswers,
  overlays: string[],
  autoResolved: { added: string[]; reason: string }
): void {
  const manifest: SuperpositionManifest = {
    version: '0.1.0',
    generated: new Date().toISOString(),
    baseTemplate: answers.stack,
    baseImage: answers.baseImage === 'custom' && answers.customImage 
      ? answers.customImage 
      : answers.baseImage,
    overlays,
    portOffset: answers.portOffset,
    preset: answers.preset,
    presetChoices: answers.presetChoices,
  };
  
  if (autoResolved.added.length > 0) {
    manifest.autoResolved = autoResolved;
  }
  
  const manifestPath = path.join(outputPath, 'superposition.json');
  fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2) + '\n');
  console.log(chalk.dim(`   📋 Generated superposition.json manifest`));
  
  if (autoResolved.added.length > 0) {
    console.log(chalk.cyan(`   ℹ️  Auto-resolved dependencies: ${autoResolved.added.join(', ')}`));
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
    const packages = overlay.features['ghcr.io/devcontainers-extra/features/apt-get-packages:1'].packages;
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
function copyOverlayFiles(outputPath: string, overlayName: string): void {
  const overlayPath = path.join(OVERLAYS_DIR, overlayName);
  
  if (!fs.existsSync(overlayPath)) {
    return;
  }
  
  const entries = fs.readdirSync(overlayPath);
  let copiedFiles = 0;
  
  for (const entry of entries) {
    // Skip devcontainer.patch.json, .env.example, docker-compose.yml, and setup.sh (handled separately)
    if (entry === 'devcontainer.patch.json' || entry === '.env.example' || entry === 'docker-compose.yml' || entry === 'setup.sh' || entry === 'README.md') {
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
      copiedFiles++;
    } else if (stat.isDirectory()) {
      // Copy directories recursively with overlay prefix
      const destPath = path.join(outputPath, `${entry}-${overlayName}`);
      copyDir(srcPath, destPath);
      copiedFiles++;
    }
  }
  
  if (copiedFiles > 0) {
    console.log(chalk.dim(`   📋 Copied ${copiedFiles} file(s) from ${chalk.cyan(overlayName)}`));
  }
}

/**
 * Merge .env.example files from all selected overlays
 */
/**
 * Merge .env.example files from overlays and apply glue config
 */
function mergeEnvExamples(outputPath: string, overlays: string[], portOffset?: number, glueConfig?: PresetGlueConfig, presetName?: string): void {
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
    return;
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
}

/**
 * Apply port offset to environment variables in .env content
 */
function applyPortOffsetToEnv(envContent: string, offset: number): string {
  const lines = envContent.split('\n');
  const portVarPattern = /^([A-Z_]*PORT[A-Z_]*)=(\d+)$/;
  
  const modifiedLines = lines.map(line => {
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
function applyGlueConfig(outputPath: string, glueConfig: PresetGlueConfig, presetName?: string): void {
  console.log(chalk.cyan(`\n📦 Applying preset glue configuration...\n`));

  // 1. Create preset README if provided
  if (glueConfig.readme) {
    const readmePath = path.join(outputPath, 'PRESET-README.md');
    fs.writeFileSync(readmePath, glueConfig.readme);
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
    console.log(chalk.dim(`   ✓ Added ${Object.keys(glueConfig.environment).length} environment variables to .env.example`));
  }
  
  console.log('');
}

/**
 * Merge docker-compose.yml files from base and overlays into a single file
 */
function mergeDockerComposeFiles(outputPath: string, baseStack: string, overlays: string[], portOffset?: number, customImage?: string): void {
  const composeFiles: string[] = [];
  
  // Add base docker-compose if exists
  const baseComposePath = path.join(TEMPLATES_DIR, baseStack, '.devcontainer', 'docker-compose.yml');
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
    networks: {}
  };
  
  for (const composePath of composeFiles) {
    const content = fs.readFileSync(composePath, 'utf-8');
    const compose = yaml.load(content) as any;
    
    if (compose.services) {
      // Deep merge services to preserve arrays like volumes, ports, etc.
      for (const serviceName in compose.services) {
        if (merged.services[serviceName]) {
          merged.services[serviceName] = deepMerge(merged.services[serviceName], compose.services[serviceName]);
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
  for (const serviceName of serviceNames) {
    const service = merged.services[serviceName];
    if (service.depends_on && Array.isArray(service.depends_on)) {
      service.depends_on = service.depends_on.filter((dep: string) => serviceNames.includes(dep));
      if (service.depends_on.length === 0) {
        delete service.depends_on;
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
    noRefs: true
  });
  
  fs.writeFileSync(outputComposePath, yamlContent);
  console.log(chalk.dim(`   🐳 Created combined docker-compose.yml with ${serviceNames.length} service(s)`));
}

/**
 * Main composition logic
 */
export async function composeDevContainer(answers: QuestionnaireAnswers): Promise<void> {
  // 1. Load overlay configuration
  const overlaysConfig = loadOverlaysConfig();
  
  // Collect all overlay definitions
  const allOverlayDefs = getAllOverlayDefs(overlaysConfig);
  
  // Build list of requested overlays
  const requestedOverlays: string[] = [];
  if (answers.language && answers.language.length > 0) requestedOverlays.push(...answers.language);
  if (answers.database && answers.database.length > 0) requestedOverlays.push(...answers.database);
  if (answers.observability) requestedOverlays.push(...answers.observability);
  if (answers.playwright) requestedOverlays.push('playwright');
  if (answers.cloudTools) requestedOverlays.push(...answers.cloudTools);
  if (answers.devTools) requestedOverlays.push(...answers.devTools);
  
  // Check compatibility
  const incompatible: string[] = [];
  for (const overlayId of requestedOverlays) {
    const overlayDef = allOverlayDefs.find(o => o.id === overlayId);
    if (overlayDef?.supports && overlayDef.supports.length > 0) {
      if (!overlayDef.supports.includes(answers.stack)) {
        incompatible.push(`${overlayId} (requires: ${overlayDef.supports.join(', ')})`);
      }
    }
  }
  
  if (incompatible.length > 0) {
    console.log(chalk.yellow(`\n⚠️  Warning: Some overlays are not compatible with '${answers.stack}' template:`));
    incompatible.forEach(overlay => {
      console.log(chalk.yellow(`   • ${overlay}`));
    });
    console.log(chalk.yellow(`\nThese overlays will be skipped.\n`));
    
    // Filter out incompatible overlays
    if (answers.database) {
      answers.database = answers.database.filter(d => 
        !incompatible.some(i => i.startsWith(d))
      ) as any;
    }
    if (answers.observability) {
      answers.observability = answers.observability.filter(o => 
        !incompatible.some(i => i.startsWith(o))
      ) as any;
    }
    
    // Update requestedOverlays after filtering
    requestedOverlays.length = 0;
    if (answers.language && answers.language.length > 0) requestedOverlays.push(...answers.language);
    if (answers.database && answers.database.length > 0) requestedOverlays.push(...answers.database);
    if (answers.observability) requestedOverlays.push(...answers.observability);
    if (answers.playwright) requestedOverlays.push('playwright');
    if (answers.cloudTools) requestedOverlays.push(...answers.cloudTools);
    if (answers.devTools) requestedOverlays.push(...answers.devTools);
  }
  
  // 2. Resolve dependencies
  const { overlays: resolvedOverlays, autoResolved } = resolveDependencies(requestedOverlays, allOverlayDefs);
  
  // 3. Determine base template path
  const templatePath = path.join(TEMPLATES_DIR, answers.stack, '.devcontainer');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${answers.stack}`);
  }
  
  // 4. Load base devcontainer.json
  const baseConfigPath = path.join(templatePath, 'devcontainer.json');
  let config = loadJson<DevContainer>(baseConfigPath);
  
  // 4a. Apply base image selection
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
  const observabilityOrder = ['jaeger', 'tempo', 'prometheus', 'alertmanager', 'loki', 'promtail', 'otel-collector', 'grafana', 'otel-demo-nodejs', 'otel-demo-python'];
  
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
  
  // 6. Apply overlays
  for (const overlay of overlays) {
    console.log(chalk.dim(`   🔧 Applying overlay: ${chalk.cyan(overlay)}`));
    config = applyOverlay(config, overlay);
  }
  
  // 5. Create output directory
  const outputPath = path.resolve(answers.outputPath);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
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
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
  
  // 8. Copy overlay files (docker-compose, configs, etc.)
  for (const overlay of overlays) {
    copyOverlayFiles(outputPath, overlay);
  }
  
  // 8.5. Copy cross-distro-packages feature if used
  if (config.features?.['./features/cross-distro-packages']) {
    const featuresDir = path.join(outputPath, 'features', 'cross-distro-packages');
    const sourceFeatureDir = path.join(REPO_ROOT, 'features', 'cross-distro-packages');
    
    if (fs.existsSync(sourceFeatureDir)) {
      copyDir(sourceFeatureDir, featuresDir);
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
    mergeDockerComposeFiles(outputPath, answers.stack, overlays, answers.portOffset, customImage);
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
  mergeSetupScripts(config, overlays, outputPath);
  
  // Remove internal fields (those starting with _)
  Object.keys(config).forEach(key => {
    if (key.startsWith('_')) {
      delete (config as any)[key];
    }
  });
  
  // 12. Write merged devcontainer.json
  const configPath = path.join(outputPath, 'devcontainer.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(chalk.dim(`   📝 Wrote devcontainer.json`));
  
  // 13. Generate superposition.json manifest
  generateManifest(outputPath, answers, overlays, autoResolved);
  
  // 14. Merge .env.example files from overlays and apply glue config environment variables
  mergeEnvExamples(outputPath, overlays, answers.portOffset, answers.presetGlueConfig, answers.preset);
  
  // 15. Apply preset glue configuration (README and port mappings) if present
  if (answers.presetGlueConfig) {
    applyGlueConfig(outputPath, answers.presetGlueConfig, answers.preset);
  }
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
function mergeSetupScripts(config: DevContainer, overlays: string[], outputPath: string): void {
  const setupScripts: string[] = [];
  
  // Create scripts subfolder
  const scriptsDir = path.join(outputPath, 'scripts');
  if (!fs.existsSync(scriptsDir)) {
    fs.mkdirSync(scriptsDir, { recursive: true });
  }
  
  for (const overlay of overlays) {
    const setupPath = path.join(OVERLAYS_DIR, overlay, 'setup.sh');
    if (fs.existsSync(setupPath)) {
      // Copy setup script to scripts subdirectory
      const destPath = path.join(scriptsDir, `setup-${overlay}.sh`);
      fs.copyFileSync(setupPath, destPath);
      
      // Make it executable
      fs.chmodSync(destPath, 0o755);
      
      setupScripts.push(`sh .devcontainer/scripts/setup-${overlay}.sh`);
    }
  }
  
  if (setupScripts.length > 0) {
    // Initialize postCreateCommand if it doesn't exist
    if (!config.postCreateCommand) {
      config.postCreateCommand = {};
    }
    
    // If postCreateCommand is a string, convert to object
    if (typeof config.postCreateCommand === 'string') {
      config.postCreateCommand = { 'default': config.postCreateCommand };
    }
    
    // Add setup scripts
    for (let i = 0; i < setupScripts.length; i++) {
      const overlay = overlays.filter(o => {
        const setupPath = path.join(OVERLAYS_DIR, o, 'setup.sh');
        return fs.existsSync(setupPath);
      })[i];
      config.postCreateCommand[`setup-${overlay}`] = setupScripts[i];
    }
    
    console.log(chalk.dim(`   🔧 Added ${setupScripts.length} setup script(s)`));
  }
}

/**
 * Filter depends_on in docker-compose files to only include selected services
 */
function filterDockerComposeDependencies(outputPath: string, selectedOverlays: string[]): void {
  const selectedServices = new Set(selectedOverlays);
  const composeFiles = fs.readdirSync(outputPath).filter(f => f.startsWith('docker-compose.') && f.endsWith('.yml'));
  
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
  const uniqueServices = [...new Set(services.map(s => s.name))];
  
  if (uniqueServices.length > 0) {
    config.runServices = uniqueServices;
  }
}
