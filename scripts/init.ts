#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import { select, checkbox, input } from '@inquirer/prompts';
import yaml from 'js-yaml';
import type { QuestionnaireAnswers, Stack, BaseImage, LanguageOverlay, Database, CloudTool, DevTool, ObservabilityTool } from '../tool/schema/types';
import { composeDevContainer } from '../tool/questionnaire/composer';

interface OverlayMetadata {
  id: string;
  name: string;
  description: string;
  category: string;
  order?: number;
  image?: string | null;
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
  // and "../tool/overlays.yml" resolves to "<root>/tool/overlays.yml".
  path.join(__dirname, '..', 'tool', 'overlays.yml'),
  // When running from compiled JS in "dist/scripts", __dirname is "<root>/dist/scripts"
  // and "../../tool/overlays.yml" resolves to "<root>/tool/overlays.yml".
  path.join(__dirname, '..', '..', 'tool', 'overlays.yml'),
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

    // Question 3: All overlays in one multi-select (filtered by stack compatibility)
    const allOverlays = [
      ...config.language_overlays.map(o => ({ ...o, category: 'Language' })),
      ...config.database_overlays.map(o => ({ ...o, category: 'Database' })),
      ...config.observability_overlays.map(o => ({ ...o, category: 'Observability' })),
      ...config.cloud_tool_overlays.map(o => ({ ...o, category: 'Cloud Tools' })),
      ...config.dev_tool_overlays.map(o => ({ ...o, category: 'Dev Tools' })),
    ].filter((overlay: any) => {
      // Filter by supports field: empty array = all templates, otherwise must include selected stack
      return !overlay.supports || overlay.supports.length === 0 || overlay.supports.includes(stack);
    });

    const selectedOverlays = await checkbox({
      message: 'Select overlays to include (optional):',
      choices: allOverlays.map(overlay => ({
        name: `[${overlay.category}] ${overlay.name}`,
        value: overlay.id,
        description: overlay.description
      }))
    });

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
