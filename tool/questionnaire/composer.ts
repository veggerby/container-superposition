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
  
  // Docker-in-Docker is already in base templates, so we note if it's NOT needed
  if (!answers.needsDocker) {
    // Remove docker-outside-of-docker feature if present
    if (config.features?.['ghcr.io/devcontainers/features/docker-outside-of-docker:1']) {
      delete config.features['ghcr.io/devcontainers/features/docker-outside-of-docker:1'];
    }
  }
  
  // Database overlays
  if (answers.database === 'postgres' || answers.database === 'postgres+redis') {
    overlays.push('postgres');
  }
  if (answers.database === 'redis' || answers.database === 'postgres+redis') {
    overlays.push('redis');
  }
  
  // Playwright
  if (answers.playwright) {
    overlays.push('playwright');
  }
  
  // Cloud tools
  if (answers.cloudTools) {
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
  
  // 6. Copy template files (scripts, etc.)
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
  
  // 7. Write merged devcontainer.json
  const configPath = path.join(outputPath, 'devcontainer.json');
  fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  console.log(chalk.dim(`   📝 Wrote devcontainer.json`));
  
  // 8. Copy overlay files (docker-compose, configs, etc.)
  for (const overlay of overlays) {
    copyOverlayFiles(outputPath, overlay);
  }
  
  // 9. Merge .env.example files from overlays
  mergeEnvExamples(outputPath, overlays);
  
  // 10. Update docker-compose reference in devcontainer.json if needed
  const hasCompose = overlays.some(o => 
    fs.existsSync(path.join(OVERLAYS_DIR, o, 'docker-compose.yml'))
  );
  
  if (hasCompose) {
    config.dockerComposeFile = overlays
      .filter(o => fs.existsSync(path.join(OVERLAYS_DIR, o, 'docker-compose.yml')))
      .map(o => `docker-compose.${o}.yml`);
    
    fs.writeFileSync(configPath, JSON.stringify(config, null, 2) + '\n');
  }
}
