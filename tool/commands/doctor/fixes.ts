import * as fs from 'fs';
import * as path from 'path';
import { execSync } from 'child_process';
import type {
    BaseImage,
    CloudTool,
    DevTool,
    DiagnosticFinding,
    FixExecution,
    FixOutcomeSummary,
    FixRun,
    LanguageOverlay,
    ObservabilityTool,
    OverlayId,
    OverlaysConfig,
    QuestionnaireAnswers,
    RemediationAction,
    SuperpositionManifest,
} from '../../schema/types.js';
import { appendGitignoreSection } from '../../utils/gitignore.js';
import { migrateManifest, needsMigration } from '../../schema/manifest-migrations.js';
import { composeDevContainer } from '../../questionnaire/composer.js';
import { mergeAnswers } from '../../questionnaire/answers.js';
import { applyPresetSelections } from '../../questionnaire/presets.js';
import { PRESETS_DIR } from '../../questionnaire/questionnaire.js';
import {
    buildAnswersFromProjectConfig,
    getOverlayIdsFromProjectSelection,
    loadProjectConfig,
    writeProjectConfig,
} from '../../schema/project-config.js';
import {
    findUnresolvedTokens,
    collectOverlayParameters,
    resolveParameters,
} from '../../utils/parameters.js';
import {
    checkDependencies,
    checkEnvironment,
    checkEnvExampleDrift,
    checkGitTrackingSafety,
    checkManifest,
    checkMergeStrategy,
    checkOverlays,
    checkParameters,
    checkPortCrossValidation,
    checkPorts,
    checkProjectFileDrift,
    checkReproducibility,
    detectVersionManager,
} from './checks.js';
import {
    checksToFindings,
    determineExitDisposition,
    orderFindingsForRemediation,
    reportToFindings,
} from './findings.js';
import type { DoctorReport, RemediationPlan } from './types.js';
import { resolveDoctorOverlayIds } from './scope.js';

export const REMEDIATION_REGISTRY = new Map<string, RemediationAction>([
    [
        'manifest-migration',
        {
            key: 'manifest-migration',
            findingId: 'manifest-version',
            safetyClass: 'safe-unattended',
            executionKind: 'manifest-migration',
            preconditions: ['superposition.json must exist and be parseable'],
            plannedChanges: [
                'Migrate superposition.json to current schema version',
                'Create timestamped backup of the original manifest',
            ],
            manualFallback: [
                'Run "container-superposition regen" to regenerate with the current schema',
            ],
        },
    ],
    [
        'devcontainer-regeneration',
        {
            key: 'devcontainer-regeneration',
            findingId: 'devcontainer-config',
            safetyClass: 'safe-unattended',
            executionKind: 'regeneration',
            preconditions: ['Valid superposition.json manifest must be present'],
            plannedChanges: ['Regenerate devcontainer.json from superposition.json'],
            manualFallback: ['Run "container-superposition regen --output <path>" to regenerate'],
        },
    ],
    [
        'node-version-fix',
        {
            key: 'node-version-fix',
            findingId: 'nodejs-version',
            safetyClass: 'safe-unattended',
            executionKind: 'shell-command',
            preconditions: ['nvm, fnm, or volta must be installed'],
            plannedChanges: ['Use version manager to install and activate Node.js >= 20'],
            manualFallback: [
                'Install Node.js >= 20 from https://nodejs.org/',
                'Or with nvm:   nvm install 20 && nvm use 20',
                'Or with fnm:   fnm install 20 && fnm use 20',
                'Or with volta: volta install node@20',
            ],
        },
    ],
    [
        'docker-repair',
        {
            key: 'docker-repair',
            findingId: 'docker-daemon',
            safetyClass: 'requires-manual-action',
            executionKind: 'no-op',
            preconditions: [],
            plannedChanges: [],
            manualFallback: [
                'Linux:   sudo systemctl start docker',
                'macOS:   open -a Docker',
                'Windows: Start Docker Desktop from the Start menu',
            ],
        },
    ],
    [
        'parameters-regen',
        {
            key: 'parameters-regen',
            findingId: 'missing-required-parameters',
            safetyClass: 'safe-unattended',
            executionKind: 'regeneration',
            preconditions: [
                'Project file (.superposition.yml) must exist',
                'All required parameters must have overlay defaults to fall back to',
            ],
            plannedChanges: [
                'Add missing parameters with overlay defaults to project file',
                'Regenerate devcontainer configuration from updated project file',
            ],
            manualFallback: [
                'Add the missing parameters to the parameters: section in your project file',
                'Run "cs regen" to regenerate with the updated configuration',
            ],
        },
    ],
    [
        'dependency-fix',
        {
            key: 'dependency-fix',
            findingId: 'missing-required-overlay',
            safetyClass: 'safe-unattended',
            executionKind: 'regeneration',
            preconditions: ['Project file (.superposition.yml) must exist'],
            plannedChanges: [
                'Add missing required overlay(s) to project file',
                'Regenerate devcontainer configuration from updated project file',
            ],
            manualFallback: [
                'Add the missing required overlays to the overlays: list in your project file',
                'Run "cs regen" to regenerate',
            ],
        },
    ],
    [
        'env-example-regen',
        {
            key: 'env-example-regen',
            findingId: 'env-example-drift',
            safetyClass: 'safe-unattended',
            executionKind: 'regeneration',
            preconditions: ['Project file (.superposition.yml) must exist'],
            plannedChanges: ['Regenerate .env.example from current overlay selection'],
            manualFallback: [
                'Run "cs regen" to regenerate .env.example from the current overlay selection',
            ],
        },
    ],
    [
        'reproducibility-regen',
        {
            key: 'reproducibility-regen',
            findingId: 'reproducibility',
            safetyClass: 'safe-unattended',
            executionKind: 'regeneration',
            preconditions: ['Project file (.superposition.yml) must exist'],
            plannedChanges: ['Regenerate devcontainer configuration from current project file'],
            manualFallback: ['Run "cs regen" to regenerate the devcontainer configuration'],
        },
    ],
    [
        'local-config-gitignore',
        {
            key: 'local-config-gitignore',
            findingId: 'local-config-gitignore-missing',
            safetyClass: 'safe-unattended',
            executionKind: 'shell-command',
            preconditions: ['superposition.local.yml must exist'],
            plannedChanges: ['Append superposition.local.yml to root .gitignore'],
            manualFallback: [
                'Add "superposition.local.yml" to root .gitignore so local-only config stays untracked',
            ],
        },
    ],
    [
        'tracked-generated-output-manual',
        {
            key: 'tracked-generated-output-manual',
            findingId: 'tracked-generated-output',
            safetyClass: 'requires-manual-action',
            executionKind: 'no-op',
            preconditions: [],
            plannedChanges: [],
            manualFallback: ['Run git rm -r --cached -- <outputPath> to untrack generated output'],
        },
    ],
    [
        'tracked-local-config-manual',
        {
            key: 'tracked-local-config-manual',
            findingId: 'tracked-local-config',
            safetyClass: 'requires-manual-action',
            executionKind: 'no-op',
            preconditions: [],
            plannedChanges: [],
            manualFallback: [
                'Run git rm --cached -- superposition.local.yml to untrack local-only config',
            ],
        },
    ],
]);

function atomicWriteJson(filePath: string, data: object): void {
    const tmpPath = `${filePath}.tmp`;
    fs.writeFileSync(tmpPath, `${JSON.stringify(data, null, 2)}\n`, 'utf8');
    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }
    fs.renameSync(tmpPath, filePath);
}

function backupFile(filePath: string): string {
    const timestamp = new Date()
        .toISOString()
        .replace(/[:.]/g, '-')
        .replace('T', '-')
        .replace('Z', '');
    const backupPath = `${filePath}.backup-${timestamp}`;
    fs.copyFileSync(filePath, backupPath);
    return backupPath;
}

function buildAnswersFromManifest(
    manifest: SuperpositionManifest,
    manifestDir: string,
    overlaysConfig: OverlaysConfig
): QuestionnaireAnswers {
    const knownBaseImageIds = ['bookworm', 'trixie', 'alpine', 'ubuntu', 'custom'];
    const isKnownBaseImage = knownBaseImageIds.includes(manifest.baseImage);
    const language: LanguageOverlay[] = [];
    const database: string[] = [];
    const observability: ObservabilityTool[] = [];
    const cloudTools: CloudTool[] = [];
    const devTools: DevTool[] = [];
    const overlayMap = new Map(overlaysConfig.overlays.map((overlay) => [overlay.id, overlay]));

    for (const id of manifest.overlays) {
        const overlay = overlayMap.get(id);
        if (!overlay) continue;
        switch (overlay.category) {
            case 'language':
                language.push(id as LanguageOverlay);
                break;
            case 'database':
            case 'messaging':
                database.push(id);
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

    return {
        stack: manifest.baseTemplate,
        baseImage: isKnownBaseImage ? (manifest.baseImage as BaseImage) : 'custom',
        customImage: isKnownBaseImage ? undefined : manifest.baseImage,
        containerName: manifest.containerName,
        preset: manifest.preset,
        presetChoices: manifest.presetChoices,
        language,
        database: database as any,
        observability,
        cloudTools,
        devTools,
        needsDocker: manifest.baseTemplate === 'compose',
        playwright: devTools.includes('playwright' as DevTool),
        outputPath: manifestDir,
        portOffset: manifest.portOffset,
    };
}

function buildRegenAnswers(
    outputPath: string,
    overlaysConfig: OverlaysConfig,
    selection: Parameters<typeof buildAnswersFromProjectConfig>[0]
) {
    const baseAnswers = buildAnswersFromProjectConfig(selection, overlaysConfig);
    return applyPresetSelections(baseAnswers, overlaysConfig, PRESETS_DIR).then((withPreset) =>
        mergeAnswers(withPreset, { outputPath })
    );
}

function normalizeLogs<T>(silent: boolean, run: () => Promise<T>): Promise<T> {
    const originalLog = console.log;
    if (silent) {
        console.log = () => {};
    }
    return run().finally(() => {
        if (silent) {
            console.log = originalLog;
        }
    });
}

function executeManifestMigration(outputPath: string, explicitManifestPath?: string): FixExecution {
    const manifestPath = explicitManifestPath ?? path.join(outputPath, 'superposition.json');
    if (!fs.existsSync(manifestPath)) {
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'superposition.json not found — cannot migrate',
            rechecked: false,
        };
    }

    let manifest: any;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
    } catch (error) {
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: `Cannot parse superposition.json: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }

    if (!needsMigration(manifest)) {
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: false,
            outcome: 'already-compliant',
            reason: 'Manifest is already at the current schema version',
            rechecked: true,
        };
    }

    let backupPath: string;
    try {
        backupPath = backupFile(manifestPath);
    } catch (error) {
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: `Failed to create backup: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }

    try {
        const migrated = migrateManifest(manifest);
        atomicWriteJson(manifestPath, migrated);
    } catch (error) {
        try {
            fs.copyFileSync(backupPath, manifestPath);
        } catch {
            // ignore
        }
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Migration failed: ${error instanceof Error ? error.message : String(error)}`,
            backupPath,
            rechecked: false,
        };
    }

    try {
        const updated = JSON.parse(fs.readFileSync(manifestPath, 'utf8'));
        const stillNeedsMigration = needsMigration(updated);
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: true,
            outcome: stillNeedsMigration ? 'requires-manual-action' : 'fixed',
            reason: stillNeedsMigration
                ? 'Migration wrote file but schema still reports outdated'
                : 'Manifest migrated to current schema version',
            changedFiles: [manifestPath],
            backupPath,
            rechecked: true,
        };
    } catch {
        return {
            findingId: 'manifest-version',
            remediationKey: 'manifest-migration',
            attempted: true,
            outcome: 'fixed',
            reason: 'Manifest migrated (re-check skipped — parse error after write)',
            changedFiles: [manifestPath],
            backupPath,
            rechecked: false,
        };
    }
}

async function executeRegeneration(
    outputPath: string,
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    silent = false,
    explicitManifestPath?: string
): Promise<FixExecution> {
    const manifestPath = explicitManifestPath ?? path.join(outputPath, 'superposition.json');
    if (!fs.existsSync(manifestPath)) {
        return {
            findingId: 'devcontainer-config',
            remediationKey: 'devcontainer-regeneration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'No superposition.json found — run "container-superposition init" first',
            rechecked: false,
        };
    }

    let manifest: SuperpositionManifest;
    try {
        manifest = JSON.parse(fs.readFileSync(manifestPath, 'utf8')) as SuperpositionManifest;
    } catch (error) {
        return {
            findingId: 'devcontainer-config',
            remediationKey: 'devcontainer-regeneration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: `Cannot parse superposition.json: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }

    if (!manifest.baseTemplate) {
        return {
            findingId: 'devcontainer-config',
            remediationKey: 'devcontainer-regeneration',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'Manifest is missing required baseTemplate field — cannot regenerate',
            rechecked: false,
        };
    }

    const answers = mergeAnswers(buildAnswersFromManifest(manifest, outputPath, overlaysConfig));
    try {
        await normalizeLogs(silent, () =>
            composeDevContainer(answers, overlaysDir, { isRegen: true })
        );
    } catch (error) {
        return {
            findingId: 'devcontainer-config',
            remediationKey: 'devcontainer-regeneration',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Regeneration failed: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }

    const devcontainerPath = path.join(outputPath, 'devcontainer.json');
    const exists = fs.existsSync(devcontainerPath);
    let validJson = false;
    if (exists) {
        try {
            JSON.parse(fs.readFileSync(devcontainerPath, 'utf8'));
            validJson = true;
        } catch {
            // ignore
        }
    }

    return {
        findingId: 'devcontainer-config',
        remediationKey: 'devcontainer-regeneration',
        attempted: true,
        outcome: exists && validJson ? 'fixed' : 'requires-manual-action',
        reason:
            exists && validJson
                ? 'devcontainer.json regenerated from superposition.json'
                : 'Regeneration ran but devcontainer.json is still missing or invalid',
        changedFiles: exists ? [devcontainerPath] : [],
        rechecked: true,
    };
}

function executeNodeVersionFix(): FixExecution {
    const manager = detectVersionManager();
    if (!manager) {
        return {
            findingId: 'nodejs-version',
            remediationKey: 'node-version-fix',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'No version manager (nvm, fnm, or volta) found',
            rechecked: false,
        };
    }

    let fixCommand = '';
    switch (manager) {
        case 'nvm':
            fixCommand = `source "${path.join(process.env.HOME ?? process.env.USERPROFILE ?? '', '.nvm', 'nvm.sh')}" && nvm install 20 && nvm use 20`;
            break;
        case 'fnm':
            fixCommand = 'fnm install 20 && fnm use 20';
            break;
        case 'volta':
            fixCommand = 'volta install node@20';
            break;
    }

    if (manager === 'nvm' || manager === 'fnm') {
        const runCommand =
            manager === 'nvm' ? `bash -lc '${fixCommand}'` : `sh -lc '${fixCommand}'`;
        try {
            execSync(runCommand, { stdio: 'pipe', timeout: 60_000 });
        } catch (error) {
            return {
                findingId: 'nodejs-version',
                remediationKey: 'node-version-fix',
                attempted: true,
                outcome: 'requires-manual-action',
                reason: `Fix command failed: ${error instanceof Error ? error.message : String(error)}`,
                commands: [fixCommand],
                rechecked: false,
            };
        }
        return {
            findingId: 'nodejs-version',
            remediationKey: 'node-version-fix',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Node.js 20 installed via ${manager}. Open a new shell (or run \`${fixCommand}\`) to activate it — the current process cannot pick up the PATH change.`,
            commands: [fixCommand],
            rechecked: false,
        };
    }

    try {
        execSync(`sh -lc '${fixCommand}'`, { stdio: 'pipe', timeout: 60_000 });
        const version = execSync('sh -lc "node --version"', {
            encoding: 'utf8',
            stdio: ['pipe', 'pipe', 'pipe'],
            timeout: 10_000,
        });
        const match = version.trim().match(/^v(\d+)/);
        const major = match ? parseInt(match[1], 10) : 0;
        if (major >= 20) {
            return {
                findingId: 'nodejs-version',
                remediationKey: 'node-version-fix',
                attempted: true,
                outcome: 'fixed',
                reason: `Node.js ${version.trim()} activated via volta`,
                commands: [fixCommand],
                rechecked: true,
            };
        }
    } catch (error) {
        return {
            findingId: 'nodejs-version',
            remediationKey: 'node-version-fix',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Fix command failed: ${error instanceof Error ? error.message : String(error)}`,
            commands: [fixCommand],
            rechecked: false,
        };
    }

    return {
        findingId: 'nodejs-version',
        remediationKey: 'node-version-fix',
        attempted: true,
        outcome: 'requires-manual-action',
        reason: `volta ran but node --version still reports < 20. Open a new shell and run: ${fixCommand}`,
        commands: [fixCommand],
        rechecked: true,
    };
}

async function executeParametersRegen(
    outputPath: string,
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    workingDir: string,
    silent = false
): Promise<FixExecution> {
    let projectConfig;
    try {
        projectConfig = loadProjectConfig(overlaysConfig, workingDir);
    } catch (error) {
        return {
            findingId: 'missing-required-parameters',
            remediationKey: 'parameters-regen',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: `Failed to load project file: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }
    if (!projectConfig) {
        return {
            findingId: 'missing-required-parameters',
            remediationKey: 'parameters-regen',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'No project file (.superposition.yml) found — run "cs init" first',
            rechecked: false,
        };
    }

    const selectedOverlays = getOverlayIdsFromProjectSelection(
        projectConfig.selection,
        overlaysConfig
    );
    const declared = collectOverlayParameters(selectedOverlays, overlaysConfig.overlays);
    const supplied = { ...(projectConfig.selection.parameters ?? {}) };
    const { missingRequired } = resolveParameters(declared, supplied);
    const needsManual: string[] = [];

    for (const key of missingRequired) {
        const definition = declared[key];
        if (definition?.default !== undefined) {
            supplied[key] = definition.default;
        } else {
            needsManual.push(key);
        }
    }

    if (needsManual.length > 0) {
        return {
            findingId: 'missing-required-parameters',
            remediationKey: 'parameters-regen',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: `Cannot auto-fix: ${needsManual.join(', ')} have no default value — add them manually to parameters: in your project file`,
            rechecked: false,
        };
    }

    const updatedSelection = { ...projectConfig.selection, parameters: supplied };
    try {
        writeProjectConfig(projectConfig.file.path, updatedSelection);
    } catch (error) {
        return {
            findingId: 'missing-required-parameters',
            remediationKey: 'parameters-regen',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Failed to write project file: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }

    try {
        const reloadedConfig = loadProjectConfig(overlaysConfig, workingDir);
        if (!reloadedConfig) {
            throw new Error('Project file not found after write');
        }
        const answers = await buildRegenAnswers(
            outputPath,
            overlaysConfig,
            reloadedConfig.selection
        );
        await normalizeLogs(silent, () =>
            composeDevContainer(answers, overlaysDir, { isRegen: true })
        );
    } catch (error) {
        return {
            findingId: 'missing-required-parameters',
            remediationKey: 'parameters-regen',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Regeneration failed: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }

    const stillUnresolved: string[] = [];
    for (const filePath of [
        path.join(outputPath, 'devcontainer.json'),
        path.join(outputPath, 'docker-compose.yml'),
        path.join(outputPath, '.env.example'),
    ]) {
        if (!fs.existsSync(filePath)) continue;
        stillUnresolved.push(...findUnresolvedTokens(fs.readFileSync(filePath, 'utf8')));
    }

    const addedKeys = Object.keys(supplied).filter(
        (key) => !(projectConfig.selection.parameters ?? {})[key]
    );

    return {
        findingId: 'missing-required-parameters',
        remediationKey: 'parameters-regen',
        attempted: true,
        outcome: stillUnresolved.length === 0 ? 'fixed' : 'requires-manual-action',
        reason:
            stillUnresolved.length === 0
                ? addedKeys.length > 0
                    ? `Added defaults for ${addedKeys.join(', ')} and regenerated devcontainer`
                    : 'Regenerated devcontainer from project file'
                : `Regeneration ran but unresolved tokens remain: ${[...new Set(stillUnresolved)].join(', ')}`,
        changedFiles: [projectConfig.file.path],
        rechecked: true,
    };
}

async function executeDependencyFix(
    outputPath: string,
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    workingDir: string,
    silent = false
): Promise<FixExecution> {
    let projectConfig;
    try {
        projectConfig = loadProjectConfig(overlaysConfig, workingDir);
    } catch (error) {
        return {
            findingId: 'missing-required-overlay',
            remediationKey: 'dependency-fix',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: `Failed to load project file: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }
    if (!projectConfig) {
        return {
            findingId: 'missing-required-overlay',
            remediationKey: 'dependency-fix',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'No project file (.superposition.yml) found',
            rechecked: false,
        };
    }

    const selectedOverlays = getOverlayIdsFromProjectSelection(
        projectConfig.selection,
        overlaysConfig
    );
    const overlayMap = new Map(overlaysConfig.overlays.map((overlay) => [overlay.id, overlay]));
    const toAdd: string[] = [];
    const toProcess = [...selectedOverlays];
    const processed = new Set<string>();
    const current = new Set<string>(selectedOverlays);

    while (toProcess.length > 0) {
        const id = toProcess.shift()!;
        if (processed.has(id)) continue;
        processed.add(id);
        const definition = overlayMap.get(id);
        if (!definition?.requires) continue;
        for (const requiredId of definition.requires as string[]) {
            if (!current.has(requiredId)) {
                current.add(requiredId);
                toAdd.push(requiredId);
                toProcess.push(requiredId as OverlayId);
            }
        }
    }

    if (toAdd.length === 0) {
        return {
            findingId: 'missing-required-overlay',
            remediationKey: 'dependency-fix',
            attempted: false,
            outcome: 'already-compliant',
            reason: 'All required overlays are already present',
            rechecked: false,
        };
    }

    const updatedSelection = {
        ...projectConfig.selection,
        overlays: [...selectedOverlays, ...toAdd] as OverlayId[],
    };
    try {
        writeProjectConfig(projectConfig.file.path, updatedSelection);
        const reloadedConfig = loadProjectConfig(overlaysConfig, workingDir);
        if (!reloadedConfig) throw new Error('Project file not found after write');
        const answers = await buildRegenAnswers(
            outputPath,
            overlaysConfig,
            reloadedConfig.selection
        );
        await normalizeLogs(silent, () =>
            composeDevContainer(answers, overlaysDir, { isRegen: true })
        );
    } catch (error) {
        return {
            findingId: 'missing-required-overlay',
            remediationKey: 'dependency-fix',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Regeneration failed: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }

    return {
        findingId: 'missing-required-overlay',
        remediationKey: 'dependency-fix',
        attempted: true,
        outcome: 'fixed',
        reason: `Added missing required overlay(s): ${toAdd.join(', ')} and regenerated devcontainer`,
        changedFiles: [projectConfig.file.path],
        rechecked: true,
    };
}

async function executeEnvExampleRegen(
    outputPath: string,
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    workingDir: string,
    silent = false
): Promise<FixExecution> {
    let projectConfig;
    try {
        projectConfig = loadProjectConfig(overlaysConfig, workingDir);
    } catch (error) {
        return {
            findingId: 'env-example-drift',
            remediationKey: 'env-example-regen',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: `Failed to load project file: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }
    if (!projectConfig) {
        return {
            findingId: 'env-example-drift',
            remediationKey: 'env-example-regen',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'No project file (.superposition.yml) found',
            rechecked: false,
        };
    }

    try {
        const answers = await buildRegenAnswers(
            outputPath,
            overlaysConfig,
            projectConfig.selection
        );
        await normalizeLogs(silent, () =>
            composeDevContainer(answers, overlaysDir, { isRegen: true })
        );
    } catch (error) {
        return {
            findingId: 'env-example-drift',
            remediationKey: 'env-example-regen',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Regeneration failed: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }

    return {
        findingId: 'env-example-drift',
        remediationKey: 'env-example-regen',
        attempted: true,
        outcome: 'fixed',
        reason: 'Regenerated .env.example from current overlay selection',
        changedFiles: [path.join(outputPath, '.env.example')],
        rechecked: true,
    };
}

async function executeReproducibilityRegen(
    outputPath: string,
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    workingDir: string,
    silent = false
): Promise<FixExecution> {
    let projectConfig;
    try {
        projectConfig = loadProjectConfig(overlaysConfig, workingDir);
    } catch (error) {
        return {
            findingId: 'reproducibility',
            remediationKey: 'reproducibility-regen',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: `Failed to load project file: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }
    if (!projectConfig) {
        return {
            findingId: 'reproducibility',
            remediationKey: 'reproducibility-regen',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: 'No project file (.superposition.yml) found',
            rechecked: false,
        };
    }

    try {
        const answers = await buildRegenAnswers(
            outputPath,
            overlaysConfig,
            projectConfig.selection
        );
        await normalizeLogs(silent, () =>
            composeDevContainer(answers, overlaysDir, { isRegen: true })
        );
    } catch (error) {
        return {
            findingId: 'reproducibility',
            remediationKey: 'reproducibility-regen',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Regeneration failed: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }

    return {
        findingId: 'reproducibility',
        remediationKey: 'reproducibility-regen',
        attempted: true,
        outcome: 'fixed',
        reason: 'Regenerated devcontainer configuration from current project file',
        rechecked: true,
    };
}

function executeLocalConfigGitignoreFix(workingDir: string): FixExecution {
    const localConfigPath = path.join(workingDir, 'superposition.local.yml');
    if (!fs.existsSync(localConfigPath)) {
        return {
            findingId: 'local-config-gitignore-missing',
            remediationKey: 'local-config-gitignore',
            attempted: false,
            outcome: 'skipped',
            reason: 'Skipped because superposition.local.yml does not exist',
            rechecked: false,
        };
    }

    const gitignorePath = path.join(workingDir, '.gitignore');
    try {
        const written = appendGitignoreSection(
            gitignorePath,
            'container-superposition local config',
            ['superposition.local.yml']
        );
        return {
            findingId: 'local-config-gitignore-missing',
            remediationKey: 'local-config-gitignore',
            attempted: true,
            outcome: written ? 'fixed' : 'already-compliant',
            reason: written
                ? 'Appended superposition.local.yml to root .gitignore'
                : 'Root .gitignore already ignores superposition.local.yml',
            changedFiles: written ? ['.gitignore'] : [],
            rechecked: true,
        };
    } catch (error) {
        return {
            findingId: 'local-config-gitignore-missing',
            remediationKey: 'local-config-gitignore',
            attempted: true,
            outcome: 'requires-manual-action',
            reason: `Failed to update root .gitignore: ${error instanceof Error ? error.message : String(error)}`,
            rechecked: false,
        };
    }
}

async function executeSingleFix(
    finding: DiagnosticFinding,
    outputPath: string,
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    silent = false,
    explicitManifestPath?: string,
    workingDir: string = process.cwd()
): Promise<FixExecution> {
    switch (finding.remediationKey) {
        case 'manifest-migration':
            return executeManifestMigration(outputPath, explicitManifestPath);
        case 'devcontainer-regeneration':
            return executeRegeneration(
                outputPath,
                overlaysConfig,
                overlaysDir,
                silent,
                explicitManifestPath
            );
        case 'parameters-regen':
            return executeParametersRegen(
                outputPath,
                overlaysConfig,
                overlaysDir,
                workingDir,
                silent
            );
        case 'dependency-fix':
            return executeDependencyFix(
                outputPath,
                overlaysConfig,
                overlaysDir,
                workingDir,
                silent
            );
        case 'env-example-regen':
            return executeEnvExampleRegen(
                outputPath,
                overlaysConfig,
                overlaysDir,
                workingDir,
                silent
            );
        case 'reproducibility-regen':
            return executeReproducibilityRegen(
                outputPath,
                overlaysConfig,
                overlaysDir,
                workingDir,
                silent
            );
        case 'node-version-fix':
            return executeNodeVersionFix();
        case 'local-config-gitignore':
            return executeLocalConfigGitignoreFix(workingDir);
        case 'docker-repair':
            return {
                findingId: finding.id,
                remediationKey: 'docker-repair',
                attempted: false,
                outcome: 'requires-manual-action',
                reason: 'Docker daemon repair requires manual intervention',
                rechecked: false,
            };
        default:
            return {
                findingId: finding.id,
                remediationKey: finding.remediationKey ?? 'unknown',
                attempted: false,
                outcome: 'requires-manual-action',
                reason: `No remediation handler registered for key "${finding.remediationKey}"`,
                rechecked: false,
            };
    }
}

export function buildOutcomeSummary(executions: FixExecution[]): FixOutcomeSummary {
    const counts = {
        fixed: 0,
        alreadyCompliant: 0,
        skipped: 0,
        requiresManualAction: 0,
    };
    for (const execution of executions) {
        switch (execution.outcome) {
            case 'fixed':
                counts.fixed++;
                break;
            case 'already-compliant':
                counts.alreadyCompliant++;
                break;
            case 'skipped':
                counts.skipped++;
                break;
            case 'requires-manual-action':
                counts.requiresManualAction++;
                break;
        }
    }
    return { ...counts, total: executions.length };
}

export function buildRemediationPlan(findings: DiagnosticFinding[]): RemediationPlan[] {
    return findings
        .filter((finding) => finding.fixEligibility === 'automatic' && finding.status !== 'pass')
        .map((finding) => {
            const action = REMEDIATION_REGISTRY.get(finding.remediationKey ?? '');
            return {
                findingName: finding.name,
                remediationKey: finding.remediationKey ?? '',
                remediationAction: action?.executionKind ?? 'no-op',
                plannedChanges: action?.plannedChanges ?? [],
                prerequisitesOrSkipConditions: action?.preconditions ?? [],
                safetyClass: action?.safetyClass ?? 'safe-unattended',
            };
        });
}

export async function executeFixRun(
    report: DoctorReport,
    outputPath: string,
    overlaysConfig: OverlaysConfig,
    overlaysDir: string,
    requestedJson: boolean,
    explicitManifestPath?: string,
    workingDir: string = process.cwd(),
    allOverlays = false
): Promise<FixRun> {
    const initialFindings = reportToFindings(report);
    const autoFixable = initialFindings.filter(
        (finding) => finding.fixEligibility === 'automatic' && finding.status !== 'pass'
    );
    const manualOnly = initialFindings.filter(
        (finding) => finding.fixEligibility === 'manual-only' && finding.status !== 'pass'
    );
    const orderedAuto = orderFindingsForRemediation(autoFixable);

    const executions: FixExecution[] = [];
    let manifestMigrationFailed = false;
    for (const finding of orderedAuto) {
        const action = REMEDIATION_REGISTRY.get(finding.remediationKey ?? '');
        if (finding.remediationKey === 'devcontainer-regeneration' && manifestMigrationFailed) {
            executions.push({
                findingId: finding.id,
                remediationKey: 'devcontainer-regeneration',
                attempted: false,
                outcome: 'skipped',
                reason: 'Skipped because manifest migration did not succeed',
                rechecked: false,
            });
            continue;
        }

        if (!requestedJson) {
            console.log(`\n  → Planning fix for: ${finding.name}`);
            if (action) {
                for (const change of action.plannedChanges) {
                    console.log(`    · ${change}`);
                }
            }
        }

        const execution = await executeSingleFix(
            finding,
            outputPath,
            overlaysConfig,
            overlaysDir,
            requestedJson,
            explicitManifestPath,
            workingDir
        );
        executions.push(execution);

        if (
            finding.remediationKey === 'manifest-migration' &&
            execution.outcome !== 'fixed' &&
            execution.outcome !== 'already-compliant'
        ) {
            manifestMigrationFailed = true;
        }
    }

    for (const finding of manualOnly) {
        const action = REMEDIATION_REGISTRY.get(finding.remediationKey ?? '');
        executions.push({
            findingId: finding.id,
            remediationKey: finding.remediationKey ?? 'manual',
            attempted: false,
            outcome: 'requires-manual-action',
            reason: action
                ? action.manualFallback.join(' | ')
                : 'No automatic fix available for this issue',
            rechecked: false,
        });
    }

    const envChecks = checkEnvironment(outputPath, explicitManifestPath);
    const manifestChecks = checkManifest(outputPath, explicitManifestPath);
    const mergeChecks = checkMergeStrategy(outputPath);
    const selectedOverlayIds = resolveDoctorOverlayIds(
        overlaysConfig,
        workingDir,
        outputPath,
        explicitManifestPath,
        false
    );
    const overlayChecks = allOverlays
        ? checkOverlays(overlaysDir)
        : checkOverlays(overlaysDir, selectedOverlayIds);
    const finalManifestPath = explicitManifestPath ?? path.join(outputPath, 'superposition.json');
    const portChecks = checkPorts(overlaysConfig, finalManifestPath);
    const finalDriftChecks = checkProjectFileDrift(overlaysConfig, workingDir, finalManifestPath);
    const finalParamChecks = checkParameters(overlaysConfig, outputPath, workingDir);
    const finalDepChecks = checkDependencies(overlaysConfig, workingDir);
    const finalPortCrossChecks = checkPortCrossValidation(outputPath);
    const finalEnvDriftChecks = checkEnvExampleDrift(overlaysConfig, outputPath, workingDir);
    const finalReproChecks = await checkReproducibility(
        overlaysConfig,
        outputPath,
        overlaysDir,
        workingDir
    );
    const finalGitSafetyChecks = checkGitTrackingSafety(
        overlaysConfig,
        outputPath,
        workingDir,
        allOverlays
    );
    const finalFindings = [
        ...checksToFindings(envChecks, 'environment', 'environment'),
        ...checksToFindings(manifestChecks, 'manifest', 'manifest'),
        ...checksToFindings(mergeChecks, 'merge', 'devcontainer'),
        ...checksToFindings(overlayChecks, 'overlay', 'full'),
        ...checksToFindings(portChecks, 'ports', 'environment'),
        ...checksToFindings(finalDriftChecks, 'manifest', 'manifest'),
        ...checksToFindings(finalParamChecks, 'manifest', 'full'),
        ...checksToFindings(finalDepChecks, 'manifest', 'full'),
        ...checksToFindings(finalPortCrossChecks, 'ports', 'full'),
        ...checksToFindings(finalEnvDriftChecks, 'manifest', 'full'),
        ...checksToFindings(finalReproChecks, 'manifest', 'full'),
        ...checksToFindings(finalGitSafetyChecks, 'manifest', 'full'),
    ];

    const summary = buildOutcomeSummary(executions);
    return {
        outputPath,
        requestedJson,
        initialFindings,
        executions,
        finalFindings,
        summary,
        exitDisposition: determineExitDisposition(summary, finalFindings),
    };
}
