import * as fs from 'fs';
import * as path from 'path';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import type { QuestionnaireAnswers, SuperpositionManifest } from '../schema/types.js';
import { composeDevContainer, generateManifestOnly } from '../questionnaire/composer.js';
import { loadManifest } from '../schema/manifest-migrations.js';
import { printSummary } from '../utils/summary.js';
import {
    buildAnswersFromManifest,
    buildAnswersFromProjectConfig,
    buildProjectConfigSelectionFromAnswers,
    findManifestFile,
    findDefaultRegenManifest,
    findProjectConfig,
    loadProjectConfig,
    writeProjectConfig,
    writeProjectConfigCustomizations,
} from '../schema/project-config.js';
import { isInsideGitRepo, createBackup, ensureBackupPatternsInGitignore } from '../utils/backup.js';
import { buildAnswersFromCliArgs, mergeAnswers } from '../questionnaire/answers.js';
import { applyPresetSelections } from '../questionnaire/presets.js';
import {
    runQuestionnaire,
    loadOverlaysConfigWrapper,
    PRESETS_DIR,
} from '../questionnaire/questionnaire.js';
import { parseCliArgs } from './args.js';

export async function main(): Promise<void> {
    try {
        const cliArgs = await parseCliArgs();
        const initialCwd = process.cwd();

        if (cliArgs?.projectRoot) {
            const resolvedProjectRoot = path.resolve(initialCwd, cliArgs.projectRoot);

            if (!fs.existsSync(resolvedProjectRoot)) {
                console.error(chalk.red(`✗ Project root not found: ${resolvedProjectRoot}`));
                process.exit(1);
            }

            if (!fs.statSync(resolvedProjectRoot).isDirectory()) {
                console.error(
                    chalk.red(`✗ Project root is not a directory: ${resolvedProjectRoot}`)
                );
                process.exit(1);
            }

            process.chdir(resolvedProjectRoot);
        }

        let projectFileOutputPath: string | undefined;
        let existingProjectFileDetected = false;
        if (cliArgs?.commandName === 'init' || cliArgs?.commandName === undefined) {
            const discoveredProjectFiles = findProjectConfig(process.cwd());
            if (discoveredProjectFiles.length > 1) {
                console.error(
                    chalk.red(
                        '✗ Found both .superposition.yml and superposition.yml in the repository root. Keep only one.'
                    )
                );
                console.error(
                    chalk.gray(
                        '  Recommended: keep .superposition.yml (dotfile) to keep the root tidy; delete superposition.yml.'
                    )
                );
                process.exit(1);
            }
            if (discoveredProjectFiles.length === 1) {
                existingProjectFileDetected = true;
            }
            projectFileOutputPath =
                discoveredProjectFiles[0]?.path ?? path.join(process.cwd(), '.superposition.yml');
        }

        let projectConfig = undefined;
        let projectConfigAnswers: Partial<QuestionnaireAnswers> | undefined;

        if (!cliArgs?.manifestPath) {
            const overlaysConfigForProject = loadOverlaysConfigWrapper();
            projectConfig = loadProjectConfig(overlaysConfigForProject, process.cwd()) ?? undefined;
            if (projectConfig) {
                projectConfigAnswers = await applyPresetSelections(
                    buildAnswersFromProjectConfig(
                        projectConfig.selection,
                        overlaysConfigForProject
                    ),
                    overlaysConfigForProject,
                    PRESETS_DIR
                );
            }
        }

        let manifest: SuperpositionManifest | undefined;
        let manifestDir: string | undefined;
        let backupDir: string | undefined;
        let useManifestOnly = false;
        let useProjectOnly = false;

        if (cliArgs?.commandName === 'regen' && !cliArgs.manifestPath && !cliArgs.fromProject) {
            if (projectConfigAnswers) {
                useProjectOnly = true;
            } else {
                const discoveredManifestPath = findDefaultRegenManifest(
                    cliArgs?.config?.outputPath || './.devcontainer'
                );
                if (discoveredManifestPath) {
                    console.error(chalk.red('✗ Error: No project file found'));
                    console.error(
                        chalk.cyan(
                            '  Found superposition.json but no superposition.yml project file.'
                        )
                    );
                    console.error(
                        chalk.gray(
                            '  Run `cs migrate` to create a project file from your existing manifest, then run `regen` again.'
                        )
                    );
                } else {
                    console.error(chalk.red('✗ Error: No project file found'));
                    console.error(
                        chalk.gray(
                            '  Create .superposition.yml or superposition.yml in your repository root.'
                        )
                    );
                    console.error(
                        chalk.dim('  Or run `cs init` to create a new configuration interactively.')
                    );
                }
                process.exit(1);
            }
        }

        if (cliArgs?.commandName === 'regen' && cliArgs?.manifestPath) {
            console.warn(
                chalk.yellow(
                    '⚠️  --from-manifest is deprecated for regen. Run `cs migrate` to create a project file, then use `regen` without this flag.'
                )
            );
        }

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

            if (cliArgs.backupDir) {
                backupDir = cliArgs.backupDir;
            }
            if (cliArgs.noInteractive) {
                useManifestOnly = true;
            }
        }

        if (cliArgs?.fromProject) {
            if (!projectConfigAnswers || !projectConfig) {
                console.error(chalk.red('✗ Could not find project file'));
                console.error(chalk.red('  Searched for: .superposition.yml, superposition.yml'));
                process.exit(1);
            }
            useProjectOnly = cliArgs.noInteractive || cliArgs.commandName === 'regen';
        }

        if (cliArgs?.noInteractive && !cliArgs?.manifestPath && !projectConfigAnswers) {
            console.error(chalk.red('✗ Error: --no-interactive requires persisted input'));
            console.error(
                chalk.dim(
                    '  Use --from-project or run from a repository with .superposition.yml or superposition.yml'
                )
            );
            process.exit(1);
        }

        const resolvedOutputPath =
            cliArgs?.config?.outputPath ||
            projectConfigAnswers?.outputPath ||
            manifestDir ||
            './.devcontainer';
        const backupCheckPath = path.resolve(resolvedOutputPath);
        const inGitRepo = isInsideGitRepo(backupCheckPath);
        let shouldBackup: boolean;
        if (cliArgs?.backupOverride === true) {
            shouldBackup = true;
        } else if (cliArgs?.backupOverride === false) {
            shouldBackup = false;
        } else {
            shouldBackup = !inGitRepo;
            if (!shouldBackup) {
                console.log(
                    chalk.dim(
                        'ℹ  Skipping backup — git repo detected (use --backup to force one)\n'
                    )
                );
            }
        }

        const isReplayMode = cliArgs?.commandName === 'regen' || useManifestOnly || useProjectOnly;

        let actualBackupPath: string | undefined;
        if (shouldBackup && isReplayMode) {
            const outputPath = resolvedOutputPath;
            const backupPath = await createBackup(outputPath, backupDir);
            if (backupPath) {
                actualBackupPath = backupPath;
                console.log(chalk.green(`✓ Backup created: ${backupPath}\n`));
                ensureBackupPatternsInGitignore(outputPath);
            }
        }

        const mainOverlaysConfig = loadOverlaysConfigWrapper();

        let answers: ReturnType<typeof mergeAnswers>;

        const hasCliOverrides =
            cliArgs &&
            Object.keys(cliArgs.config).some(
                (key) =>
                    key !== 'outputPath' &&
                    key !== 'preset' &&
                    key !== 'presetChoices' &&
                    !(key === 'target' && cliArgs.config.target === 'local') &&
                    !(key === 'editor' && cliArgs.config.editor === 'vscode') &&
                    cliArgs.config[key as keyof typeof cliArgs.config] !== undefined
            );
        const hasAnyCliConfig =
            cliArgs &&
            Object.entries(cliArgs.config).some(
                ([key, value]) =>
                    value !== undefined &&
                    !(key === 'target' && value === 'local') &&
                    !(key === 'editor' && value === 'vscode')
            );

        if (useManifestOnly && manifest && !hasCliOverrides) {
            const manifestAnswers = buildAnswersFromManifest(
                manifest,
                mainOverlaysConfig,
                manifestDir
            );
            answers = mergeAnswers(manifestAnswers);

            console.log(
                '\n' +
                    boxen(
                        chalk.bold.cyan('Regenerating from Manifest (No Interactive)\n\n') +
                            chalk.white('Configuration:\n') +
                            chalk.gray(`  Template: ${manifest.baseTemplate}\n`) +
                            chalk.gray(`  Base Image: ${manifest.baseImage}\n`) +
                            (manifest.containerName
                                ? chalk.gray(`  Container: ${manifest.containerName}\n`)
                                : '') +
                            chalk.gray(`  Overlays: ${manifest.overlays.join(', ')}\n`) +
                            (manifest.preset ? chalk.gray(`  Preset: ${manifest.preset}\n`) : '') +
                            (manifest.portOffset
                                ? chalk.gray(`  Port offset: ${manifest.portOffset}\n`)
                                : '') +
                            chalk.gray(`  Output: ${answers.outputPath}`),
                        { padding: 1, borderColor: 'cyan', borderStyle: 'round', margin: 1 }
                    )
            );
        } else if (useProjectOnly && projectConfigAnswers && !hasCliOverrides) {
            const projectFileName = projectConfig?.file.fileName ?? '.superposition.yml';
            answers = mergeAnswers(projectConfigAnswers, {
                outputPath:
                    cliArgs?.config?.outputPath ||
                    projectConfigAnswers.outputPath ||
                    './.devcontainer',
                minimal: cliArgs?.config?.minimal,
                editor: cliArgs?.config?.editor,
            });

            console.log(
                '\n' +
                    boxen(
                        chalk.bold.cyan('Regenerating from Project File (No Interactive)\n\n') +
                            chalk.white('Configuration:\n') +
                            chalk.gray(`  Project file: ${projectFileName}\n`) +
                            chalk.gray(`  Output: ${answers.outputPath}`),
                        {
                            padding: 1,
                            borderColor: 'cyan',
                            borderStyle: 'round',
                            margin: 1,
                        }
                    )
            );
        } else if (
            (cliArgs && (cliArgs.config.stack || hasCliOverrides)) ||
            (projectConfigAnswers && (cliArgs?.noInteractive || hasAnyCliConfig))
        ) {
            const cliAnswers = buildAnswersFromCliArgs(cliArgs.config);
            const manifestAnswers = manifest
                ? buildAnswersFromManifest(manifest, mainOverlaysConfig, manifestDir)
                : undefined;
            answers = mergeAnswers(projectConfigAnswers, manifestAnswers, cliAnswers, {
                outputPath:
                    cliAnswers.outputPath || projectConfigAnswers?.outputPath || './.devcontainer',
            });

            const modeLabel =
                useManifestOnly && hasCliOverrides
                    ? 'Regenerating from Manifest with Overrides'
                    : useProjectOnly && projectConfigAnswers
                      ? 'Regenerating from Project File with Overrides'
                      : projectConfigAnswers && !manifest
                        ? 'Running from Project Config'
                        : 'Running in CLI mode';

            console.log(
                '\n' +
                    boxen(chalk.bold(modeLabel), {
                        padding: 0.5,
                        borderColor: 'blue',
                        borderStyle: 'round',
                    })
            );

            if ((useManifestOnly || useProjectOnly) && hasCliOverrides) {
                const overrides: string[] = [];
                if (cliAnswers.minimal) overrides.push('minimal mode');
                if (cliAnswers.editor) overrides.push(`editor: ${cliAnswers.editor}`);
                if (overrides.length > 0) {
                    console.log(chalk.dim(`   Overrides: ${overrides.join(', ')}`));
                }
            }
        } else {
            const interactiveAnswers = await runQuestionnaire(
                manifest,
                manifestDir,
                cliArgs?.config.preset || projectConfigAnswers?.preset,
                cliArgs?.config.presetChoices || projectConfigAnswers?.presetChoices,
                projectConfigAnswers
            );
            answers = mergeAnswers(projectConfigAnswers, interactiveAnswers);
        }

        if (!manifest && projectConfig?.selection.customizations) {
            const materializedOutputPath = path.resolve(answers.outputPath);
            if (!fs.existsSync(materializedOutputPath)) {
                fs.mkdirSync(materializedOutputPath, { recursive: true });
            }
            writeProjectConfigCustomizations(
                materializedOutputPath,
                projectConfig.selection.customizations
            );
        }

        const summaryLines = [
            chalk.bold.white('Configuration Summary\n'),
            chalk.cyan('Base:            ') + chalk.white(answers.stack),
        ];

        if (answers.language && answers.language.length > 0) {
            summaryLines.push(
                chalk.cyan('Languages:       ') + chalk.white(answers.language.join(', '))
            );
        }

        if (answers.database && answers.database.length > 0) {
            summaryLines.push(
                chalk.cyan('Database:        ') + chalk.white(answers.database.join(', '))
            );
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

        if (projectConfig?.file && !manifest) {
            summaryLines.push(
                chalk.cyan('Project config:  ') + chalk.white(projectConfig.file.fileName)
            );
        }

        summaryLines.push(chalk.cyan('Output:          ') + chalk.white(answers.outputPath));

        console.log(
            '\n' +
                boxen(summaryLines.join('\n'), {
                    padding: 1,
                    borderColor: 'green',
                    borderStyle: 'round',
                    margin: { top: 0, bottom: 1 },
                })
        );

        if (existingProjectFileDetected && projectFileOutputPath) {
            const relPath = path.relative(process.cwd(), projectFileOutputPath);
            console.log(
                chalk.yellow(
                    `⚠ Existing project file will be updated: ${relPath}\n  Run \`cs regen\` instead to replay the existing configuration without changes.`
                )
            );
        }

        if (projectFileOutputPath) {
            try {
                const projectSelection = buildProjectConfigSelectionFromAnswers(answers);
                writeProjectConfig(projectFileOutputPath, projectSelection);
                console.log(
                    chalk.green(
                        `✓ Project config written: ${path.relative(process.cwd(), projectFileOutputPath)}`
                    )
                );
            } catch (projectFileError) {
                console.error(
                    chalk.yellow(
                        `⚠ Failed to write project config: ${projectFileError instanceof Error ? projectFileError.message : String(projectFileError)}`
                    )
                );
            }
        }

        const isManifestOnly = cliArgs?.writeManifestOnly === true || cliArgs?.noScaffold === true;

        const spinner = ora({
            text: isManifestOnly
                ? chalk.cyan('Generating manifest file...')
                : chalk.cyan('Generating devcontainer configuration...'),
            color: 'cyan',
        }).start();

        try {
            let summary;
            if (isManifestOnly) {
                summary = await generateManifestOnly(answers, undefined, {
                    isRegen: isReplayMode,
                });
                spinner.succeed(chalk.green('Manifest created successfully!'));
            } else {
                summary = await composeDevContainer(answers, undefined, { isRegen: isReplayMode });
                spinner.succeed(chalk.green('DevContainer created successfully!'));
            }

            if (actualBackupPath) {
                summary.backupPath = actualBackupPath;
            }

            printSummary(summary);
        } catch (error) {
            spinner.fail(
                chalk.red(
                    isManifestOnly ? 'Failed to create manifest' : 'Failed to create devcontainer'
                )
            );
            throw error;
        }
    } catch (error) {
        console.error(
            '\n' +
                boxen(
                    chalk.bold.red('Error\n\n') +
                        chalk.white(error instanceof Error ? error.message : String(error)),
                    { padding: 1, borderColor: 'red', borderStyle: 'round' }
                )
        );
        process.exit(1);
    }
}
