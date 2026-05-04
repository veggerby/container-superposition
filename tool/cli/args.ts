import chalk from 'chalk';
import { Command } from 'commander';
import type {
    QuestionnaireAnswers,
    Stack,
    LanguageOverlay,
    DatabaseOverlay,
    CloudTool,
    DevTool,
    ObservabilityTool,
    DeploymentTarget,
} from '../schema/types.js';
import { getToolVersion } from '../utils/version.js';
import { listCommand } from '../commands/list.js';
import { explainCommand } from '../commands/explain.js';
import { planCommand } from '../commands/plan.js';
import { doctorCommand } from '../commands/doctor.js';
import { adoptCommand } from '../commands/adopt.js';
import { hashCommand } from '../commands/hash.js';
import { migrateCommand } from '../commands/migrate.js';
import { loadOverlaysConfigWrapper, OVERLAYS_DIR } from '../questionnaire/questionnaire.js';

export interface CliArgs {
    commandName?: 'init' | 'regen';
    config: Partial<QuestionnaireAnswers>;
    manifestPath?: string;
    fromProject?: boolean;
    projectRoot?: string;
    backupOverride?: boolean;
    backupDir?: string;
    yes?: boolean;
    noInteractive?: boolean;
    writeManifestOnly?: boolean;
    noScaffold?: boolean;
}

/**
 * Parse CLI arguments and dispatch sub-commands that exit immediately.
 * Returns CliArgs for init/regen, or null if another command handled the request.
 */
export async function parseCliArgs(): Promise<CliArgs | null> {
    const program = new Command();

    let initOptions: any = null;

    program
        .name('container-superposition')
        .description('Composable devcontainer scaffolds')
        .version(getToolVersion());

    // Init command (default)
    program
        .command('init', { isDefault: true })
        .description('Initialize a new devcontainer configuration')
        .option('--from-project', 'Load configuration from the repository project file')
        .option(
            '--project-root <path>',
            'Run project-file and manifest discovery relative to a different repository root'
        )
        .option(
            '--from-manifest <path>',
            'Load configuration from existing superposition.json manifest'
        )
        .option('--no-interactive', 'Use persisted input values directly without questionnaire')
        .option(
            '--backup',
            'Force or suppress backup; default is --no-backup inside a git repo, --backup outside'
        )
        .option('--backup-dir <path>', 'Custom backup directory location')
        .option('--stack <type>', 'Base template: plain, compose')
        .option(
            '--language <list>',
            'Comma-separated language overlays: dotnet, nodejs, python, mkdocs, java, go, rust, bun, powershell'
        )
        .option(
            '--database <list>',
            'Comma-separated database overlays: postgres, redis, mongodb, mysql, sqlserver, sqlite, minio, rabbitmq, redpanda, nats'
        )
        .option(
            '--observability <list>',
            'Comma-separated: otel-collector, jaeger, prometheus, grafana, loki'
        )
        .option('--playwright', 'Include Playwright browser automation')
        .option(
            '--cloud-tools <list>',
            'Comma-separated: aws-cli, azure-cli, gcloud, kubectl-helm, terraform, pulumi'
        )
        .option(
            '--dev-tools <list>',
            'Comma-separated: docker-in-docker, docker-sock, playwright, codex, git-helpers, pre-commit, commitlint, just, direnv, modern-cli-tools, ngrok'
        )
        .option(
            '--port-offset <number>',
            'Add offset to all exposed ports (e.g., 100 makes Grafana 3100 instead of 3000)'
        )
        .option(
            '--target <environment>',
            'Deployment target: local (default), codespaces (adds hostRequirements + CODESPACES.md), gitpod (adds .gitpod.yml + GITPOD.md), devpod (adds devpod.yaml + DEVPOD.md)',
            'local'
        )
        .option('--minimal', 'Minimal mode - exclude optional/nice-to-have features and extensions')
        .option('--editor <profile>', 'Editor profile: vscode (default), jetbrains, none', 'vscode')
        .option('-o, --output <path>', 'Output path (default: ./.devcontainer)')
        .option(
            '--write-manifest-only',
            'Generate only superposition.json manifest without creating .devcontainer/ files'
        )
        .option('--no-scaffold', 'Write only superposition.yml; skip .devcontainer/ generation')
        .option('--preset <id>', 'Start from a preset (e.g., web-api, microservice)')
        .option(
            '--preset-param <value>',
            'Set a preset parameter value (format: key=value, can be repeated)',
            (value: string, previous: string[]) => previous.concat([value]),
            [] as string[]
        )
        .option(
            '--param <value>',
            'Set an overlay parameter value (format: KEY=value, can be repeated)',
            (value: string, previous: string[]) => previous.concat([value]),
            [] as string[]
        )
        .action((options, command) => {
            initOptions = {
                ...options,
                commandName: 'init',
                _targetSource: command.getOptionValueSource('target'),
                _editorSource: command.getOptionValueSource('editor'),
            };
        });

    // Regen command
    program
        .command('regen')
        .description(
            'Regenerate devcontainer from a project file or existing superposition.json manifest'
        )
        .option('--from-project', 'Load configuration from the repository project file')
        .option(
            '--project-root <path>',
            'Run project-file and manifest discovery relative to a different repository root'
        )
        .option(
            '--from-manifest <path>',
            '(Deprecated) Load from superposition.json; use `cs migrate` to create a project file first'
        )
        .option('-o, --output <path>', 'Output path (default: ./.devcontainer)')
        .option(
            '--backup',
            'Force or suppress backup; default is --no-backup inside a git repo, --backup outside'
        )
        .option('--backup-dir <path>', 'Custom backup directory location')
        .option('--minimal', 'Minimal mode - exclude optional/nice-to-have features and extensions')
        .option('--editor <profile>', 'Editor profile: vscode (default), jetbrains, none', 'vscode')
        .option(
            '--param <value>',
            'Override an overlay parameter value (format: KEY=value, can be repeated)',
            (value: string, previous: string[]) => previous.concat([value]),
            [] as string[]
        )
        .action((options, command) => {
            initOptions = {
                ...options,
                commandName: 'regen',
                interactive: false,
                _editorSource: command.getOptionValueSource('editor'),
            };
        });

    program
        .command('list')
        .description('List available overlays and presets')
        .option(
            '--category <type>',
            'Filter by category: language, database, observability, cloud, dev, preset'
        )
        .option('--tags <list>', 'Filter by tags (comma-separated)')
        .option('--supports <stack>', 'Filter by stack support: plain, compose')
        .option('--json', 'Output as JSON for scripting')
        .action(async (options) => {
            const overlaysConfig = loadOverlaysConfigWrapper();
            await listCommand(overlaysConfig, options);
            process.exit(0);
        });

    // Explain command
    program
        .command('explain <overlay>')
        .description('Show detailed information about an overlay')
        .option('--json', 'Output as JSON for scripting')
        .action(async (overlayId, options) => {
            const overlaysConfig = loadOverlaysConfigWrapper();
            await explainCommand(overlaysConfig, OVERLAYS_DIR, overlayId, options);
            process.exit(0);
        });

    // Plan command
    program
        .command('plan')
        .description('Preview what will be generated before creating devcontainer')
        .option('--stack <type>', 'Base template: plain, compose')
        .option('--overlays <list>', 'Comma-separated list of overlay IDs')
        .option(
            '--from-manifest <path>',
            'Load stack and overlays from an existing superposition.json manifest'
        )
        .option(
            '--port-offset <number>',
            'Add offset to all exposed ports',
            (val) => parseInt(val, 10),
            0
        )
        .option(
            '-o, --output <path>',
            'Compare against existing config at this path (default: ./.devcontainer)'
        )
        .option('--diff', 'Compare planned output vs existing configuration')
        .option('--diff-format <format>', 'Diff output format: color (default), json', 'color')
        .option(
            '--diff-context <lines>',
            'Context lines in diff output',
            (val) => parseInt(val, 10),
            3
        )
        .option('--verbose', 'Explain why each overlay was included in the resolved plan')
        .option('--json', 'Output as JSON for scripting')
        .action(async (options) => {
            const overlaysConfig = loadOverlaysConfigWrapper();
            await planCommand(overlaysConfig, OVERLAYS_DIR, options);
            process.exit(0);
        });

    // Doctor command
    program
        .command('doctor')
        .description('Check environment and validate configuration')
        .option('-o, --output <path>', 'Devcontainer path to validate (default: ./.devcontainer)')
        .option(
            '--from-manifest <path>',
            'Load configuration from an existing superposition.json manifest'
        )
        .option('--from-project', 'Load configuration from the repository project file')
        .option(
            '--project-root <path>',
            'Run project-file and manifest discovery relative to a different repository root'
        )
        .option('--fix', 'Apply automatic fixes where possible')
        .option('--json', 'Output as JSON for scripting')
        .action(async (options) => {
            const overlaysConfig = loadOverlaysConfigWrapper();
            await doctorCommand(overlaysConfig, OVERLAYS_DIR, options);
        });

    // Adopt command
    program
        .command('adopt')
        .description(
            'Analyse an existing .devcontainer/ and suggest an equivalent overlay-based configuration'
        )
        .option(
            '-d, --dir <path>',
            'Path to the existing .devcontainer directory (default: ./.devcontainer)'
        )
        .option('--dry-run', 'Print analysis and suggested command only; no files written')
        .option(
            '--force',
            'Overwrite existing adopt outputs if present (project file, superposition.json, custom patches)'
        )
        .option(
            '--backup',
            'Force backup creation even when inside a git repo (default: backup only outside git repos)'
        )
        .option('--no-backup', 'Disable backup creation even when it would normally be performed')
        .option('--backup-dir <path>', 'Custom backup directory location')
        .option(
            '--project-file',
            '(deprecated) Write a repository-root project config. Project file output is now standard; this flag is a no-op.'
        )
        .option('--json', 'Output as JSON for scripting')
        .action(async (options) => {
            if (options.projectFile) {
                console.warn(
                    chalk.yellow(
                        '⚠ --project-file is deprecated on `adopt`: project file output is now the standard output model. The flag has no additional effect and will be removed in a future version.'
                    )
                );
            }
            const overlaysConfig = loadOverlaysConfigWrapper();
            await adoptCommand(overlaysConfig, OVERLAYS_DIR, options);
            process.exit(0);
        });

    // Hash command
    program
        .command('hash')
        .description('Compute a deterministic fingerprint for a given configuration')
        .option('--stack <type>', 'Base template: plain, compose')
        .option('--overlays <list>', 'Comma-separated list of overlay IDs')
        .option('--preset <id>', 'Preset ID (optional)')
        .option('--base <image>', 'Base image / distro variant (e.g. bookworm, alpine)')
        .option('--manifest <path>', 'Path to superposition.json manifest')
        .option('-o, --output <path>', 'Directory to write hash file (used with --write)')
        .option('--write', 'Write hash to .devcontainer/superposition.hash')
        .option('--json', 'Output as JSON for scripting')
        .action(async (options) => {
            const overlaysConfig = loadOverlaysConfigWrapper();
            await hashCommand(overlaysConfig, OVERLAYS_DIR, options);
            process.exit(0);
        });

    // Migrate command
    program
        .command('migrate')
        .description(
            'Create a superposition.yml project file from an existing superposition.json manifest'
        )
        .option(
            '--from-manifest <path>',
            'Path to superposition.json (default: auto-discover in .devcontainer/ or repository root)'
        )
        .option(
            '--output <path>',
            'Output path for project file (default: .superposition.yml or existing file path)'
        )
        .option('--force', 'Overwrite existing project file if present')
        .action(async (options) => {
            await migrateCommand(options);
        });

    await program.parseAsync(process.argv);

    if (!initOptions) {
        return null;
    }

    if (Object.keys(initOptions).length === 0) {
        return null;
    }

    const hasSourceFlags =
        Number(Boolean(initOptions.fromProject)) + Number(Boolean(initOptions.fromManifest));
    if (hasSourceFlags > 1) {
        console.error(
            chalk.red('✗ Error: --from-project and --from-manifest cannot be used together')
        );
        process.exit(1);
    }

    const sourceSelectionConflicts = [
        'stack',
        'language',
        'database',
        'observability',
        'playwright',
        'cloudTools',
        'devTools',
        'portOffset',
        'preset',
    ];
    const hasPresetParams =
        Array.isArray(initOptions.presetParam) && (initOptions.presetParam as string[]).length > 0;
    const conflictingSelectionFlags = sourceSelectionConflicts.filter(
        (key) => initOptions[key] !== undefined && initOptions[key] !== false
    );
    if (
        (initOptions.fromProject || initOptions.fromManifest) &&
        (conflictingSelectionFlags.length > 0 || hasPresetParams)
    ) {
        const conflicts = [...conflictingSelectionFlags.map((key) => `--${key}`)];
        if (hasPresetParams) {
            conflicts.push('--preset-param');
        }
        console.error(
            chalk.red(
                `✗ Error: Persisted input sources cannot be combined with clean-generation selection flags: ${conflicts.join(', ')}`
            )
        );
        console.error(
            chalk.dim(
                '  Choose either a persisted input source (--from-project or --from-manifest) or direct selection flags for that run.'
            )
        );
        process.exit(1);
    }

    const config: Partial<QuestionnaireAnswers> = {};

    if (initOptions.stack) config.stack = initOptions.stack as Stack;
    if (initOptions.language) {
        config.language = initOptions.language
            .split(',')
            .map((l: string) => l.trim()) as LanguageOverlay[];
    }
    if (initOptions.database) {
        config.database = initOptions.database
            .split(',')
            .map((d: string) => d.trim()) as DatabaseOverlay[];
    }
    if (initOptions.observability) {
        config.observability = initOptions.observability
            .split(',')
            .map((t: string) => t.trim()) as ObservabilityTool[];
    }
    if (initOptions.playwright) config.playwright = true;
    if (initOptions.cloudTools) {
        config.cloudTools = initOptions.cloudTools
            .split(',')
            .map((t: string) => t.trim()) as CloudTool[];
    }
    if (initOptions.devTools) {
        config.devTools = initOptions.devTools.split(',').map((t: string) => t.trim()) as DevTool[];
    }
    if (initOptions.portOffset) {
        config.portOffset = parseInt(initOptions.portOffset, 10);
    }
    if (initOptions.target && initOptions._targetSource !== 'default') {
        config.target = initOptions.target as DeploymentTarget;
    }
    if (initOptions.minimal) {
        config.minimal = true;
    }
    if (initOptions.editor && initOptions._editorSource !== 'default') {
        const editorLower = initOptions.editor.toLowerCase();
        if (['vscode', 'jetbrains', 'none'].includes(editorLower)) {
            config.editor = editorLower as 'vscode' | 'jetbrains' | 'none';
        } else {
            console.warn(
                chalk.yellow(
                    `⚠️  Invalid editor profile: ${initOptions.editor}, using default (vscode)`
                )
            );
            config.editor = 'vscode';
        }
    }
    if (initOptions.output) config.outputPath = initOptions.output;

    if (initOptions.preset) {
        config.preset = initOptions.preset as string;
    }

    if (initOptions.presetParam && (initOptions.presetParam as string[]).length > 0) {
        if (!initOptions.preset) {
            console.warn(
                chalk.yellow(
                    '⚠️  Ignoring --preset-param because no --preset was provided. ' +
                        'Preset parameters only apply when a preset is selected (e.g., --preset web-api --preset-param broker=nats).'
                )
            );
        } else {
            const presetChoices: Record<string, string> = {};
            for (const param of initOptions.presetParam as string[]) {
                const eqIdx = param.indexOf('=');
                if (eqIdx > 0) {
                    const key = param.slice(0, eqIdx).trim();
                    const value = param.slice(eqIdx + 1).trim();
                    if (key) {
                        presetChoices[key] = value;
                    }
                } else {
                    console.warn(
                        chalk.yellow(
                            `⚠️  Invalid --preset-param format: "${param}". Expected "key=value" (e.g., --preset-param broker=nats).`
                        )
                    );
                }
            }
            if (Object.keys(presetChoices).length > 0) {
                config.presetChoices = presetChoices;
            }
        }
    }

    if (initOptions.param && (initOptions.param as string[]).length > 0) {
        const overlayParameters: Record<string, string> = {};
        for (const param of initOptions.param as string[]) {
            const eqIdx = param.indexOf('=');
            if (eqIdx > 0) {
                const key = param.slice(0, eqIdx).trim();
                const value = param.slice(eqIdx + 1).trim();
                if (key) {
                    overlayParameters[key] = value;
                }
            } else {
                console.warn(
                    chalk.yellow(
                        `⚠️  Invalid --param format: "${param}". Expected "KEY=value" (e.g., --param POSTGRES_DB=myapp).`
                    )
                );
            }
        }
        if (Object.keys(overlayParameters).length > 0) {
            config.overlayParameters = overlayParameters;
        }
    }

    return {
        commandName: initOptions.commandName,
        config,
        manifestPath: initOptions.fromManifest,
        fromProject: initOptions.fromProject === true,
        projectRoot: initOptions.projectRoot,
        backupOverride: initOptions.backup,
        backupDir: initOptions.backupDir,
        noInteractive: initOptions.interactive === false,
        writeManifestOnly: initOptions.writeManifestOnly === true,
        noScaffold: initOptions.scaffold === false,
    };
}
