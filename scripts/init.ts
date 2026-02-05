#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import { select, checkbox, input } from '@inquirer/prompts';
import yaml from 'js-yaml';
import type { QuestionnaireAnswers, Stack, BaseImage, LanguageOverlay, Database, CloudTool, DevTool, ObservabilityTool } from '../tool/schema/types.js';
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

/**
 * Load overlay metadata from YAML file
 */
function loadOverlaysConfig(): OverlaysConfig {
  const content = fs.readFileSync(OVERLAYS_CONFIG_PATH, 'utf8');
  return yaml.load(content) as OverlaysConfig;
}

/**
 * Interactive questionnaire with modern checkbox selections
 */
async function runQuestionnaire(): Promise<QuestionnaireAnswers> {
  const config = loadOverlaysConfig();

  // Pretty banner
  console.log('\n' + boxen(
    chalk.bold.cyan('Container Superposition') + '\n' +
    chalk.gray('DevContainer Initializer'),
    {
      padding: 1,
      margin: 1,
      borderStyle: 'round',
      borderColor: 'cyan',
      textAlignment: 'center'
    }
  ));
  
  console.log(chalk.dim('Compose your ideal devcontainer from modular overlays.'));
  console.log(chalk.dim('Use ') + chalk.cyan('space') + chalk.dim(' to select, ') + chalk.cyan('enter') + chalk.dim(' to confirm.\n'));

  try {
    // Question 1: Base template
    const stack = await select({
      message: 'Select base template:',
      choices: config.base_templates.map(t => ({
        name: t.name,
        value: t.id,
        description: t.description
      }))
    }) as Stack;

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

    // Question 3: Categorized multi-select overlays with dependency tracking
    console.log(chalk.dim('\n💡 Select overlays: Space to toggle, ↑/↓ to navigate, Enter to confirm\n'));
    
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
    
    // Initial selection
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
            description: overlay.description
          });
        });
      }
    });
    
    const userSelection = await checkbox({
      message: 'Select overlays to include:',
      choices,
      pageSize: 15,
      loop: false
    });
    
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
      default: './.devcontainer'
    });

    // Question 5: Port offset (optional, for running multiple instances)
    const portOffsetInput = await input({
      message: 'Port offset (leave empty for default ports, e.g., 100 to avoid conflicts):',
      default: ''
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

    // Database handling
    const hasPostgres = selectedOverlays.includes('postgres');
    const hasRedis = selectedOverlays.includes('redis');
    let database: Database = 'none';
    if (hasPostgres && hasRedis) {
      database = 'postgres+redis';
    } else if (hasPostgres) {
      database = 'postgres';
    } else if (hasRedis) {
      database = 'redis';
    }

    const playwright = selectedOverlays.includes('playwright');

    return {
      stack,
      baseImage,
      customImage,
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
async function parseCliArgs(): Promise<Partial<QuestionnaireAnswers> | null> {
  const program = new Command();
  
  program
    .name('container-superposition')
    .description('Initialize a devcontainer with guided questions or CLI flags')
    .version('0.1.0')
    .option('--stack <type>', 'Base template: plain, compose')
    .option('--language <list>', 'Comma-separated language overlays: dotnet, nodejs, python, mkdocs')
    .option('--db <type>', 'Database: postgres, redis, postgres+redis, none')
    .option('--postgres', 'Shorthand for --db postgres')
    .option('--redis', 'Shorthand for --db redis')
    .option('--observability <list>', 'Comma-separated: otel-collector, jaeger, prometheus, grafana, loki')
    .option('--playwright', 'Include Playwright browser automation')
    .option('--cloud-tools <list>', 'Comma-separated: aws-cli, azure-cli, kubectl-helm')
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
  if (options.postgres) config.database = 'postgres';
  if (options.redis) config.database = 'redis';
  if (options.db) config.database = options.db as Database;
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

  return config;
}

async function main() {
  try {
    const cliConfig = await parseCliArgs();
    
    let answers: QuestionnaireAnswers;
    
    if (cliConfig && cliConfig.stack) {
      // Non-interactive mode
      answers = {
        stack: cliConfig.stack,
        baseImage: 'bookworm', // Default to bookworm in non-interactive mode
        language: cliConfig.language,
        needsDocker: cliConfig.stack === 'compose',
        database: cliConfig.database ?? 'none',
        playwright: cliConfig.playwright ?? false,
        cloudTools: cliConfig.cloudTools ?? [],
        devTools: cliConfig.devTools ?? [],
        observability: cliConfig.observability ?? [],
        outputPath: cliConfig.outputPath ?? './.devcontainer',
        portOffset: cliConfig.portOffset,
      };
      
      console.log('\n' + boxen(
        chalk.bold('Running in non-interactive mode'),
        { padding: 0.5, borderColor: 'blue', borderStyle: 'round' }
      ));
    } else {
      // Interactive mode
      answers = await runQuestionnaire();
    }

    // Show configuration summary
    const summaryLines = [
      chalk.bold.white('Configuration Summary\n'),
      chalk.cyan('Base:            ') + chalk.white(answers.stack),
    ];

    if (answers.language && answers.language.length > 0) {
      summaryLines.push(chalk.cyan('Languages:       ') + chalk.white(answers.language.join(', ')));
    }

    summaryLines.push(
      chalk.cyan('Database:        ') + chalk.white(answers.database),
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
