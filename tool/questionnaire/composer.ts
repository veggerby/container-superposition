import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import type { QuestionnaireAnswers, DevContainer, CloudTool } from '../schema/types';

const REPO_ROOT = path.join(__dirname, '..', '..');
const TEMPLATES_DIR = path.join(REPO_ROOT, 'templates');
const OVERLAYS_DIR = path.join(REPO_ROOT, 'tool', 'overlays');

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
    const merged = [...new Set([...existing.split(' '), ...packages.split(' ')])].join(' ');
    baseConfig.features[featureKey].packages = merged;
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
 * Apply an overlay to the base configuration
 */
function applyOverlay(baseConfig: DevContainer, overlayName: string): DevContainer {
  const overlayPath = path.join(OVERLAYS_DIR, overlayName, 'devcontainer.patch.json');
  
  if (!fs.existsSync(overlayPath)) {
    console.warn(chalk.yellow(`⚠️  Overlay not found: ${overlayName}`));
    return baseConfig;
  }
  
  const overlay = loadJson<DevContainer>(overlayPath);
  
  // Special handling for apt-get packages
  if (overlay.features?.['ghcr.io/devcontainers-extra/features/apt-get-packages:1']?.packages) {
    const packages = overlay.features['ghcr.io/devcontainers-extra/features/apt-get-packages:1'].packages;
    baseConfig = mergeAptPackages(baseConfig, packages);
    
    // Remove it from overlay to avoid double-merge
    delete overlay.features['ghcr.io/devcontainers-extra/features/apt-get-packages:1'];
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
    // Skip devcontainer.patch.json and .env.example
    if (entry === 'devcontainer.patch.json' || entry === '.env.example') {
      continue;
    }
    
    const srcPath = path.join(overlayPath, entry);
    const stat = fs.statSync(srcPath);
    
    if (stat.isFile()) {
      // For docker-compose files, add overlay prefix
      const destName = entry === 'docker-compose.yml' ? `docker-compose.${overlayName}.yml` : entry;
      const destPath = path.join(outputPath, destName);
      fs.copyFileSync(srcPath, destPath);
      copiedFiles++;
    } else if (stat.isDirectory()) {
      // Copy directories recursively (for config folders, etc.)
      const destPath = path.join(outputPath, entry);
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
function mergeEnvExamples(outputPath: string, overlays: string[]): void {
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
  
  if (envSections.length === 0) {
    return;
  }
  
  // Create combined .env.example
  const header = `# Environment Variables
#
# Copy this file to .env in your project root to customize
# docker-compose and other service configurations.
#
# Generated by container-superposition init tool

`;
  
  const combined = header + envSections.join('\n\n');
  const envOutputPath = path.join(outputPath, '.env.example');
  fs.writeFileSync(envOutputPath, combined + '\n');
  
  console.log(chalk.dim(`   🔐 Created .env.example with ${overlays.length} overlay(s)`));
}

/**
 * Main composition logic
 */
export async function composeDevContainer(answers: QuestionnaireAnswers): Promise<void> {
  // 1. Determine base template path
  const templatePath = path.join(TEMPLATES_DIR, answers.stack, '.devcontainer');
  
  if (!fs.existsSync(templatePath)) {
    throw new Error(`Template not found: ${answers.stack}`);
  }
  
  // 2. Load base devcontainer.json
  const baseConfigPath = path.join(templatePath, 'devcontainer.json');
  let config = loadJson<DevContainer>(baseConfigPath);
  
  // 3. Determine which overlays to apply
  const overlays: string[] = [];
  
  // Language overlay
  if (answers.language) {
    overlays.push(answers.language);
  }
  
  // Database overlays
  if (answers.database === 'postgres' || answers.database === 'postgres+redis') {
    overlays.push('postgres');
  }
  if (answers.database === 'redis' || answers.database === 'postgres+redis') {
    overlays.push('redis');
  }
  
  // Observability overlays (in dependency order)
  if (answers.observability && answers.observability.length > 0) {
    // Order matters: backends before middleware before UI
    const orderedObservability = [
      'jaeger', 'prometheus', 'loki',  // Backends (order 1)
      'otel-collector',                 // Middleware (order 2)
      'grafana'                         // UI (order 3)
    ].filter(o => answers.observability!.includes(o as any));
    
    overlays.push(...orderedObservability);
  }
  
  // Playwright
  if (answers.playwright) {
    overlays.push('playwright');
  }
  
  // Cloud tools
  if (answers.cloudTools && answers.cloudTools.length > 0) {
    overlays.push(...answers.cloudTools);
  }
  
  // 4. Apply overlays
  for (const overlay of overlays) {
    console.log(chalk.dim(`   🔧 Applying overlay: ${chalk.cyan(overlay)}`));
    config = applyOverlay(config, overlay);
  }
  
  // 5. Create output directory
  const outputPath = path.resolve(answers.outputPath);
  if (!fs.existsSync(outputPath)) {
    fs.mkdirSync(outputPath, { recursive: true });
  }
  
  // 6. Copy template files (docker-compose, scripts, etc.)
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
  
  // 7. Copy overlay files (docker-compose, configs, etc.)
  for (const overlay of overlays) {
    copyOverlayFiles(outputPath, overlay);
  }
  
  // 8. Filter docker-compose dependencies based on selected overlays
  filterDockerComposeDependencies(outputPath, overlays);
  
  // 9. Merge runServices array in correct order
  mergeRunServices(config, overlays);
  
  // 10. Update docker-compose file references in devcontainer.json
  updateDockerComposeReferences(config, outputPath, overlays);
  
  // 11. Write merged devcontainer.json
  const configPath = path.join(outputPath, 'devcontainer.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(chalk.dim(`   📝 Wrote devcontainer.json`));
  
  // 12. Merge .env.example files from overlays
  mergeEnvExamples(outputPath, overlays);
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

/**
 * Update dockerComposeFile references
 */
function updateDockerComposeReferences(config: DevContainer, outputPath: string, overlays: string[]): void {
  const composeFiles: string[] = [];
  
  // Check for base docker-compose.yml
  if (fs.existsSync(path.join(outputPath, 'docker-compose.yml'))) {
    composeFiles.push('docker-compose.yml');
  }
  
  // Add overlay compose files
  for (const overlay of overlays) {
    const overlayComposePath = path.join(outputPath, `docker-compose.${overlay}.yml`);
    if (fs.existsSync(overlayComposePath)) {
      composeFiles.push(`docker-compose.${overlay}.yml`);
    }
  }
  
  if (composeFiles.length > 0) {
    config.dockerComposeFile = composeFiles;
  }
}
