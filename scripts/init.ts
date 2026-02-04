#!/usr/bin/env node

import * as fs from 'fs';
import * as path from 'path';
import * as readline from 'readline';
import { Command } from 'commander';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import type { QuestionnaireAnswers, Stack, Database, CloudTool } from '../tool/schema/types';
import { composeDevContainer } from '../tool/questionnaire/composer';

const TEMPLATES_DIR = path.join(__dirname, '..', 'templates');

/**
 * CLI questionnaire using readline with colored prompts
 */
async function ask(question: string, rl: readline.Interface): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function runQuestionnaire(): Promise<QuestionnaireAnswers> {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
  });

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
  
  console.log(chalk.dim('This tool will guide you through creating a devcontainer.'));
  console.log(chalk.dim('Answer 5-8 quick questions to get a working setup.\n'));

  try {
    // Question 1: Stack/Language
    console.log(chalk.bold.cyan('1️⃣  Which stack/language are you using?'));
    console.log(chalk.gray('   1)') + ' .NET');
    console.log(chalk.gray('   2)') + ' Node.js + TypeScript');
    console.log(chalk.gray('   3)') + ' Python (MkDocs)');
    console.log(chalk.gray('   4)') + ' Fullstack');
    const stackChoice = await ask(chalk.yellow('   Choice [1-4]: '), rl);
    
    const stackMap: Record<string, Stack> = {
      '1': 'dotnet',
      '2': 'node-typescript',
      '3': 'python-mkdocs',
      '4': 'fullstack',
    };
    const stack = stackMap[stackChoice] || 'dotnet';
    console.log(chalk.green('   ✓') + chalk.dim(` Selected: ${stack}\n`));

    // Question 2: Docker-in-Docker
    const dockerAnswer = await ask(chalk.bold.cyan('2️⃣  Do you need Docker-in-Docker') + chalk.dim(' (build containers from inside)?') + chalk.yellow(' [y/N]: '), rl);
    const needsDocker = dockerAnswer.toLowerCase() === 'y' || dockerAnswer.toLowerCase() === 'yes';
    console.log(chalk.green('   ✓') + chalk.dim(` ${needsDocker ? 'Enabled' : 'Disabled'}\n`));

    // Question 3: Database
    console.log(chalk.bold.cyan('3️⃣  Do you need a database?'));
    console.log(chalk.gray('   1)') + ' None');
    console.log(chalk.gray('   2)') + ' PostgreSQL');
    console.log(chalk.gray('   3)') + ' Redis');
    console.log(chalk.gray('   4)') + ' PostgreSQL + Redis');
    const dbChoice = await ask(chalk.yellow('   Choice [1-4]: '), rl);
    
    const dbMap: Record<string, Database> = {
      '1': 'none',
      '2': 'postgres',
      '3': 'redis',
      '4': 'postgres+redis',
    };
    const database = dbMap[dbChoice] || 'none';
    console.log(chalk.green('   ✓') + chalk.dim(` Selected: ${database}\n`));

    // Question 4: Playwright
    const playwrightAnswer = await ask(chalk.bold.cyan('4️⃣  Do you need browser automation') + chalk.dim(' (Playwright)?') + chalk.yellow(' [y/N]: '), rl);
    const playwright = playwrightAnswer.toLowerCase() === 'y' || playwrightAnswer.toLowerCase() === 'yes';
    console.log(chalk.green('   ✓') + chalk.dim(` ${playwright ? 'Enabled' : 'Disabled'}\n`));

    // Question 5: Cloud tools
    console.log(chalk.bold.cyan('5️⃣  Which cloud/orchestration tools do you need?') + chalk.dim(' (comma-separated)'));
    console.log(chalk.gray('   -') + ' azure-cli');
    console.log(chalk.gray('   -') + ' kubectl-helm');
    console.log(chalk.gray('   -') + chalk.dim(' (leave empty for none)'));
    const toolsAnswer = await ask(chalk.yellow('   Tools: '), rl);
    const cloudTools: CloudTool[] = toolsAnswer
      .split(',')
      .map(t => t.trim())
      .filter(t => t === 'azure-cli' || t === 'kubectl-helm') as CloudTool[];
    console.log(chalk.green('   ✓') + chalk.dim(` ${cloudTools.length > 0 ? cloudTools.join(', ') : 'None'}\n`));

    // Question 6: Output path
    const outputAnswer = await ask(chalk.bold.cyan('6️⃣  Output path') + chalk.dim(' [./.devcontainer]: '), rl);
    const outputPath = outputAnswer || './.devcontainer';
    console.log(chalk.green('   ✓') + chalk.dim(` ${outputPath}\n`));

    rl.close();

    return {
      stack,
      needsDocker,
      database,
      playwright,
      cloudTools,
      outputPath,
    };
  } catch (error) {
    rl.close();
    throw error;
  }
}

async function parseCliArgs(): Promise<Partial<QuestionnaireAnswers> | null> {
  const program = new Command();
  
  program
    .name('container-superposition')
    .description('Initialize a devcontainer with guided questions or CLI flags')
    .version('0.1.0')
    .option('--stack <type>', 'Base template: dotnet, node-typescript, python-mkdocs, fullstack')
    .option('--dind, --docker', 'Enable Docker-in-Docker')
    .option('--db <type>', 'Database: postgres, redis, postgres+redis, none')
    .option('--postgres', 'Shorthand for --db postgres')
    .option('--redis', 'Shorthand for --db redis')
    .option('--playwright', 'Include Playwright browser automation')
    .option('--cloud-tools <list>', 'Comma-separated: azure-cli, kubectl-helm')
    .option('-o, --output <path>', 'Output path (default: ./.devcontainer)')
    .parse(process.argv);

  const options = program.opts();
  
  // If no options provided, return null to trigger interactive mode
  if (Object.keys(options).length === 0) {
    return null;
  }

  const config: Partial<QuestionnaireAnswers> = {};

  if (options.stack) config.stack = options.stack as Stack;
  if (options.dind || options.docker) config.needsDocker = true;
  if (options.postgres) config.database = 'postgres';
  if (options.redis) config.database = 'redis';
  if (options.db) config.database = options.db as Database;
  if (options.playwright) config.playwright = true;
  if (options.cloudTools) {
    config.cloudTools = options.cloudTools.split(',').map((t: string) => t.trim()) as CloudTool[];
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
        needsDocker: cliConfig.needsDocker ?? false,
        database: cliConfig.database ?? 'none',
        playwright: cliConfig.playwright ?? false,
        cloudTools: cliConfig.cloudTools ?? [],
        outputPath: cliConfig.outputPath ?? './.devcontainer',
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
    console.log('\n' + boxen(
      chalk.bold.white('Configuration Summary\n\n') +
      chalk.cyan('Stack:           ') + chalk.white(answers.stack) + '\n' +
      chalk.cyan('Docker-in-Docker: ') + chalk.white(answers.needsDocker ? 'Yes' : 'No') + '\n' +
      chalk.cyan('Database:        ') + chalk.white(answers.database) + '\n' +
      chalk.cyan('Playwright:      ') + chalk.white(answers.playwright ? 'Yes' : 'No') + '\n' +
      chalk.cyan('Cloud tools:     ') + chalk.white(answers.cloudTools.length > 0 ? answers.cloudTools.join(', ') : 'None') + '\n' +
      chalk.cyan('Output:          ') + chalk.white(answers.outputPath),
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
      chalk.gray('  3. Rebuild container: ') + chalk.cyan('Cmd/Ctrl+Shift+P') + chalk.gray(' → "Dev Containers: Rebuild"\n\n') +
      chalk.dim('The generated configuration is fully editable and not tied to this tool.'),
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
