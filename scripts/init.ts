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
import type { QuestionnaireAnswers, Stack, BaseImage, LanguageOverlay, DatabaseOverlay, CloudTool, DevTool, ObservabilityTool, SuperpositionManifest, DevContainer, OverlaysConfig, OverlayMetadata } from '../tool/schema/types.js';
import { composeDevContainer } from '../tool/questionnaire/composer.js';
import { loadOverlaysConfig } from '../tool/schema/overlay-loader.js';

// Get __dirname equivalent in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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

const OVERLAYS_DIR_CANDIDATES = [
  // When running from TypeScript sources (e.g. ts-node), __dirname is "<root>/scripts"
  path.join(__dirname, '..', 'overlays'),
  // When running from compiled JS in "dist/scripts", __dirname is "<root>/dist/scripts"
  path.join(__dirname, '..', '..', 'overlays'),
];

const OVERLAYS_DIR =
  OVERLAYS_DIR_CANDIDATES.find((candidate) => fs.existsSync(candidate)) ??
  OVERLAYS_DIR_CANDIDATES[0];

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
 * Load overlay metadata from individual manifests or fallback to YAML file
 */
function loadOverlaysConfigWrapper(): OverlaysConfig {
  return loadOverlaysConfig(OVERLAYS_DIR, OVERLAYS_CONFIG_PATH);
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
    if (!manifest.version || !manifest.baseTemplate) {
      console.error(chalk.red('✗ Invalid manifest format: missing required fields (version, baseTemplate)'));
      return null;
    }

    if (!Array.isArray(manifest.overlays)) {
      console.error(chalk.red('✗ Invalid manifest format: "overlays" must be an array'));
      return null;
    }

    if (!manifest.overlays.every((overlay) => typeof overlay === 'string')) {
      console.error(chalk.red('✗ Invalid manifest format: all "overlays" entries must be strings'));
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
 * Create timestamped backup of existing devcontainer and manifest
 */
async function createBackup(outputPath: string, backupDir?: string): Promise<string | null> {
  // Check for devcontainer files to backup
  const devcontainerJsonPath = path.join(outputPath, 'devcontainer.json');
  const dockerComposePath = path.join(outputPath, 'docker-compose.yml');
  const devcontainerSubdir = path.join(outputPath, '.devcontainer');
  const manifestPath = path.join(outputPath, 'superposition.json');

  // Determine what exists
  const hasDevcontainerJson = fs.existsSync(devcontainerJsonPath);
  const hasDockerCompose = fs.existsSync(dockerComposePath);
  const hasDevcontainerSubdir = fs.existsSync(devcontainerSubdir) && fs.statSync(devcontainerSubdir).isDirectory();
  const hasManifest = fs.existsSync(manifestPath);

  if (!hasDevcontainerJson && !hasDockerCompose && !hasDevcontainerSubdir && !hasManifest) {
    return null; // Nothing to backup
  }

  // Create timestamp
  const timestamp = new Date().toISOString()
    .replace(/:/g, '-')
    .replace(/\..+/, '')
    .replace('T', '-');

  // Determine backup location - create next to outputPath, not inside it
  const resolvedOutputPath = path.resolve(outputPath);
  const outputParentDir = path.dirname(resolvedOutputPath);
  const outputBaseName = path.basename(resolvedOutputPath);
  const backupBaseName = outputBaseName === '.devcontainer' ? '.devcontainer' : outputBaseName;
  const backupPath = backupDir
    ? path.resolve(backupDir)
    : path.join(outputParentDir, `${backupBaseName}.backup-${timestamp}`);

  // Create backup directory
  fs.mkdirSync(backupPath, { recursive: true });

  // Backup files and directories
  if (hasDevcontainerJson) {
    fs.copyFileSync(devcontainerJsonPath, path.join(backupPath, 'devcontainer.json'));
  }

  if (hasDockerCompose) {
    fs.copyFileSync(dockerComposePath, path.join(backupPath, 'docker-compose.yml'));
  }

  if (hasDevcontainerSubdir) {
    const destDir = path.join(backupPath, '.devcontainer');
    await copyDirectory(devcontainerSubdir, destDir);
  }

  if (hasManifest) {
    fs.copyFileSync(manifestPath, path.join(backupPath, 'superposition.json'));
  }

  // Also backup other common devcontainer files
  const otherFiles = ['.env', '.env.example', '.gitignore', 'features', 'scripts'];
  for (const file of otherFiles) {
    const srcPath = path.join(outputPath, file);
    if (fs.existsSync(srcPath)) {
      const destPath = path.join(backupPath, file);
      if (fs.statSync(srcPath).isDirectory()) {
        await copyDirectory(srcPath, destPath);
      } else {
        fs.copyFileSync(srcPath, destPath);
      }
    }
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
  // Write to the parent directory's .gitignore (project root), not inside outputPath
  const resolvedOutputPath = path.resolve(outputPath);
  const projectRoot = path.dirname(resolvedOutputPath);
  const gitignorePath = path.join(projectRoot, '.gitignore');

  const backupPatterns = [
    '',
    '# Container Superposition backups',
    '.devcontainer.backup-*/',
    '*.backup-*',
    'superposition.json.backup-*'
  ].join('\n');

  if (!fs.existsSync(gitignorePath)) {
    // Create new .gitignore with backup patterns
    await fs.promises.writeFile(gitignorePath, backupPatterns + '\n');
    console.log(chalk.dim('   📝 Created .gitignore with backup patterns'));
  } else {
    // Check if patterns already exist
    const content = await fs.promises.readFile(gitignorePath, 'utf-8');
    if (!content.includes('Container Superposition backups')) {
      // Append patterns
      await fs.promises.appendFile(gitignorePath, '\n' + backupPatterns + '\n');
      console.log(chalk.dim('   📝 Updated .gitignore with backup patterns'));
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
async function runQuestionnaire(manifest?: SuperpositionManifest, manifestDir?: string): Promise<QuestionnaireAnswers> {
  const config = loadOverlaysConfigWrapper();

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
    const presetOverlaysFiltered = config.overlays.filter(o => o.category === 'preset');
    let presetOverlays: string[] = [];

    if (presetOverlaysFiltered.length > 0) {
      const defaultPreset = manifest?.preset || 'custom';

      const presetChoice = await select({
        message: 'Start from a preset or build custom?',
        choices: [
          {
            name: 'Custom (select overlays manually)',
            value: 'custom',
            description: 'Choose individual overlays yourself'
          },
          ...presetOverlaysFiltered.map(p => ({
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
      })),
      default: manifest?.baseImage
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
      { name: 'Language', overlays: config.overlays.filter(o => o.category === 'language') },
      { name: 'Database', overlays: config.overlays.filter(o => o.category === 'database') },
      { name: 'Observability', overlays: config.overlays.filter(o => o.category === 'observability') },
      { name: 'Cloud', overlays: config.overlays.filter(o => o.category === 'cloud') },
      { name: 'DevTool', overlays: config.overlays.filter(o => o.category === 'dev') },
    ];

    // Create a map of all overlays for dependency lookup
    const allOverlaysMap = new Map(config.overlays.map(o => [o.id, o]));

    // Question 3: Categorized multi-select overlays with dependency tracking
    let userSelection: readonly string[];

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

// Question 4: Container name
    const containerName = await input({
      message: 'Container/project name (optional):',
      default: manifest?.containerName || ''
    });

    // Question 5: Output path
    // If manifest provided, default to its location; otherwise use ./.devcontainer
    const defaultOutput = manifest?.outputPath && manifestDir
      ? path.resolve(manifestDir, manifest.outputPath)
      : (manifest?.outputPath || './.devcontainer');

    const outputPath = await input({
      message: 'Output path:',
      default: defaultOutput
    });

    // Question 6: Port offset (optional, for running multiple instances)
    const portOffsetInput = await input({
      message: 'Port offset (leave empty for default ports, e.g., 100 to avoid conflicts):',
      default: manifest?.portOffset ? String(manifest.portOffset) : ''
    });
    const portOffset = portOffsetInput ? parseInt(portOffsetInput, 10) : undefined;

    // Parse selected overlays into categories
    const overlayMap = new Map(config.overlays.map(o => [o.id, o]));

    const language = selectedOverlays.filter(o =>
      overlayMap.get(o)?.category === 'language'
    ) as LanguageOverlay[];

    const observability = selectedOverlays.filter(o =>
      overlayMap.get(o)?.category === 'observability'
    ) as ObservabilityTool[];

    const cloudTools = selectedOverlays.filter(o =>
      overlayMap.get(o)?.category === 'cloud'
    ) as CloudTool[];

    const devTools = selectedOverlays.filter(o =>
      overlayMap.get(o)?.category === 'dev'
    ) as DevTool[];

    const database = selectedOverlays.filter(o =>
      overlayMap.get(o)?.category === 'database'
    ) as DatabaseOverlay[];

    const playwright = selectedOverlays.includes('playwright');

    return {
      stack,
      baseImage,
      customImage,
      containerName: containerName || undefined,
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
 * Build partial answers from manifest
 * Note: Categories are only used for UI/questionnaire grouping.
 * The composer works with overlay IDs regardless of category.
 */
function buildAnswersFromManifest(
  manifest: SuperpositionManifest,
  manifestDir?: string
): Partial<QuestionnaireAnswers> {
  const config = loadOverlaysConfigWrapper();

  // Helper to categorize overlays by type (for QuestionnaireAnswers structure)
  const categorizeOverlays = (overlayIds: string[]) => {
    const language: LanguageOverlay[] = [];
    const database: DatabaseOverlay[] = [];
    const observability: ObservabilityTool[] = [];
    const cloudTools: CloudTool[] = [];
    const devTools: DevTool[] = [];

    // Build lookup map from unified overlays array
    const overlayMap = new Map(config.overlays.map(o => [o.id, o]));

    // Categorize based on overlay metadata
    for (const id of overlayIds) {
      const overlay = overlayMap.get(id);
      if (!overlay) continue;

      switch (overlay.category) {
        case 'language':
          language.push(id as LanguageOverlay);
          break;
        case 'database':
          database.push(id as DatabaseOverlay);
          break;
        case 'observability':
          observability.push(id as ObservabilityTool);
          break;
        case 'cloud':
          cloudTools.push(id as CloudTool);
          break;
        case 'dev':
          devTools.push(id as DevTool);
          break;
      }
    }

    return { language, database, observability, cloudTools, devTools };
  };

  const categories = categorizeOverlays(manifest.overlays);

  // Resolve output path relative to manifest directory if relative
  let outputPath = manifest.outputPath || './.devcontainer';
  if (manifestDir && !path.isAbsolute(outputPath)) {
    outputPath = path.resolve(manifestDir, outputPath);
  }

  return {
    stack: manifest.baseTemplate,
    baseImage: manifest.baseImage as BaseImage,
    containerName: manifest.containerName,
    preset: manifest.preset,
    presetChoices: manifest.presetChoices,
    ...categories,
    needsDocker: manifest.baseTemplate === 'compose',
    playwright: categories.devTools.includes('playwright'),
    outputPath,
    portOffset: manifest.portOffset
  };
}

/**
 * Build partial answers from CLI arguments
 */
function buildAnswersFromCliArgs(
  config: Partial<QuestionnaireAnswers>
): Partial<QuestionnaireAnswers> {
  const answers: Partial<QuestionnaireAnswers> = {};

  if (config.stack) {
    answers.stack = config.stack;
    answers.needsDocker = config.stack === 'compose';
  }
  if (config.baseImage) answers.baseImage = config.baseImage;
  if (config.containerName) answers.containerName = config.containerName;
  if (config.language) answers.language = config.language;
  if (config.database) answers.database = config.database;
  if (config.playwright !== undefined) answers.playwright = config.playwright;
  if (config.observability) answers.observability = config.observability;
  if (config.cloudTools) answers.cloudTools = config.cloudTools;
  if (config.devTools) answers.devTools = config.devTools;
  if (config.portOffset !== undefined) answers.portOffset = config.portOffset;
  if (config.outputPath) answers.outputPath = config.outputPath;
  if (config.preset) answers.preset = config.preset;
  if (config.presetChoices) answers.presetChoices = config.presetChoices;

  return answers;
}

/**
 * Merge multiple partial answers with precedence: cli > interactive > manifest > defaults
 */
function mergeAnswers(
  ...partials: Array<Partial<QuestionnaireAnswers> | undefined>
): QuestionnaireAnswers {
  const merged: any = {
    language: [],
    database: [],
    cloudTools: [],
    devTools: [],
    observability: [],
    playwright: false,
    outputPath: './.devcontainer'
  };

  // Merge in order (later overrides earlier)
  for (const partial of partials) {
    if (!partial) continue;

    Object.keys(partial).forEach(key => {
      const value = (partial as any)[key];
      if (value !== undefined && value !== null) {
        // For arrays, prefer non-empty values
        if (Array.isArray(value)) {
          if (value.length > 0) {
            merged[key] = value;
          }
        } else {
          merged[key] = value;
        }
      }
    });
  }

  // Ensure required fields have defaults
  if (!merged.stack) merged.stack = 'plain';
  if (!merged.baseImage) merged.baseImage = 'bookworm';
  if (!merged.needsDocker && merged.stack) {
    merged.needsDocker = merged.stack === 'compose';
  }

  return merged as QuestionnaireAnswers;
}

/**
 * Parse CLI arguments
 */
async function parseCliArgs(): Promise<{ config: Partial<QuestionnaireAnswers>; manifestPath?: string; noBackup?: boolean; backupDir?: string; yes?: boolean; noInteractive?: boolean } | null> {
  const program = new Command();

  program
    .name('container-superposition')
    .description('Initialize a devcontainer with guided questions or CLI flags')
    .version('0.1.0')
    .option('--from-manifest <path>', 'Load configuration from existing superposition.json manifest')
    .option('--yes', 'Skip confirmation prompts (non-interactive regeneration)')
    .option('--no-interactive', 'Use manifest values directly without questionnaire (requires --from-manifest)')
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
    noBackup: options.backup === false, // Commander creates options.backup = false for --no-backup
    backupDir: options.backupDir,
    yes: options.yes,
    noInteractive: options.interactive === false // Commander creates options.interactive = false for --no-interactive
  };
}

async function main() {
  try {
    const cliArgs = await parseCliArgs();

    let manifest: SuperpositionManifest | undefined;
    let manifestDir: string | undefined;
    let shouldBackup = true;
    let backupDir: string | undefined;
    let useManifestOnly = false;

    // Handle manifest loading
    if (cliArgs?.manifestPath) {
      const manifestPath = findManifestFile(cliArgs.manifestPath);

      if (!manifestPath) {
        console.error(chalk.red('✗ Could not find manifest file'));
        console.error(chalk.red(`  Searched for: ${cliArgs.manifestPath}`));
        process.exit(1);
      }

      manifestDir = path.dirname(manifestPath);
      const loadedManifest = loadManifest(manifestPath);
      if (!loadedManifest) {
        process.exit(1);
      }
      manifest = loadedManifest;

      // Check for backup and interaction options
      if (cliArgs.noBackup) {
        shouldBackup = false;
      }
      if (cliArgs.backupDir) {
        backupDir = cliArgs.backupDir;
      }
      if (cliArgs.noInteractive) {
        useManifestOnly = true;
      }
    }

    // Create backup if needed
    if (shouldBackup && manifest) {
      const outputPath = path.resolve(
        manifestDir || '.',
        manifest.outputPath || './.devcontainer'
      );

      const backupPath = await createBackup(outputPath, backupDir);
      if (backupPath) {
        console.log(chalk.green(`✓ Backup created: ${backupPath}\n`));
        await ensureBackupPatternsInGitignore(outputPath);
      }
    }

    // Build answers based on mode
    let answers: QuestionnaireAnswers;

    if (useManifestOnly && manifest) {
      // Mode 1: Manifest-only (--from-manifest --no-interactive)
      const manifestAnswers = buildAnswersFromManifest(manifest, manifestDir);
      answers = mergeAnswers(manifestAnswers);

      console.log('\n' + boxen(
        chalk.bold.cyan('Regenerating from Manifest (No Interactive)\n\n') +
        chalk.white('Configuration:\n') +
        chalk.gray(`  Template: ${manifest.baseTemplate}\n`) +
        chalk.gray(`  Base Image: ${manifest.baseImage}\n`) +
        (manifest.containerName ? chalk.gray(`  Container: ${manifest.containerName}\n`) : '') +
        chalk.gray(`  Overlays: ${manifest.overlays.join(', ')}\n`) +
        (manifest.preset ? chalk.gray(`  Preset: ${manifest.preset}\n`) : '') +
        (manifest.portOffset ? chalk.gray(`  Port offset: ${manifest.portOffset}\n`) : '') +
        chalk.gray(`  Output: ${answers.outputPath}`),
        { padding: 1, borderColor: 'cyan', borderStyle: 'round', margin: 1 }
      ));
    } else if (cliArgs && cliArgs.config.stack) {
      // Mode 2: CLI-based (with optional manifest defaults)
      const cliAnswers = buildAnswersFromCliArgs(cliArgs.config);
      const manifestAnswers = manifest ? buildAnswersFromManifest(manifest, manifestDir) : undefined;
      answers = mergeAnswers(manifestAnswers, cliAnswers, { outputPath: cliAnswers.outputPath || './.devcontainer' });

      console.log('\n' + boxen(
        chalk.bold('Running in CLI mode'),
        { padding: 0.5, borderColor: 'blue', borderStyle: 'round' }
      ));
    } else {
      // Mode 3: Interactive (with optional manifest pre-population)
      const interactiveAnswers = await runQuestionnaire(manifest, manifestDir);
      answers = mergeAnswers(interactiveAnswers);
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

    if (answers.cloudTools && answers.cloudTools.length > 0) {
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
