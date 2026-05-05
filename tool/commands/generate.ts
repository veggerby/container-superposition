/**
 * Generate command — AI-powered intent-driven environment scaffolding.
 *
 * Modes:
 *   from-scratch  — no existing superposition.yml (or --from-scratch flag)
 *   modify        — existing superposition.yml present
 *   scaffold      — any mode + --scaffold → also run composeDevContainer
 *   adopt         — any mode + --adopt → enrich with repo-scan signals
 */

import * as fs from 'fs';
import * as path from 'path';
import { fileURLToPath } from 'url';
import chalk from 'chalk';
import boxen from 'boxen';
import ora from 'ora';
import { confirm } from '@inquirer/prompts';

import type {
    OverlaysConfig,
    QuestionnaireAnswers,
    CompositionInput,
    BaseImage,
} from '../schema/types.js';
import { composeDevContainer } from '../questionnaire/composer.js';
import {
    writeProjectConfig,
    buildProjectConfigSelectionFromAnswers,
} from '../schema/project-config.js';
import { buildOverlayContextString, buildOverlayLookup } from '../ai/overlay-context.js';
import { extractIntent, extractDiff, MissingApiKeyError, AgentError } from '../ai/agent.js';
import { mapIntentToAnswers, applyDiffToAnswers, collectCurrentOverlayIds } from '../ai/mapper.js';
import type { EnvironmentIntent, ManifestDiff } from '../ai/intent.js';
import type { SelectionRationale } from '../ai/mapper.js';

// ─── Path resolution (works in both source and dist) ─────────────────────────

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ─── Types ────────────────────────────────────────────────────────────────────

export interface GenerateOptions {
    prompt: string;
    scaffold?: boolean;
    adopt?: boolean;
    fromScratch?: boolean;
    noInteractive?: boolean;
    output?: string;
    portOffset?: number;
    json?: boolean;
}

interface GenerateResult {
    mode: 'from-scratch' | 'modify';
    intent?: EnvironmentIntent;
    diff?: ManifestDiff;
    answers: QuestionnaireAnswers;
    unknownIds: string[];
    /** Structured explanation of why each overlay was selected or removed. */
    rationale: SelectionRationale[];
    manifestPath: string;
    scaffolded: boolean;
}

// ─── Repo signal scanner (for --adopt mode) ───────────────────────────────────

/**
 * Scan the project root for language/framework file signals and return a list
 * of likely overlay IDs. This is a heuristic best-effort scan — the LLM
 * enriches these signals with the user's prompt.
 */
function scanRepoSignals(projectRoot: string): string[] {
    const signals: string[] = [];

    const probe = (file: string) => fs.existsSync(path.join(projectRoot, file));

    // Node.js / Bun
    if (probe('package.json')) {
        try {
            const pkg = JSON.parse(fs.readFileSync(path.join(projectRoot, 'package.json'), 'utf8'));
            if (pkg.engines?.bun || Object.keys(pkg.devDependencies ?? {}).includes('bun')) {
                signals.push('bun');
            } else {
                signals.push('nodejs');
            }
        } catch {
            signals.push('nodejs');
        }
    }

    // Python
    if (
        probe('Pipfile') ||
        probe('pyproject.toml') ||
        probe('setup.py') ||
        probe('requirements.txt')
    ) {
        signals.push('python');
    }

    // .NET
    const csprojFiles = fs.existsSync(projectRoot)
        ? fs.readdirSync(projectRoot).filter((f) => f.endsWith('.csproj') || f.endsWith('.sln'))
        : [];
    if (csprojFiles.length > 0) {
        signals.push('dotnet');
    }

    // Go
    if (probe('go.mod')) {
        signals.push('go');
    }

    // Rust
    if (probe('Cargo.toml')) {
        signals.push('rust');
    }

    // Java
    if (probe('pom.xml') || probe('build.gradle') || probe('build.gradle.kts')) {
        signals.push('java');
    }

    // Docker
    if (probe('docker-compose.yml') || probe('docker-compose.yaml')) {
        signals.push('docker-sock');
    }

    return [...new Set(signals)];
}

// ─── Explainer output ─────────────────────────────────────────────────────────

function formatExplainerOutput(
    mode: 'from-scratch' | 'modify',
    intent: EnvironmentIntent | undefined,
    diff: ManifestDiff | undefined,
    unknownIds: string[],
    overlaysConfig: OverlaysConfig
): string {
    const lookup = buildOverlayLookup(overlaysConfig);
    const lines: string[] = [];

    if (mode === 'from-scratch' && intent) {
        lines.push(chalk.bold('Interpreted request as:'));
        const allIds = [
            ...(intent.language ?? []),
            ...(intent.services ?? []),
            ...(intent.tools ?? []),
            ...(intent.observability ?? []),
            ...(intent.cloudTools ?? []),
        ];
        if (allIds.length > 0) {
            for (const id of allIds) {
                const meta = lookup.get(id);
                lines.push(
                    chalk.green(`  • ${id}`) + (meta ? chalk.dim(` — ${meta.description}`) : '')
                );
            }
        } else {
            lines.push(chalk.dim('  (no overlays selected)'));
        }

        if (intent.stack) {
            lines.push(chalk.dim(`  Stack: ${intent.stack}`));
        }

        if (intent.goals && intent.goals.length > 0) {
            lines.push('');
            lines.push(chalk.bold('Goals mentioned:'));
            for (const g of intent.goals) {
                lines.push(chalk.dim(`  • ${g}`));
            }
        }
    } else if (mode === 'modify' && diff) {
        lines.push(chalk.bold('Interpreted request as:'));

        if (diff.addOverlays.length > 0) {
            for (const id of diff.addOverlays) {
                const meta = lookup.get(id);
                lines.push(
                    chalk.green(`  + ${id}`) + (meta ? chalk.dim(` — ${meta.description}`) : '')
                );
            }
        }

        if (diff.removeOverlays.length > 0) {
            for (const id of diff.removeOverlays) {
                lines.push(chalk.red(`  - ${id}`));
            }
        }

        if (diff.changeStack) {
            lines.push(chalk.cyan(`  Stack → ${diff.changeStack}`));
        }

        if (diff.changeBaseImage) {
            lines.push(chalk.cyan(`  Base image → ${diff.changeBaseImage}`));
        }

        if (diff.changeContainerName) {
            lines.push(chalk.cyan(`  Container name → ${diff.changeContainerName}`));
        }
    }

    if (unknownIds.length > 0) {
        lines.push('');
        lines.push(chalk.bold('Not matched / unsupported:'));
        for (const id of unknownIds) {
            lines.push(chalk.yellow(`  ⚠  ${id} — not found in overlay catalog, skipped`));
        }
    }

    return lines.join('\n');
}

// ─── Manifest backup ──────────────────────────────────────────────────────────

function backupManifest(manifestPath: string, log: (msg: string) => void = console.log): void {
    if (!fs.existsSync(manifestPath)) return;
    const backupPath = manifestPath + '.bak';
    fs.copyFileSync(manifestPath, backupPath);
    log(chalk.dim(`  📦 Backed up existing manifest to ${path.basename(backupPath)}`));
}

// ─── Dynamic import helper ────────────────────────────────────────────────────

// Dynamic import to avoid circular dependency at module load time.
async function importProjectConfig() {
    return import('../schema/project-config.js');
}

// ─── Write manifest helper ────────────────────────────────────────────────────

function writeManifestYaml(
    answers: QuestionnaireAnswers,
    outputPath: string
): { filePath: string } {
    const selection = buildProjectConfigSelectionFromAnswers(answers);

    const filePath = path.join(outputPath, 'superposition.yml');
    writeProjectConfig(filePath, selection);
    return { filePath };
}

// ─── Main command ─────────────────────────────────────────────────────────────

export async function generateCommand(
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    options: GenerateOptions
): Promise<void> {
    const outputPath = options.output ?? '.';

    // In JSON mode, route all human-readable output to stderr so stdout stays
    // machine-parseable. console.error already goes to stderr unconditionally.
    const humanLog = options.json
        ? (msg: string) => process.stderr.write(msg + '\n')
        : (msg: string) => console.log(msg);

    humanLog(
        '\n' +
            boxen(chalk.bold('🤖 AI-Powered Environment Generator'), {
                padding: 0.5,
                borderColor: 'magenta',
                borderStyle: 'round',
            })
    );

    // ── Step 1: Determine mode ───────────────────────────────────────────────

    const projectRoot = path.resolve(outputPath);
    const hasExistingManifest =
        !options.fromScratch &&
        (fs.existsSync(path.join(projectRoot, 'superposition.yml')) ||
            fs.existsSync(path.join(projectRoot, '.superposition.yml')));

    const mode: 'from-scratch' | 'modify' = hasExistingManifest ? 'modify' : 'from-scratch';

    if (mode === 'modify') {
        humanLog(chalk.dim(`\n📝 Modify mode — existing superposition.yml detected.\n`));
    } else {
        humanLog(chalk.dim(`\n✨ From-scratch mode — generating a new manifest.\n`));
    }

    // ── Step 2: Build overlay catalog context ────────────────────────────────

    const catalogContext = buildOverlayContextString(overlaysConfig);

    // ── Step 3: Repo signals (--adopt mode) ──────────────────────────────────

    let adoptSignals: string[] = [];
    if (options.adopt) {
        humanLog(chalk.dim('🔍 Scanning repository for language/framework signals...'));
        adoptSignals = scanRepoSignals(projectRoot);
        if (adoptSignals.length > 0) {
            humanLog(chalk.dim(`  Detected: ${adoptSignals.join(', ')}`));
        }
    }

    // ── Step 4: Call LLM ──────────────────────────────────────────────────────

    let intent: EnvironmentIntent | undefined;
    let diff: ManifestDiff | undefined;
    let answers: QuestionnaireAnswers;
    let unknownIds: string[] = [];
    let rationale: SelectionRationale[] = [];
    let modifyWarnings: string[] = [];

    const spinner = options.json ? null : ora('Asking AI to interpret your prompt...').start();

    try {
        if (mode === 'from-scratch') {
            // Enrich prompt with adopt signals if present.
            const enrichedPrompt =
                adoptSignals.length > 0
                    ? `${options.prompt}\n\nDetected project signals (already present in repository): ${adoptSignals.join(', ')}`
                    : options.prompt;

            intent = await extractIntent(enrichedPrompt, catalogContext);
            const result = mapIntentToAnswers(intent, overlaysConfig, outputPath);
            answers = result.answers;
            unknownIds = result.unknownIds;
            rationale = result.rationale;

            // Repo signals get their own rationale entries, but only for overlays
            // that were actually selected in the mapped answers.
            if (adoptSignals.length > 0) {
                const selectedIds = new Set(collectCurrentOverlayIds(answers));
                for (const sig of adoptSignals) {
                    if (selectedIds.has(sig)) {
                        rationale.push({
                            overlayId: sig,
                            source: 'repo-signal',
                            reason: `Inferred from repository file signals (package.json, go.mod, etc.)`,
                        });
                    }
                }
            }
        } else {
            // Modify mode — read existing manifest.
            const existing = await readExistingManifestAsync(projectRoot, overlaysConfig);
            if (!existing) {
                // readExistingManifestAsync already printed an actionable error.
                process.exitCode = 1;
                return;
            }

            const enrichedPrompt =
                adoptSignals.length > 0
                    ? `${options.prompt}\n\nAdditional project signals from repository scan: ${adoptSignals.join(', ')}`
                    : options.prompt;

            diff = await extractDiff(enrichedPrompt, catalogContext, existing.yamlContent);
            const result = applyDiffToAnswers(existing.answers, diff, overlaysConfig);
            answers = result.answers;
            unknownIds = result.unknownIds;
            rationale = result.rationale;
            modifyWarnings = result.warnings;
        }
    } catch (err) {
        if (spinner) spinner.fail('AI request failed');
        if (err instanceof MissingApiKeyError) {
            console.error(chalk.red(`\n✗ ${err.message}\n`));
            process.exitCode = 1;
            return;
        }
        if (err instanceof AgentError) {
            console.error(chalk.red(`\n✗ AI error: ${err.message}\n`));
            process.exitCode = 1;
            return;
        }
        throw err;
    }

    if (spinner) spinner.succeed('AI interpretation complete');

    // Apply --port-offset to answers so the manifest and scaffold both use it.
    if (options.portOffset !== undefined) {
        answers.portOffset = options.portOffset;
    }

    // ── Step 5: Explainer output ──────────────────────────────────────────────

    humanLog('\n' + formatExplainerOutput(mode, intent, diff, unknownIds, overlaysConfig));

    // Surface destructive-change warnings before the confirmation prompt.
    if (modifyWarnings.length > 0) {
        humanLog('');
        for (const w of modifyWarnings) {
            humanLog(chalk.yellow(`  ⚠  ${w}`));
        }
    }

    // ── Step 6: Confirmation (interactive) ───────────────────────────────────

    if (!options.noInteractive && !options.json) {
        let confirmed: boolean;
        try {
            confirmed = await confirm({
                message: `Write${options.scaffold ? ' and scaffold' : ''} with these settings?`,
                default: modifyWarnings.length === 0, // default to No when there are warnings
            });
        } catch {
            confirmed = false;
        }

        if (!confirmed) {
            humanLog(chalk.dim('\nAborted. No files written.\n'));
            return;
        }
    }

    // ── Step 7: Backup existing manifest ─────────────────────────────────────

    if (mode === 'modify') {
        const existing = await readExistingManifestAsync(projectRoot, overlaysConfig);
        if (existing) {
            backupManifest(existing.filePath, humanLog);
        }
    }

    // ── Step 8: Write manifest ────────────────────────────────────────────────

    let manifestPath: string;
    try {
        if (!fs.existsSync(path.resolve(outputPath))) {
            fs.mkdirSync(path.resolve(outputPath), { recursive: true });
        }
        const written = writeManifestYaml(answers, outputPath);
        manifestPath = written.filePath;
        humanLog(chalk.green(`\n✓ Manifest written: ${manifestPath}`));
    } catch (err) {
        console.error(
            chalk.red(
                `\n✗ Failed to write manifest: ${err instanceof Error ? err.message : String(err)}`
            )
        );
        process.exitCode = 1;
        return;
    }

    // ── Step 9: Scaffold (--scaffold) ─────────────────────────────────────────

    if (options.scaffold) {
        humanLog(chalk.dim('\n🏗  Scaffolding .devcontainer/...\n'));
        try {
            // Write devcontainer files into a dedicated .devcontainer directory,
            // not the project root (which is what answers.outputPath points to).
            const devcontainerOutputPath = path.join(path.dirname(manifestPath), '.devcontainer');
            const scaffoldAnswers: CompositionInput = {
                ...(answers as CompositionInput),
                outputPath: devcontainerOutputPath,
            };
            await composeDevContainer(scaffoldAnswers, overlaysDir);
            humanLog(chalk.green('✓ .devcontainer/ scaffold complete.'));
        } catch (err) {
            console.error(
                chalk.red(
                    `✗ Scaffolding failed: ${err instanceof Error ? err.message : String(err)}`
                )
            );
            process.exitCode = 1;
            return;
        }
    }

    // ── JSON output ───────────────────────────────────────────────────────────

    if (options.json) {
        const result: GenerateResult = {
            mode,
            intent,
            diff,
            answers,
            unknownIds,
            rationale,
            manifestPath,
            scaffolded: !!options.scaffold,
        };
        console.log(JSON.stringify(result, null, 2));
    }
}

// ─── Async manifest reader (handles the dynamic import) ──────────────────────

async function readExistingManifestAsync(
    projectRoot: string,
    overlaysConfig: OverlaysConfig
): Promise<{ answers: QuestionnaireAnswers; yamlContent: string; filePath: string } | null> {
    const { buildAnswersFromProjectConfig, loadProjectConfig } = await importProjectConfig();

    try {
        const loaded = loadProjectConfig(overlaysConfig, projectRoot);
        if (!loaded) {
            console.error(chalk.red('✗ Could not load existing manifest: no project file found.'));
            return null;
        }

        const filePath = loaded.file.path;
        const yamlContent = fs.readFileSync(filePath, 'utf8');

        const partial = buildAnswersFromProjectConfig(loaded.selection, overlaysConfig);

        const answers: QuestionnaireAnswers = {
            stack: loaded.selection.stack ?? 'compose',
            baseImage: (loaded.selection.baseImage as BaseImage) ?? 'bookworm',
            containerName: loaded.selection.containerName,
            language: [],
            database: [],
            devTools: [],
            cloudTools: [],
            observability: [],
            playwright: false,
            needsDocker: false,
            outputPath: loaded.selection.outputPath ?? '.',
            ...partial,
        };

        return { answers, yamlContent, filePath };
    } catch (err) {
        // Surface the error message so users know how to fix their project file
        // (e.g. when both superposition.yml and .superposition.yml exist).
        const msg = err instanceof Error ? err.message : String(err);
        console.error(chalk.red(`✗ Could not load existing manifest: ${msg}`));
        return null;
    }
}
