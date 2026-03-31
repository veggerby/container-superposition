import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import { loadManifest } from '../schema/manifest-migrations.js';
import { buildAnswersFromManifest } from '../schema/project-config.js';
import { mergeAnswers } from '../questionnaire/answers.js';
import {
    findProjectConfig,
    buildProjectConfigSelectionFromAnswers,
    writeProjectConfig,
} from '../schema/project-config.js';
import { loadOverlaysConfigWrapper } from '../questionnaire/questionnaire.js';

export interface MigrateOptions {
    fromManifest?: string;
    output?: string;
    force?: boolean;
}

export async function migrateCommand(options: MigrateOptions): Promise<void> {
    const manifestSearchPaths = options.fromManifest
        ? [options.fromManifest]
        : [
              'superposition.json',
              '.devcontainer/superposition.json',
              path.join(process.cwd(), 'superposition.json'),
              path.join(process.cwd(), '.devcontainer', 'superposition.json'),
          ];

    let manifestPath: string | null = null;
    for (const searchPath of manifestSearchPaths) {
        const resolvedPath = path.resolve(searchPath);
        if (fs.existsSync(resolvedPath)) {
            manifestPath = resolvedPath;
            break;
        }
    }

    if (!manifestPath) {
        console.error(chalk.red('✗ Error: No superposition.json manifest found'));
        console.error(
            chalk.gray('  Searched in: superposition.json, .devcontainer/superposition.json')
        );
        console.error(
            chalk.dim('  Use --from-manifest <path> to specify the manifest location explicitly.')
        );
        process.exit(1);
    }

    const manifestDir = path.dirname(manifestPath);
    const loadedManifest = loadManifest(manifestPath);
    if (!loadedManifest) {
        process.exit(1);
    }

    let projectFilePath: string;
    if (options.output) {
        projectFilePath = path.resolve(options.output);
    } else {
        const discovered = findProjectConfig(process.cwd());
        if (discovered.length > 1) {
            console.error(
                chalk.red(
                    '✗ Found both supported project config files (.superposition.yml and superposition.yml) in the repository root. Keep only one, or use --output to specify the target path.'
                )
            );
            process.exit(1);
        }
        projectFilePath = discovered[0]?.path ?? path.join(process.cwd(), '.superposition.yml');
    }

    if (fs.existsSync(projectFilePath) && !options.force) {
        console.error(
            chalk.red(
                `✗ Project file already exists: ${path.relative(process.cwd(), projectFilePath)}`
            )
        );
        console.error(chalk.gray('  Use --force to overwrite the existing project file.'));
        process.exit(1);
    }

    const relativeManifestDir = path.relative(process.cwd(), manifestDir);
    const portableManifestDir = relativeManifestDir.startsWith('.')
        ? relativeManifestDir
        : `./${relativeManifestDir}`;
    const migrateOverlaysConfig = loadOverlaysConfigWrapper();
    const manifestAnswers = buildAnswersFromManifest(
        loadedManifest,
        migrateOverlaysConfig,
        portableManifestDir
    );
    const answers = mergeAnswers(manifestAnswers);
    const projectSelection = buildProjectConfigSelectionFromAnswers(answers);

    writeProjectConfig(projectFilePath, projectSelection);

    console.log(
        chalk.green(`✓ Project file created: ${path.relative(process.cwd(), projectFilePath)}`)
    );
    console.log(
        chalk.dim(
            '  Run `cs regen` (or `npx container-superposition regen`) to regenerate your devcontainer.'
        )
    );
    process.exit(0);
}
