#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import { select, checkbox, input, confirm } from '@inquirer/prompts';
import yaml from 'js-yaml';
import type { QuestionnaireAnswers, Stack, BaseImage, LanguageOverlay, DatabaseOverlay, CloudTool, DevTool, ObservabilityTool, SuperpositionManifest, DevContainer } from '../tool/schema/types.js';
import { composeDevContainer } from '../tool/questionnaire/composer.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

interface OverlayMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  order?: number;
  image?: string | null;
  supports?: string[];
  requires?: string[];
  suggests?: string[];
  conflicts?: string[];
  tags?: string[];
  ports?: number[];
}

interface OverlaysConfig {
  base_images: OverlayMetadata[];
  base_templates: OverlayMetadata[];
  language_overlays: OverlayMetadata[];
  database_overlays: OverlayMetadata[];
  observability_overlays: OverlayMetadata[];
  cloud_tool_overlays: OverlayMetadata[];
  dev_tool_overlays: OverlayMetadata[];
  preset_overlays?: OverlayMetadata[];
}

interface PresetDefinition {
  id: string;
  name: string;
  description: string;
  type: 'meta';
  category: 'preset';
  supports?: string[];
  tags?: string[];
  selects: {
    required: string[];
    userChoice?: Record<string, {
      id: string;
      prompt: string;
      options: string[];
      defaultOption?: string;
    }>;
  };
  glueConfig?: {
    environment?: Record<string, string>;
    portMappings?: Record<string, number>;
    readme?: string;
  };
}

const OVERLAYS_CONFIG_CANDIDATES = [
  // When running from TypeScript sources (e.g. ts-node), __dirname is "<root>/scripts"
  // and "../overlays/index.yml" resolves to "<root>/overlays/index.yml".
  path.join(__dirname, '..', 'overlays', 'index.yml'),
  // When running from compiled JS in "dist/scripts", __dirname is "<root>/dist/scripts"
  // and "../../overlays/index.yml" resolves to "<root>/overlays/index.yml".
  path.join(__dirname, '..', '..', 'overlays', 'index.yml'),
];

const OVERLAYS_CONFIG_PATH =
  OVERLAYS_CONFIG_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ??
  OVERLAYS_CONFIG_CANDIDATES[0];

const PRESETS_DIR_CANDIDATES = [
  path.join(__dirname, '..', 'overlays', 'presets'),
  path.join(__dirname, '..', '..', 'overlays', 'presets'),
];

const PRESETS_DIR =
  PRESETS_DIR_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ??
  PRESETS_DIR_CANDIDATES[0];

/**
 * Load overlay metadata from YAML file
 */
function loadOverlaysConfig(): OverlaysConfig {
  const content = fs.readFileSync(OVERLAYS_CONFIG_PATH, 'utf8');
  return yaml.load(content) as OverlaysConfig;
}

/**
 * Load preset definition from YAML file
 */
function loadPresetDefinition(presetId: string): PresetDefinition | null {
  const presetPath = path.join(PRESETS_DIR, `${presetId}.yml`);
  if (!fs.existsSync(presetPath)) {
    console.warn(chalk.yellow(`⚠️  Preset definition not found: ${presetPath}`));
    return null;
  }
  const content = fs.readFileSync(presetPath, 'utf8');
  return yaml.load(content) as PresetDefinition;
}

/**
 * Expand a preset into a list of overlay IDs with user choices resolved
 */
async function expandPreset(
  presetId: string,
  stack: Stack
): Promise<{ overlays: string[]; choices: Record<string, string>; glueConfig?: PresetDefinition['glueConfig'] }> {
  const preset = loadPresetDefinition(presetId);
  if (!preset) {
    return { overlays: [], choices: {} };
  }

  console.log(chalk.cyan(`\n📦 Expanding preset: ${preset.name}\n`));

  const overlays: string[] = [...preset.selects.required];
  const choices: Record<string, string> = {};

  // Handle user choices
  if (preset.selects.userChoice) {
    for (const [key, choice] of Object.entries(preset.selects.userChoice)) {
      const selectedOption = await select({
        message: choice.prompt,
        choices: choice.options.map(opt => ({
          name: opt,
          value: opt,
        })),
        default: choice.defaultOption,
      }) as string;

      overlays.push(selectedOption);
      choices[key] = selectedOption;
    }
  }

  console.log(chalk.dim(`✓ Preset will include: ${overlays.join(', ')}\n`));

  return { overlays, choices, glueConfig: preset.glueConfig };
}

/**
 * Search for manifest file in multiple locations
 */
function findManifestFile(manifestPath?: string): string | null {
  const searchPaths: string[] = [];
  
  if (manifestPath) {
    // If path specified, use it directly
    searchPaths.push(manifestPath);
  } else {
    // Search in common locations
    searchPaths.push(
      'superposition.json',
      '.devcontainer/superposition.json',
      '../superposition.json',
      path.join(process.cwd(), 'superposition.json'),
      path.join(process.cwd(), '.devcontainer', 'superposition.json')
    );
  }
  
  for (const searchPath of searchPaths) {
    const resolvedPath = path.resolve(searchPath);
    if (fs.existsSync(resolvedPath)) {
      return resolvedPath;
    }
  }
  
  return null;
}

/**
 * Load and validate manifest file
 */
function loadManifest(manifestPath: string): SuperpositionManifest | null {
  try {
    const content = fs.readFileSync(manifestPath, 'utf-8');
    const manifest = JSON.parse(content) as SuperpositionManifest;
    
    // Basic validation
    if (!manifest.version || !manifest.baseTemplate || !manifest.overlays) {
      console.error(chalk.red('✗ Invalid manifest format: missing required fields'));
      return null;
    }
    
    // Version check (warn if different, but continue)
    if (manifest.version !== '0.1.0') {
      console.warn(chalk.yellow(`⚠️  Manifest version ${manifest.version} may not be fully compatible with this tool`));
    }
    
    return manifest;
  } catch (error) {
    console.error(chalk.red(`✗ Failed to load manifest: ${error instanceof Error ? error.message : String(error)}`));
    return null;
  }
}

/**
 * Load container name from existing devcontainer.json
 */
function loadExistingContainerName(outputPath: string): string | undefined {
  const devcontainerPath = path.join(outputPath, 'devcontainer.json');
  if (!fs.existsSync(devcontainerPath)) {
    return undefined;
  }
  
  try {
    const content = fs.readFileSync(devcontainerPath, 'utf-8');
    const devcontainer = JSON.parse(content) as DevContainer;
    return devcontainer.name;
  } catch (error) {
    console.warn(chalk.yellow('⚠️  Could not read existing devcontainer.json'));
    return undefined;
  }
}

/**
 * Create timestamped backup of existing devcontainer and manifest
 */
async function createBackup(outputPath: string, backupDir?: string): Promise<string | null> {
  const devcontainerDir = path.join(outputPath, '.devcontainer');
  const manifestPath = path.join(outputPath, 'superposition.json');
  
  // Check if there's anything to backup
  const hasDevcontainer = fs.existsSync(devcontainerDir);
  const hasManifest = fs.existsSync(manifestPath);
  
  if (!hasDevcontainer && !hasManifest) {
    return null; // Nothing to backup
  }
  
  // Create timestamp
  const timestamp = new Date().toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '-');
  
  // Determine backup location
  const backupPath = backupDir 
    ? path.resolve(backupDir)
    : path.join(outputPath, `.devcontainer.backup-${timestamp}`);
  
  // Create backup directory
  fs.mkdirSync(backupPath, { recursive: true });
  
  // Backup .devcontainer directory
  if (hasDevcontainer) {
    const destDir = path.join(backupPath, '.devcontainer');
    await copyDirectory(devcontainerDir, destDir);
  }
  
  // Backup superposition.json
  if (hasManifest) {
    const destManifest = path.join(backupPath, 'superposition.json');
    fs.copyFileSync(manifestPath, destManifest);
  }
  
  return backupPath;
}

/**
 * Recursively copy directory
 */
async function copyDirectory(src: string, dest: string): Promise<void> {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });
  
  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);
    
    if (entry.isDirectory()) {
      await copyDirectory(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

/**
 * Ensure backup patterns are in .gitignore
 */
async function ensureBackupPatternsInGitignore(outputPath: string): Promise<void> {
  const gitignorePath = path.join(outputPath, '.devcontainer', '.gitignore');
  const backupPatterns = [
    '',
    '# Container Superposition backups',
    '.devcontainer.backup-*/',
    '*.backup-*',
    'superposition.json.backup-*'
  ].join('\n');
  
  if (!fs.existsSync(gitignorePath)) {
    // Create new .gitignore with backup patterns
    fs.mkdirSync(path.dirname(gitignorePath), { recursive: true });
    await fs.promises.writeFile(gitignorePath, backupPatterns + '\n');
    console.log(chalk.dim('   📝 Created .devcontainer/.gitignore with backup patterns'));
  } else {
    // Check if patterns already exist
    const content = await fs.promises.readFile(gitignorePath, 'utf-8');
    if (!content.includes('Container Superposition backups')) {
      // Append patterns
      await fs.promises.appendFile(gitignorePath, '\n' + backupPatterns + '\n');
      console.log(chalk.dim('   📝 Updated .devcontainer/.gitignore with backup patterns'));
    }
  }
}

/**
 * Build checkbox choices for overlay selection with optional pre-selection
 */
function buildOverlayChoices(
  config: OverlaysConfig,
  stack: Stack,
  categoryList: Array<{ name: string; overlays: OverlayMetadata[] }>,
  preselected: string[]
): any[] {
  const choices: any[] = [];
  
  categoryList.forEach(category => {
    const filtered = category.overlays.filter((o: any) => 
      !o.supports || o.supports.length === 0 || o.supports.includes(stack)
    );
    
    if (filtered.length > 0) {
      // Add category separator
      choices.push({
        type: 'separator',
        separator: chalk.cyan(`──── ${category.name} ────`)
      });
      
      // Add overlays in this category
      filtered.forEach((overlay: any) => {
        choices.push({
          name: overlay.name,
          value: overlay.id,
          description: overlay.description,
          checked: preselected.includes(overlay.id)
        });
      });
    }
  });
  
  return choices;
}

/**
 * Interactive questionnaire with modern checkbox selections
 */
async function runQuestionnaire(manifest?: SuperpositionManifest): Promise<QuestionnaireAnswers> {
  const config = loadOverlaysConfig();

  // Pretty banner
  console.log('\n' + boxen(
    chalk.bold.cyan('Container Superposition') + '\n' +
    chalk.gray(manifest ? 'DevContainer Regenerator' : 'DevContainer Initializer'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      textAlignment: 'center'
    }
  ));
  
  if (manifest) {
    console.log(chalk.cyan('📋 Loaded from manifest:'));
    console.log(chalk.dim(`   Template: ${manifest.baseTemplate}`));
    console.log(chalk.dim(`   Overlays: ${manifest.overlays.join(', ')}`));
    if (manifest.preset) {
      console.log(chalk.dim(`   Preset: ${manifest.preset}`));
    }
    if (manifest.portOffset) {
      console.log(chalk.dim(`   Port offset: ${manifest.portOffset}`));
    }
    console.log();
  }
  
  console.log(chalk.dim('Compose your ideal devcontainer from modular overlays.'));
  console.log(chalk.dim('Use ') + chalk.cyan('space') + chalk.dim(' to select, ') + chalk.cyan('enter') + chalk.dim(' to confirm.\n'));

  try {
    // Question 0: Optional preset selection
    let usePreset = false;
    let selectedPresetId: string | undefined = manifest?.preset;
    let presetChoices: Record<string, string> = manifest?.presetChoices || {};
    let presetGlueConfig: PresetDefinition['glueConfig'] | undefined;
    let presetOverlays: string[] = [];

    if (config.preset_overlays && config.preset_overlays.length > 0) {
      const defaultPreset = manifest?.preset || 'custom';
      
      const presetChoice = await select({
        message: 'Start from a preset or build custom?',
        choices: [
          {
            name: 'Custom (select overlays manually)',
            value: 'custom',
            description: 'Choose individual overlays yourself'
          },
          ...config.preset_overlays.map(p => ({
            name: p.name,
            value: p.id,
            description: p.description
          }))
        ],
        default: defaultPreset
      }) as string;

      if (presetChoice !== 'custom') {
        usePreset = true;
        selectedPresetId = presetChoice;
      }
    }

    // Question 1: Base template
    const stack = await select({
      message: 'Select base template:',
      choices: config.base_templates.map(t => ({
        name: t.name,
        value: t.id,
        description: t.description
      })),
      default: manifest?.baseTemplate
    }) as Stack;

    // If using preset, expand it now
    if (usePreset && selectedPresetId) {
      const expansion = await expandPreset(selectedPresetId, stack);
      
      if (!expansion.overlays || expansion.overlays.length === 0) {
        // Preset failed to expand (e.g., missing or invalid preset definition).
        // Treat this as "no preset" so the manifest does not incorrectly record one.
        console.log(
          chalk.yellow(
            `\n⚠️  Preset "${selectedPresetId}" could not be applied. Falling back to custom overlay selection.\n`
          )
        );
        usePreset = false;
        selectedPresetId = undefined;
        presetOverlays = [];
        presetChoices = {};
        presetGlueConfig = undefined;
      } else {
        presetOverlays = expansion.overlays;
        presetChoices = expansion.choices;
        presetGlueConfig = expansion.glueConfig;
      }
    }

    // Question 2: Base image selection
    const baseImage = await select({
      message: 'Select base image:',
      choices: config.base_images.map(img => ({
        name: img.name,
        value: img.id,
        description: img.description
      }))
    }) as BaseImage;

    // Question 2a: If custom, ask for image name
    let customImage: string | undefined;
    if (baseImage === 'custom') {
      customImage = await input({
        message: 'Enter custom Docker image (e.g., ubuntu:22.04):',
        validate: (value) => {
          if (!value || value.trim() === '') {
            return 'Image name is required';
          }
          return true;
        }
      });
      
      console.log(chalk.yellow('\n⚠️  Warning: Custom images may conflict with overlays.'));
      console.log(chalk.dim('   Test thoroughly and adjust configurations as needed.\n'));
    }

    // Build categorized overlays with separators
    const categoryList = [
      { name: 'Language', overlays: config.language_overlays },
      { name: 'Database', overlays: config.database_overlays },
      { name: 'Observability', overlays: config.observability_overlays },
      { name: 'Cloud', overlays: config.cloud_tool_overlays },
      { name: 'DevTool', overlays: config.dev_tool_overlays },
    ];
    
    // Create a map of all overlays for dependency lookup
    const allOverlaysMap = new Map<string, OverlayMetadata>();
    categoryList.forEach(cat => {
      cat.overlays.forEach((o: any) => allOverlaysMap.set(o.id, o));
    });

    // Question 3: Categorized multi-select overlays with dependency tracking
    let userSelection: readonly string[];
    
    // Determine pre-selected overlays from preset or manifest
    const preselectedOverlays = manifest?.overlays || (usePreset ? presetOverlays : []);
    
    if (usePreset && presetOverlays.length > 0) {
      // Preset mode: Ask if user wants to customize
      console.log(chalk.cyan(`\n✓ Preset includes these overlays: ${presetOverlays.join(', ')}\n`));
      
      const customizePreset = await select({
        message: 'Do you want to customize the overlay selection?',
        choices: [
          { name: 'Use preset as-is', value: 'no', description: 'Keep the preset overlay selection' },
          { name: 'Customize selection', value: 'yes', description: 'Add or remove overlays from the preset' }
        ]
      }) as string;

      if (customizePreset === 'yes') {
        // Show overlay selection with preset overlays pre-selected
        console.log(chalk.dim('\n💡 Select overlays: Space to toggle, ↑/↓ to navigate, Enter to confirm'));
        console.log(chalk.dim('   Preset overlays are pre-selected\n'));
        
        const choices = buildOverlayChoices(config, stack, categoryList, presetOverlays);
        
        userSelection = await checkbox({
          message: 'Select overlays to include:',
          choices,
          pageSize: 15,
          loop: false
        });
      } else {
        // Use preset selection as-is
        userSelection = presetOverlays;
      }
    } else if (manifest) {
      // Manifest mode: Pre-select overlays from manifest
      console.log(chalk.cyan(`\n✓ Manifest includes these overlays: ${manifest.overlays.join(', ')}\n`));
      
      const customizeManifest = await select({
        message: 'Do you want to customize the overlay selection?',
        choices: [
          { name: 'Use manifest as-is', value: 'no', description: 'Keep the manifest overlay selection' },
          { name: 'Customize selection', value: 'yes', description: 'Add or remove overlays from the manifest' }
        ]
      }) as string;

      if (customizeManifest === 'yes') {
        // Show overlay selection with manifest overlays pre-selected
        console.log(chalk.dim('\n💡 Select overlays: Space to toggle, ↑/↓ to navigate, Enter to confirm'));
        console.log(chalk.dim('   Manifest overlays are pre-selected\n'));
        
        // Filter out overlays that don't exist anymore
        const existingOverlays = manifest.overlays.filter(id => allOverlaysMap.has(id));
        const missingOverlays = manifest.overlays.filter(id => !allOverlaysMap.has(id));
        
        if (missingOverlays.length > 0) {
          console.log(chalk.yellow(`⚠️  Warning: Some overlays from manifest no longer exist: ${missingOverlays.join(', ')}\n`));
        }
        
        const choices = buildOverlayChoices(config, stack, categoryList, existingOverlays);
        
        userSelection = await checkbox({
          message: 'Select overlays to include:',
          choices,
          pageSize: 15,
          loop: false
        });
      } else {
        // Use manifest selection as-is (filtering out missing overlays)
        const existingOverlays = manifest.overlays.filter(id => allOverlaysMap.has(id));
        const missingOverlays = manifest.overlays.filter(id => !allOverlaysMap.has(id));
        
        if (missingOverlays.length > 0) {
          console.log(chalk.yellow(`⚠️  Warning: Some overlays from manifest no longer exist and will be skipped: ${missingOverlays.join(', ')}\n`));
        }
        
        userSelection = existingOverlays;
      }
    } else {
      // Custom mode: Normal overlay selection
      console.log(chalk.dim('\n💡 Select overlays: Space to toggle, ↑/↓ to navigate, Enter to confirm\n'));
      
      const choices = buildOverlayChoices(config, stack, categoryList, []);
      
      userSelection = await checkbox({
        message: 'Select overlays to include:',
        choices,
        pageSize: 15,
        loop: false
      });
    }
    
    // Add all required dependencies
    const withDependencies = new Set<string>(userSelection as string[]);
    const toProcess = [...userSelection] as string[];
    
    while (toProcess.length > 0) {
      const current = toProcess.pop()!;
      const overlay = allOverlaysMap.get(current);
      
      if (overlay?.requires) {
        overlay.requires.forEach(req => {
          if (!withDependencies.has(req)) {
            withDependencies.add(req);
            toProcess.push(req);
          }
        });
      }
    }
    
    let selectedOverlays = Array.from(withDependencies);
    
    // Check for conflicts and resolve
    let hasConflicts = true;
    while (hasConflicts) {
      const conflicts = new Map<string, string[]>();
      
      // Find all conflicts
      selectedOverlays.forEach(selectedId => {
        const overlay = allOverlaysMap.get(selectedId);
        if (overlay?.conflicts) {
          overlay.conflicts.forEach(conflictId => {
            if (selectedOverlays.includes(conflictId)) {
              if (!conflicts.has(selectedId)) {
                conflicts.set(selectedId, []);
              }
              conflicts.get(selectedId)!.push(conflictId);
            }
          });
        }
      });
      
      if (conflicts.size === 0) {
        hasConflicts = false;
      } else {
        // Show conflict resolution UI
        console.log(chalk.yellow('\n⚠️  Conflicts detected in selection:\n'));
        
        const conflictChoices: any[] = [];
        conflicts.forEach((conflictingWith, overlayId) => {
          const overlay = allOverlaysMap.get(overlayId)!;
          const conflictNames = conflictingWith.map(id => allOverlaysMap.get(id)?.name).join(', ');
          
          conflictChoices.push({
            name: `Remove ${overlay.name}`,
            value: overlayId,
            description: `Conflicts with: ${conflictNames}`
          });
        });
        
        const toRemove = await checkbox({
          message: 'Select overlays to remove to resolve conflicts:',
          choices: conflictChoices,
          pageSize: 15,
          loop: false
        });
        
        if ((toRemove as string[]).length === 0) {
          console.log(chalk.red('\n❌ You must remove at least one conflicting overlay'));
          continue;
        }
        
        // Remove selected overlays
        selectedOverlays = selectedOverlays.filter(id => !(toRemove as string[]).includes(id));
      }
    }

    // Question 4: Output path
    const outputPath = await input({
      message: 'Output path:',
      default: manifest?.outputPath || './.devcontainer'
    });

    // Question 5: Port offset (optional, for running multiple instances)
    const portOffsetInput = await input({
      message: 'Port offset (leave empty for default ports, e.g., 100 to avoid conflicts):',
      default: manifest?.portOffset ? String(manifest.portOffset) : ''
    });
    const portOffset = portOffsetInput ? parseInt(portOffsetInput, 10) : undefined;

    // Parse selected overlays into categories
    const language = selectedOverlays.filter(o => 
      config.language_overlays.some(l => l.id === o)
    ) as LanguageOverlay[];

    const observability = selectedOverlays.filter(o =>
      config.observability_overlays.some(obs => obs.id === o)
    ) as ObservabilityTool[];

    const cloudTools = selectedOverlays.filter(o =>
      config.cloud_tool_overlays.some(ct => ct.id === o)
    ) as CloudTool[];

    const devTools = selectedOverlays.filter(o =>
      config.dev_tool_overlays.some(dt => dt.id === o)
    ) as DevTool[];

    const database = selectedOverlays.filter(o =>
      config.database_overlays.some(db => db.id === o)
    ) as DatabaseOverlay[];

    const playwright = selectedOverlays.includes('playwright');

    return {
      stack,
      baseImage,
      customImage,
      preset: selectedPresetId,
      presetChoices: Object.keys(presetChoices).length > 0 ? presetChoices : undefined,
      presetGlueConfig,
      language,
      needsDocker: stack === 'compose', // Compose template includes docker-outside-of-docker
      database,
      playwright,
      cloudTools,
      devTools,
      observability,
      outputPath,
      portOffset,
    };
  } catch (error) {
    if ((error as any).name === 'ExitPromptError') {
      console.log('\n' + chalk.yellow('Cancelled by user'));
      process.exit(0);
    }
    throw error;
  }
}

/**
 * Parse CLI arguments
 */
async function parseCliArgs(): Promise<{ config: Partial<QuestionnaireAnswers>; manifestPath?: string; noBackup?: boolean; backupDir?: string; yes?: boolean } | null> {
  const program = new Command();
  
  program
    .name('container-superposition')
    .description('Initialize a devcontainer with guided questions or CLI flags')
    .version('0.1.0')
    .option('--from-manifest <path>', 'Load configuration from existing superposition.json manifest')
    .option('--yes', 'Skip confirmation prompts (non-interactive regeneration)')
    .option('--no-backup', 'Skip creating backup before regeneration')
    .option('--backup-dir <path>', 'Custom backup directory location')
    .option('--stack <type>', 'Base template: plain, compose')
    .option('--language <list>', 'Comma-separated language overlays: dotnet, nodejs, python, mkdocs, java, go, rust, bun, powershell')
    .option('--database <list>', 'Comma-separated database overlays: postgres, redis, mongodb, mysql, sqlserver, sqlite, minio, rabbitmq, redpanda, nats')
    .option('--observability <list>', 'Comma-separated: otel-collector, jaeger, prometheus, grafana, loki')
    .option('--playwright', 'Include Playwright browser automation')
    .option('--cloud-tools <list>', 'Comma-separated: aws-cli, azure-cli, gcloud, kubectl-helm, terraform, pulumi')
    .option('--dev-tools <list>', 'Comma-separated: docker-in-docker, docker-sock, playwright, codex, git-helpers, pre-commit, commitlint, just, direnv, modern-cli-tools, ngrok')
    .option('--port-offset <number>', 'Add offset to all exposed ports (e.g., 100 makes Grafana 3100 instead of 3000)')
    .option('-o, --output <path>', 'Output path (default: ./.devcontainer)')
    .parse(process.argv);

  const options = program.opts();
  
  // If no options provided, return null to trigger interactive mode
  if (Object.keys(options).length === 0) {
    return null;
  }

  const config: Partial<QuestionnaireAnswers> = {};

  if (options.stack) config.stack = options.stack as Stack;
  if (options.language) {
    config.language = options.language.split(',').map((l: string) => l.trim()) as LanguageOverlay[];
  }
  if (options.database) {
    config.database = options.database.split(',').map((d: string) => d.trim()) as DatabaseOverlay[];
  }
  if (options.observability) {
    config.observability = options.observability.split(',').map((t: string) => t.trim()) as ObservabilityTool[];
  }
  if (options.playwright) config.playwright = true;
  if (options.cloudTools) {
    config.cloudTools = options.cloudTools.split(',').map((t: string) => t.trim()) as CloudTool[];
  }
  if (options.devTools) {
    config.devTools = options.devTools.split(',').map((t: string) => t.trim()) as DevTool[];
  }
  if (options.portOffset) {
    config.portOffset = parseInt(options.portOffset, 10);
  }
  if (options.output) config.outputPath = options.output;

  return {
    config,
    manifestPath: options.fromManifest,
    noBackup: options.noBackup,
    backupDir: options.backupDir,
    yes: options.yes
  };
}

async function main() {
  try {
    const cliArgs = await parseCliArgs();
    
    let manifest: SuperpositionManifest | undefined;
    let shouldBackup = true;
    let backupDir: string | undefined;
    let skipConfirmation = false;
    
    // Handle manifest loading
    if (cliArgs?.manifestPath || (cliArgs && Object.keys(cliArgs.config).length === 0 && cliArgs.manifestPath !== undefined)) {
      const manifestPath = findManifestFile(cliArgs?.manifestPath);
      
      if (!manifestPath) {
        console.error(chalk.red('✗ Could not find manifest file'));
        if (cliArgs?.manifestPath) {
          console.error(chalk.red(`  Searched for: ${cliArgs.manifestPath}`));
        } else {
          console.error(chalk.red('  Searched in: superposition.json, .devcontainer/superposition.json, ../superposition.json'));
        }
        process.exit(1);
      }
      
      const loadedManifest = loadManifest(manifestPath);
      if (!loadedManifest) {
        process.exit(1);
      }
      
      manifest = loadedManifest;
      
      // Check for backup options
      if (cliArgs?.noBackup) {
        shouldBackup = false;
      }
      if (cliArgs?.backupDir) {
        backupDir = cliArgs.backupDir;
      }
      if (cliArgs?.yes) {
        skipConfirmation = true;
      }
      
      // Show manifest summary and get confirmation
      if (!skipConfirmation) {
        console.log('\n' + boxen(
          chalk.bold.cyan('Regenerate from Manifest\n\n') +
          chalk.white('Loaded configuration:\n') +
          chalk.gray(`  Template: ${manifest.baseTemplate}\n`) +
          chalk.gray(`  Overlays: ${manifest.overlays.join(', ')}\n`) +
          (manifest.preset ? chalk.gray(`  Preset: ${manifest.preset}\n`) : '') +
          (manifest.portOffset ? chalk.gray(`  Port offset: ${manifest.portOffset}\n`) : '') +
          '\n' +
          chalk.white('Actions:\n') +
          (shouldBackup ? chalk.gray(`  - Backup current .devcontainer/ to timestamped folder\n`) : chalk.yellow('  - Skip backup (--no-backup)\n')) +
          chalk.gray('  - Regenerate devcontainer with selections from questionnaire'),
          { padding: 1, borderColor: 'cyan', borderStyle: 'round', margin: 1 }
        ));
        
        const proceed = await confirm({
          message: 'Continue with regeneration?',
          default: false
        });
        
        if (!proceed) {
          console.log(chalk.yellow('\nCancelled by user'));
          process.exit(0);
        }
      }
      
      // Create backup if requested
      if (shouldBackup) {
        const outputPath = manifest.outputPath || '.';
        const backupPath = await createBackup(outputPath, backupDir);
        
        if (backupPath) {
          console.log(chalk.green(`\n✓ Backup created: ${backupPath}`));
        }
      }
      
      // Ensure .gitignore has backup patterns
      await ensureBackupPatternsInGitignore(manifest.outputPath || '.');
    }
    
    let answers: QuestionnaireAnswers;
    
    if (cliArgs && cliArgs.config.stack) {
      // Non-interactive mode
      answers = {
        stack: cliArgs.config.stack,
        baseImage: 'bookworm', // Default to bookworm in non-interactive mode
        language: cliArgs.config.language,
        needsDocker: cliArgs.config.stack === 'compose',
        database: cliArgs.config.database ?? [],
        playwright: cliArgs.config.playwright ?? false,
        cloudTools: cliArgs.config.cloudTools ?? [],
        devTools: cliArgs.config.devTools ?? [],
        observability: cliArgs.config.observability ?? [],
        outputPath: cliArgs.config.outputPath ?? manifest?.outputPath ?? './.devcontainer',
        portOffset: cliArgs.config.portOffset ?? manifest?.portOffset,
      };
      
      console.log('\n' + boxen(
        chalk.bold('Running in non-interactive mode'),
        { padding: 0.5, borderColor: 'blue', borderStyle: 'round' }
      ));
    } else {
      // Interactive mode (with optional manifest pre-population)
      answers = await runQuestionnaire(manifest);
    }

    // Show configuration summary
    const summaryLines = [
      chalk.bold.white('Configuration Summary\n'),
      chalk.cyan('Base:            ') + chalk.white(answers.stack),
    ];

    if (answers.language && answers.language.length > 0) {
      summaryLines.push(chalk.cyan('Languages:       ') + chalk.white(answers.language.join(', ')));
    }

    if (answers.database && answers.database.length > 0) {
      summaryLines.push(chalk.cyan('Database:        ') + chalk.white(answers.database.join(', ')));
    }

    summaryLines.push(
      chalk.cyan('Playwright:      ') + chalk.white(answers.playwright ? 'Yes' : 'No')
    );

    if (answers.observability && answers.observability.length > 0) {
      summaryLines.push(
        chalk.cyan('Observability:   ') + chalk.white(answers.observability.join(', '))
      );
    }

    if (answers.cloudTools.length > 0) {
      summaryLines.push(
        chalk.cyan('Cloud tools:     ') + chalk.white(answers.cloudTools.join(', '))
      );
    }

    summaryLines.push(chalk.cyan('Output:          ') + chalk.white(answers.outputPath));

    console.log('\n' + boxen(
      summaryLines.join('\n'),
      { padding: 1, borderColor: 'green', borderStyle: 'round', margin: { top: 0, bottom: 1 } }
    ));

    // Generate with spinner
    const spinner = ora({
      text: chalk.cyan('Generating devcontainer configuration...'),
      color: 'cyan'
    }).start();

    try {
      await composeDevContainer(answers);
      spinner.succeed(chalk.green('DevContainer created successfully!'));
    } catch (error) {
      spinner.fail(chalk.red('Failed to create devcontainer'));
      throw error;
    }

    // Success message
    console.log('\n' + boxen(
      chalk.bold.green('✓ Setup Complete!\n\n') +
      chalk.white('Next steps:\n') +
      chalk.gray('  1. Review the generated .devcontainer/ folder\n') +
      chalk.gray('  2. Customize as needed (it\'s just normal JSON!)\n') +
      chalk.gray('  3. Open in VS Code and rebuild container\n\n') +
      chalk.dim('The generated configuration is fully editable and independent of this tool.'),
      { padding: 1, borderColor: 'green', borderStyle: 'double', margin: 1 }
    ));

  } catch (error) {
    console.error('\n' + boxen(
      chalk.bold.red('Error\n\n') + 
      chalk.white(error instanceof Error ? error.message : String(error)),
      { padding: 1, borderColor: 'red', borderStyle: 'round' }
    ));
    process.exit(1);
  }
}

main();
